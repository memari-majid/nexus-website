/**
 * Dr. MJ's tools. Module scope, never created inside `POST`: the client IP
 * reaches `execute` through `experimental_context` (see `toolContext`).
 *
 * Contract every tool keeps:
 * - Input schemas are plain strings, numbers, and enums: no `.email()`, no
 *   regex, no `format` keywords, so the JSON schema works on every picker
 *   model. Addresses are validated by `EMAIL_RE` inside `execute`.
 * - `toModelOutput` returns compact text (`{ type: "text" as const }`) and
 *   reads `output` with optional chaining: echoed outputs come back from the
 *   client on every request and are untrusted, so a crafted `output: {}`
 *   must yield a generic sentence, never a throw that 400s a conversation.
 * - Every tool that emails or files returns `delivered`; the prompt makes
 *   Dr. MJ honest about a `false`.
 * - Sends need on-screen approval (`needsApproval: true`). The SDK ends the
 *   turn with `approval-requested`; the next request executes approved calls
 *   before the model runs, with that request's context and rate checks. It
 *   takes the input from the echoed transcript and skips `inputSchema`, so
 *   every gated `execute` re-validates its input first (`recheck`).
 * - Gated sends are idempotent per toolCallId. A retry after a dropped
 *   connection re-sends the approved call and the SDK executes it again, so
 *   every gated `execute` first asks the limiter whether it already delivered
 *   under that id (`recallDelivered`) and replays that outcome instead of
 *   sending twice. Only delivered sends are remembered (`rememberDelivered`),
 *   for a day; a failed or not-configured attempt stays retryable. Fails
 *   open: a store error means a normal send.
 * - The store holds no personal data. A memo is the outcome, a short label,
 *   and whether a brief rode along: never the visitor's name, address,
 *   topic, organization, or role. The replay rebuilds those card fields from
 *   the approved input that is executing again, which the SDK echoes back
 *   with the call.
 * - Email quotas are reserved only when email can actually go out
 *   (`isEmailConfigured()`); production has no Resend today, and a
 *   not-configured attempt must never burn the day's allowance.
 * - The model-facing not-sent hint is per tool and per reason. "Noted" is
 *   reserved for the not-configured hand-off, the one outcome that records
 *   the request on the server; everything else is plainly "not sent". No
 *   hint ever names an email address: info@ has no inbound mail.
 *
 * Server-only (imports the `ai` runtime, Resend, and the rate limiter).
 * Client components may import its types with `import type` only.
 */

import {
  tool,
  type InferUITools,
  type ToolCallOptions,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { DLI } from "@/lib/dli";
import { recommendWorkshop as pickWorkshop } from "@/lib/recommend";
import { consultingBriefSchema, findBrief } from "@/lib/brief-schema";
import { pathLabel, renderBriefText } from "@/lib/brief-prompt";
import { BRIEF_EMAIL_SUBJECT, briefEmail } from "@/lib/brief-email";
import { readinessInputSchema, summarizeReadiness } from "@/lib/readiness";
import { submitInquiry } from "@/lib/inquiry";
import { EMAIL_RE, founderInbox, isEmailConfigured, scrubForEmail, sendEmail } from "@/lib/email";
import { workshopInfoEmail } from "@/lib/workshop-email";
import { getRateLimiter } from "@/lib/rate-limit";
import type { ChatMessageMetadata } from "@/lib/chat-metadata";

export type ToolContext = { ip: string };

/** `experimental_context` is typed `unknown`; the route always passes `{ ip }`. */
export function toolContext(options: Pick<ToolCallOptions, "experimental_context">): ToolContext {
  const ctx = options.experimental_context;
  if (ctx && typeof ctx === "object" && typeof (ctx as { ip?: unknown }).ip === "string") {
    return { ip: (ctx as ToolContext).ip };
  }
  return { ip: "unknown" };
}

/** `LanguageModelV3ToolResultOutput` text variant; `as const` keeps the literal narrow. */
const modelText = (value: string) => ({ type: "text" as const, value });

export type NotSentReason =
  | "invalid-email"
  | "rate-limited"
  | "not-configured"
  | "send-failed"
  | "no-brief";

/**
 * `NotSentReason` plus the one reason only a crafted transcript can produce:
 * an approved call whose echoed input no longer passes the tool's schema. The
 * widget renders its generic not-sent line for it.
 */
export type ToolFailureReason = NotSentReason | "invalid-input";

const WHY: Record<ToolFailureReason, string> = {
  "invalid-email": "the email address did not look valid",
  "rate-limited": "today's email allowance for this network is used up",
  "not-configured": "outgoing email is not configured on this site yet",
  "send-failed": "the email service rejected the message",
  "no-brief": "no brief has been drafted yet",
  "invalid-input": "the details did not pass validation",
};

export function isFailureReason(v: unknown): v is ToolFailureReason {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(WHY, v);
}

type SendKind = "handoff" | "brief" | "workshop";

const WORKSHOP_PAGE = "/nvidia-dli-workshops";
const CONTACT_FORM = "point them to the contact form at /contact";
const FORM_ONLY_RECORDS =
  "which also only records messages on the server until email delivery is connected";
const NEVER_CLAIM = "do not claim an email went out";

const WHAT: Record<SendKind, string> = {
  handoff: "Hand-off",
  brief: "Brief",
  workshop: "Workshop details",
};

/** Where the thing they wanted still is, per tool, for every not-sent outcome except the hand-off. */
const STAYS: Record<Exclude<SendKind, "handoff">, string> = {
  brief:
    "the brief stays on screen in this chat, so they can copy it, or Majid can send it after a hand-off",
  workshop: `the same details are on the workshop page at ${WORKSHOP_PAGE}`,
};

/**
 * What Dr. MJ should say when a send did not happen. Echoed outputs are
 * untrusted, so an unknown reason gets the generic line.
 */
export function notSentHint(kind: SendKind, reason: unknown): string {
  const what = WHAT[kind];
  if (!isFailureReason(reason)) {
    return `${what} NOT sent: it could not be sent. Say so plainly, ${kind === "handoff" ? CONTACT_FORM : STAYS[kind]}, and ${NEVER_CLAIM}.`;
  }
  const why = WHY[reason];
  switch (reason) {
    case "not-configured":
      return kind === "handoff"
        ? `${what} NOT emailed but noted for Majid: ${why}. Say it was noted but not sent, ${CONTACT_FORM} (${FORM_ONLY_RECORDS}), and ${NEVER_CLAIM}.`
        : `${what} NOT emailed: ${why}. Say so plainly; ${STAYS[kind]}. Do not say it was noted, and ${NEVER_CLAIM}.`;
    case "invalid-email":
      return `${what} NOT sent: ${why}. Ask them to check the address and offer to try again; ${NEVER_CLAIM}.`;
    case "no-brief":
      return `${what} NOT sent: ${why}. Call draftConsultingBrief first, then offer again.`;
    case "invalid-input":
      return `${what} NOT sent: ${why}. Confirm their name, email, and what they need in one line, then call the tool again; ${NEVER_CLAIM}.`;
    default:
      // rate-limited, send-failed
      return `${what} NOT sent: ${why}. Say so plainly, ${kind === "handoff" ? CONTACT_FORM : STAYS[kind]}, and ${NEVER_CLAIM}.`;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Re-validates an approval-gated input. The SDK re-executes approved calls
 * from the echoed transcript without running `inputSchema`, so a crafted
 * transcript could otherwise push oversized or mistyped fields through.
 */
function recheck<S extends z.ZodType>(schema: S, input: unknown): z.output<S> | null {
  const parsed = schema.safeParse(input);
  return parsed.success ? (parsed.data as z.output<S>) : null;
}

/** Reads a raw (possibly crafted) input field for the card, bounded. */
const field = (raw: unknown, key: string, max: number): string =>
  str((raw as Record<string, unknown> | null | undefined)?.[key]).trim().slice(0, max);

type SendTool = (typeof APPROVAL_TOOLS)[number];

/**
 * Everything the limiter store keeps about a delivered send, and all it may
 * keep: the outcome, a short non-personal label, and whether a brief rode
 * along. It sits in Upstash or memory for a day, so no visitor field belongs
 * in it.
 */
type DeliveryMemo = { delivered: true; label: string; briefAttached?: boolean };

/**
 * The memo for a send this tool already delivered under `toolCallId`, or
 * null. Checked before validation, quota, and send: a re-sent approval must
 * neither spend the day's allowance nor email again. Anything but a delivered
 * memo is treated as absent, so a stale or corrupt record can only cause one
 * more send, never a missed one. Read defensively: the store is shared and
 * its contents are not trusted to be shaped.
 */
async function recallDelivered(tool: SendTool, toolCallId: string): Promise<DeliveryMemo | null> {
  const stored = await getRateLimiter().recallSent(tool, toolCallId);
  if (!stored || typeof stored !== "object" || (stored as { delivered?: unknown }).delivered !== true) {
    return null;
  }
  const memo = stored as Record<string, unknown>;
  console.info(`[chat-tools] ${tool} already delivered for ${toolCallId}; replaying that outcome`);
  return { delivered: true, label: str(memo.label), briefAttached: memo.briefAttached === true };
}

/**
 * Remembers a delivered send for a day so a re-sent approval replays it.
 * Takes a memo, never a tool output: the output carries the visitor's
 * details and the store must not. Never throws.
 */
async function rememberDelivered(
  tool: SendTool,
  toolCallId: string,
  memo: DeliveryMemo,
): Promise<void> {
  await getRateLimiter().rememberSent(tool, toolCallId, memo);
}

/**
 * Grounds a recommendation in the real NVIDIA catalog so Dr. MJ never invents
 * a title.
 */
export const recommendWorkshop = tool({
  description:
    "Recommend the best-fit NVIDIA DLI training from the real catalog for what the visitor does and needs. Call this after you understand their need, before naming specific training. Returns a grounded pick, why it fits, whether Nexus teaches it in-house, and alternatives.",
  inputSchema: z.object({
    role: z.string().max(200).optional().describe("Their role or team, e.g. 'ML engineers'"),
    need: z.string().max(500).optional().describe("What they want to build or improve with AI"),
    level: z.string().max(100).optional().describe("Experience level, if known"),
    text: z.string().max(1000).optional().describe("Any extra context in their own words"),
  }),
  execute: async (input) => {
    const rec = pickWorkshop(input, DLI.catalog);
    return {
      title: rec.workshop.title,
      url: rec.workshop.url,
      blurb: rec.workshop.blurb,
      hostedByNexus: rec.hosted,
      why: rec.why,
      alternatives: rec.alternatives.slice(0, 3).map((w) => w.title),
    };
  },
  toModelOutput: ({ output }) => {
    const title = str(output?.title);
    if (!title) return modelText("Recommendation shown to the visitor as a card.");
    const alternatives = Array.isArray(output?.alternatives)
      ? output.alternatives.filter((a): a is string => typeof a === "string").slice(0, 3)
      : [];
    const hosted = output?.hostedByNexus === true;
    return modelText(
      `Recommended: ${title} (${hosted ? "Nexus teaches it in-house" : "Nexus arranges it with the right certified instructor"}). ${str(output?.why)}${alternatives.length ? ` Alternatives: ${alternatives.join("; ")}.` : ""}`.trim(),
    );
  },
});

/**
 * The structured consulting brief. The input is the brief, so the card can
 * render it while it streams and later tools can re-read it from history.
 * The output stays small on purpose: echoed parts count against the body cap.
 */
export const draftConsultingBrief = tool({
  description:
    "Draft the structured consulting brief for this visitor: who they are, the goal, where they are today, opportunities with effort, risks, what to keep with people, the recommended Nexus path, the first step, and open questions. Call it once you understand their organization and goal, or the moment they ask for a brief, a summary, or a write-up. It renders as a card the visitor can send to Majid or have emailed. Ground every field in what they said.",
  inputSchema: consultingBriefSchema,
  execute: async (brief) => ({
    ok: true as const,
    path: brief.recommendedPath.path,
    opportunities: brief.opportunities.length,
    draftedAt: new Date().toISOString(),
  }),
  toModelOutput: ({ output }) => {
    const path = str(output?.path);
    return modelText(
      path
        ? `Brief drafted and shown as a card (recommended path: ${pathLabel(path)}). Do not repeat the brief in prose. In one or two sentences say why that path, then offer to send it to Majid or email it to them.`
        : "Brief drafted and shown as a card. Do not repeat it in prose; offer to send it to Majid or email it to them.",
    );
  },
});

/** Readiness snapshot on five fixed dimensions; scores are clamped in `summarizeReadiness`. */
export const assessReadiness = tool({
  description:
    "Score the visitor's AI readiness on up to five fixed dimensions (use case, data, team, workflow fit, governance) from what they have told you, 1 to 5 each, with one line of evidence per score and one next step. Call it when they ask how ready they are, or once you understand their situation and a snapshot would help them decide. Skip dimensions you have no evidence for. It renders as a card.",
  inputSchema: readinessInputSchema,
  execute: async (input) => summarizeReadiness(input),
  toModelOutput: ({ output }) => {
    if (typeof output?.overall !== "number") {
      return modelText("Readiness snapshot shown to the visitor as a card.");
    }
    const weakest = output.weakest;
    const weakestText =
      weakest && typeof weakest === "object" && str(weakest.label)
        ? ` Weakest: ${weakest.label} (${weakest.score}/5).`
        : "";
    return modelText(
      `Readiness snapshot shown as a card: ${output.overall}/5, ${str(output.level) || "scored"}.${weakestText} Do not repeat the scores; say one sentence about the weakest area and the next step.`,
    );
  },
});

type HandOffOutput = {
  name: string;
  email: string;
  topic: string;
  organization?: string;
  role?: string;
  briefAttached: boolean;
  delivered: boolean;
  reason?: ToolFailureReason;
};

/**
 * Consultation hand-off: a structured summary (plus the brief when one
 * exists) to the founder's inbox via `submitInquiry`, which skips the visitor
 * confirmation for this source. Not a booking.
 */
const handOffInput = z.object({
  name: z.string().min(1).max(120).describe("Visitor's name"),
  email: z.string().min(3).max(254).describe("Visitor's email address, exactly as they typed it"),
  topic: z.string().min(1).max(300).describe("What they need, in one line, in their words"),
  organization: z.string().max(160).optional().describe("Company or team, if mentioned"),
  role: z.string().max(120).optional().describe("Their role, if mentioned"),
  briefToolCallId: z
    .string()
    .max(128)
    .optional()
    .describe("The toolCallId of the draftConsultingBrief call to attach, if a brief was drafted"),
});

export const handOffToMajid = tool({
  description:
    "Send Majid Memari a structured consultation hand-off by email: the visitor's name, email, what they need, and the drafted brief when one exists. Call it only when the visitor wants Majid to follow up and you have their name and email. The visitor approves the send on screen first. Not a booking: it schedules nothing.",
  inputSchema: handOffInput,
  needsApproval: true,
  execute: async (raw, options): Promise<HandOffOutput> => {
    const { ip } = toolContext(options);
    const input = recheck(handOffInput, raw);
    const organization = field(raw, "organization", 160);
    const role = field(raw, "role", 120);
    const base = {
      name: scrubForEmail(field(raw, "name", 120)).slice(0, 80) || "Visitor",
      email: field(raw, "email", 254),
      topic: field(raw, "topic", 300),
      ...(organization ? { organization } : {}),
      ...(role ? { role } : {}),
    };
    // Still ahead of validation, quota, and send. The card's fields come
    // back from the approved input, so only the outcome had to be stored.
    const memo = await recallDelivered("handOffToMajid", options.toolCallId);
    if (memo) return { ...base, briefAttached: memo.briefAttached === true, delivered: true };
    if (!input) return { ...base, briefAttached: false, delivered: false, reason: "invalid-input" };
    if (!EMAIL_RE.test(base.email)) {
      return { ...base, briefAttached: false, delivered: false, reason: "invalid-email" };
    }
    const brief = findBrief(options.messages, input.briefToolCallId);
    const briefAttached = brief !== null;
    // No Resend in production today: a send that cannot happen must not
    // spend the day's hand-off allowance. The request is still logged below.
    if (isEmailConfigured() && !(await getRateLimiter().reserveEmail(ip, "handoff"))) {
      return { ...base, briefAttached, delivered: false, reason: "rate-limited" };
    }
    const message = [
      `Wants Majid to follow up about: ${base.topic}`,
      base.role ? `Role: ${base.role}` : null,
      base.organization ? `Organization: ${base.organization}` : null,
      "",
      brief
        ? `CONSULTING BRIEF (drafted by Dr. MJ in chat)\n\n${renderBriefText(brief)}`
        : "No brief was drafted in this chat.",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
    const result = await submitInquiry({
      name: base.name,
      email: base.email,
      message,
      source: "chat-handoff",
    });
    if (!result.ok) return { ...base, briefAttached, delivered: false, reason: "send-failed" };
    if (!result.delivered) {
      return { ...base, briefAttached, delivered: false, reason: "not-configured" };
    }
    await rememberDelivered("handOffToMajid", options.toolCallId, {
      delivered: true,
      label: WHAT.handoff,
      briefAttached,
    });
    return { ...base, briefAttached, delivered: true };
  },
  toModelOutput: ({ output }) => {
    if (output?.delivered === true) {
      return modelText(
        `Hand-off emailed to Majid${output.briefAttached === true ? " with the brief attached" : ""}. Confirm in one sentence that he will follow up by email; do not promise a time, a call, or a confirmation number.`,
      );
    }
    return modelText(notSentHint("handoff", output?.reason));
  },
});

type EmailOutput = {
  name: string;
  email: string;
  subject: string;
  delivered: boolean;
  reason?: ToolFailureReason;
};

const emailBriefInput = z.object({
  name: z.string().min(1).max(120).describe("Visitor's name"),
  email: z.string().min(3).max(254).describe("Visitor's email address, exactly as they typed it"),
  briefToolCallId: z
    .string()
    .max(128)
    .optional()
    .describe("The toolCallId of the draftConsultingBrief call to send, if known"),
});

/** The visitor's copy of the brief: fixed template, scrubbed fields, Majid copied. */
export const emailBriefToVisitor = tool({
  description:
    "Email the drafted consulting brief to the visitor's own address, with Majid copied. Call it only after draftConsultingBrief has run, when the visitor asks for the brief by email and you have their name and email. The visitor approves the send on screen first.",
  inputSchema: emailBriefInput,
  needsApproval: true,
  execute: async (raw, options): Promise<EmailOutput> => {
    const { ip } = toolContext(options);
    const input = recheck(emailBriefInput, raw);
    const base = {
      name: scrubForEmail(field(raw, "name", 120)).slice(0, 80) || "there",
      email: field(raw, "email", 254),
      subject: BRIEF_EMAIL_SUBJECT,
    };
    const memo = await recallDelivered("emailBriefToVisitor", options.toolCallId);
    if (memo) return { ...base, delivered: true };
    if (!input) return { ...base, delivered: false, reason: "invalid-input" };
    if (!EMAIL_RE.test(base.email)) return { ...base, delivered: false, reason: "invalid-email" };
    const brief = findBrief(options.messages, input.briefToolCallId);
    if (!brief) return { ...base, delivered: false, reason: "no-brief" };
    if (isEmailConfigured() && !(await getRateLimiter().reserveEmail(ip, "visitor"))) {
      return { ...base, delivered: false, reason: "rate-limited" };
    }
    const { subject, text, html } = briefEmail({ name: base.name, brief });
    const sent = await sendEmail({
      to: base.email,
      cc: [founderInbox()],
      replyTo: founderInbox(),
      subject,
      text,
      html,
    });
    if (!sent.ok) return { ...base, delivered: false, reason: "send-failed" };
    if (!sent.delivered) return { ...base, delivered: false, reason: "not-configured" };
    await rememberDelivered("emailBriefToVisitor", options.toolCallId, { delivered: true, label: WHAT.brief });
    return { ...base, delivered: true };
  },
  toModelOutput: ({ output }) =>
    output?.delivered === true
      ? modelText(
          "Brief emailed to the visitor with Majid copied. Say so in one sentence and offer a next step.",
        )
      : modelText(notSentHint("brief", output?.reason)),
});

const emailWorkshopInput = z.object({
  name: z.string().min(1).max(120).describe("Visitor's name"),
  email: z.string().min(3).max(254).describe("Visitor's email address, exactly as they typed it"),
});

/** The NVIDIA one-pager: fixed template, Majid copied as the founder heads-up. */
export const emailWorkshopInfo = tool({
  description:
    "Email the visitor the official NVIDIA DLI workshop details (a fixed one-pager), with Majid copied. Call this when they ask to be sent the workshop information and you have their name and email. The visitor approves the send on screen first.",
  inputSchema: emailWorkshopInput,
  needsApproval: true,
  execute: async (raw, options): Promise<EmailOutput> => {
    const { ip } = toolContext(options);
    const input = recheck(emailWorkshopInput, raw);
    const name = scrubForEmail(field(raw, "name", 120)).slice(0, 80) || "there";
    const prepared = workshopInfoEmail({ name });
    const base = { name, email: field(raw, "email", 254), subject: prepared.subject };
    const memo = await recallDelivered("emailWorkshopInfo", options.toolCallId);
    if (memo) return { ...base, delivered: true };
    if (!input) return { ...base, delivered: false, reason: "invalid-input" };
    if (!EMAIL_RE.test(base.email)) return { ...base, delivered: false, reason: "invalid-email" };
    if (isEmailConfigured() && !(await getRateLimiter().reserveEmail(ip, "visitor"))) {
      return { ...base, delivered: false, reason: "rate-limited" };
    }
    const sent = await sendEmail({
      to: base.email,
      cc: [founderInbox()],
      replyTo: founderInbox(),
      subject: prepared.subject,
      text: prepared.text,
      html: prepared.html,
    });
    if (!sent.ok) return { ...base, delivered: false, reason: "send-failed" };
    if (!sent.delivered) return { ...base, delivered: false, reason: "not-configured" };
    await rememberDelivered("emailWorkshopInfo", options.toolCallId, { delivered: true, label: WHAT.workshop });
    return { ...base, delivered: true };
  },
  toModelOutput: ({ output }) =>
    output?.delivered === true
      ? modelText(
          "Workshop details emailed to the visitor with Majid copied. Say it is on the way in one sentence and offer to scope it with them.",
        )
      : modelText(notSentHint("workshop", output?.reason)),
});

export const chatTools = {
  recommendWorkshop,
  draftConsultingBrief,
  assessReadiness,
  handOffToMajid,
  emailBriefToVisitor,
  emailWorkshopInfo,
};

export type ChatTools = typeof chatTools;
export type ChatUITools = InferUITools<ChatTools>;
/** The UI message type the widget should use with `useChat`. */
export type NexusUIMessage = UIMessage<ChatMessageMetadata, UIDataTypes, ChatUITools>;

/** Tools whose calls pause for on-screen approval. */
export const APPROVAL_TOOLS = ["handOffToMajid", "emailBriefToVisitor", "emailWorkshopInfo"] as const;
