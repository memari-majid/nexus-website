/**
 * Request handling for the chat route, kept pure so vitest can cover it: the
 * client IP, the body caps, the part-shape whitelist, and the neutralising of
 * stale approvals. The route only wires these to `Response` objects.
 *
 * Why a whitelist: `convertToModelMessages` forwards `file` parts (remote
 * URLs the provider fetches and tokenizes), `reasoning` parts, and any
 * `providerMetadata` straight to the model, and the precharge counts none of
 * them. Visitors only ever send text; the assistant only ever produces text,
 * step markers, and calls to the known tools. Everything else is dropped,
 * and every kept part is rebuilt from its allowed keys only.
 *
 * Why the approval rewrite: a tool part left in `approval-requested` (the
 * visitor typed instead of answering the card) is a tool call with no
 * result. Converted strictly, `streamText` fails with MissingToolResultsError
 * on every later turn; with the route's `ignoreIncompleteToolCalls`, the SDK
 * (ai 6.0.282 and later) drops the call outright, so the model never learns
 * the send was offered and may offer it again. Such parts become
 * `output-denied` with a reason the model can act on. An `approval-responded`
 * part is kept only in the final message, where the SDK executes it;
 * anywhere earlier it was never run, and the model is told so.
 *
 * Why the tool-payload cap: echoed tool inputs and outputs are sent to the
 * model, and billed, on every later turn, and only `textChars` is checked
 * against `MAX_CHARS_TOTAL`. With ten tools a conversation can carry a 3.5k
 * estimate input and a 1.5k note draft and still be nowhere near the raw body
 * cap. `trimToolPayloads` brings the total under `MAX_TOOL_CHARS_TOTAL` by
 * replacing the OLDEST tool OUTPUTS with a marker, never an input: the cards
 * render `part.input`, `findBrief` and `findOutreachNote` re-read inputs from
 * history, and an approved call is re-validated from its input. A trimmed
 * output falls through each tool's `toModelOutput` to its generic line, which
 * is exactly what those lines are for.
 *
 * Why the signature checks: an on-screen approval is only as trustworthy as
 * the transcript that carries it, and the transcript is the client's. A part
 * in `approval-responded` for a call the model never made, with a self-chosen
 * id and input, used to execute. Now the SDK signs every approval request it
 * emits (`experimental_toolApprovalSecret` on the route) and this sanitizer
 * verifies that signature on the way in (`lib/approval-signature.ts`): an
 * approval that does not verify becomes `output-denied` with
 * `FORGED_APPROVAL_REASON`, before any budget is reserved. The draft tools
 * sign their own input into their output for the same reason, and a draft
 * part whose output does not verify is dropped, so `findBrief` and
 * `findOutreachNote` can only ever hand a send tool a draft this server saw
 * the model write. Both checks run only when the caller passes the secret; the
 * route always does.
 *
 * Server-only (imports the tool set for its names).
 */

import { z } from "zod";
import { MAX_SIGNATURE_CHARS, verifyApproval, verifyDraft } from "@/lib/approval-signature";
import { BRIEF_TOOL_NAME } from "@/lib/brief-schema";
import {
  MAX_BODY_CHARS,
  MAX_CHARS_PER_ASSISTANT_TEXT_PART,
  MAX_CHARS_PER_TEXT_PART,
  MAX_CHARS_TOTAL,
  MAX_MESSAGES,
  MAX_PARTS_PER_MESSAGE,
  MAX_TOOL_CHARS_TOTAL,
} from "@/lib/chat-limits";
import { chatTools, type NexusUIMessage } from "@/lib/chat-tools";
import { OUTREACH_TOOL_NAME } from "@/lib/outreach";

export const TOO_LONG = "This conversation is getting long. Tap New to start a fresh chat.";
/** What an old tool result becomes once its payload is trimmed for size. */
export const TRIMMED_OUTPUT = { trimmed: true } as const;
export const INVALID = "Invalid request body.";

/** Model-facing reason on a stale, unanswered approval. */
export const STALE_APPROVAL_REASON =
  "The visitor moved on without answering the on-screen approval, so nothing was sent. Do not call this tool again unless they ask.";
/** Model-facing error on an approval that was granted but never executed. */
export const INTERRUPTED_APPROVAL_TEXT =
  "Approved on screen, but that request was interrupted before the send ran, so nothing was sent. Offer to try again only if the visitor asks.";
/** Model-facing reason on an approval whose signature is missing or does not match. */
export const FORGED_APPROVAL_REASON =
  "That approval could not be verified against a request this assistant made, so nothing was sent. Do not call this tool again unless the visitor asks, and point them to the contact form at /contact.";

/** The tools whose input is a draft that a send tool re-reads from history. */
const DRAFT_TOOL_NAMES: ReadonlySet<string> = new Set([BRIEF_TOOL_NAME, OUTREACH_TOOL_NAME]);

/**
 * Vercel sets `x-vercel-forwarded-for` and `x-real-ip` itself, so those are
 * trusted before the client-influenced `x-forwarded-for`. Neither domain is
 * behind the Cloudflare proxy today (DNS resolves to Vercel); if that ever
 * flips, read `cf-connecting-ip` first. Every non-Vercel/dev request lands in
 * the shared "unknown" bucket.
 */
export function clientIp(headers: Headers): string {
  const trusted = headers.get("x-vercel-forwarded-for") || headers.get("x-real-ip");
  if (trusted) return trusted.split(",")[0].trim() || "unknown";
  const xff = headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

/* ---------- Schemas ---------- */

const TOOL_NAMES: ReadonlySet<string> = new Set(Object.keys(chatTools));

const TOOL_STATES = [
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
  "output-available",
  "output-error",
  "output-denied",
] as const;

const approvalSchema = z.object({
  id: z.string().min(1).max(128),
  approved: z.boolean().optional(),
  reason: z.string().max(500).optional(),
  /** The SDK's HMAC over the request it issued; verified before an approved call may run. */
  signature: z.string().max(MAX_SIGNATURE_CHARS).optional(),
});

/**
 * `z.object` strips everything not listed: `providerMetadata`,
 * `callProviderMetadata`, `resultProviderMetadata`, `providerExecuted`,
 * `rawInput`, `preliminary`, and whatever else a crafted part carries.
 */
const toolPartSchema = z.object({
  type: z.string().max(64),
  toolCallId: z.string().min(1).max(128),
  state: z.enum(TOOL_STATES),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  errorText: z.string().max(2_000).optional(),
  approval: approvalSchema.optional(),
});

const loosePartSchema = z.looseObject({ type: z.string().max(64) });

/**
 * Only user and assistant turns are accepted, so a client cannot inject
 * system messages. Parts are validated loosely here and rebuilt by
 * `sanitizeTranscript`; unknown top-level keys (the transport's `trigger`,
 * `messageId`) are stripped by `z.object`.
 */
const messageSchema = z.object({
  id: z.string().max(128).optional(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(loosePartSchema).max(MAX_PARTS_PER_MESSAGE),
});

/**
 * Only `messages`. A `model` field, or anything else a client adds, is
 * stripped by `z.object`: the route runs one model and the body does not get
 * a say in which.
 */
export const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES * 4),
});

type LooseMessage = z.infer<typeof messageSchema>;
type LoosePart = z.infer<typeof loosePartSchema>;

/* ---------- Sanitizing ---------- */

type Approval = { id: string; approved?: boolean; reason?: string; signature?: string };
type TextPart = { type: "text"; text: string };
type StepStartPart = { type: "step-start" };
type ToolPart = {
  type: `tool-${string}`;
  toolCallId: string;
  state: (typeof TOOL_STATES)[number];
  input: unknown;
  output?: unknown;
  errorText?: string;
  approval?: Approval;
};
type SanitizedPart = TextPart | StepStartPart | ToolPart;

/** What the sanitizer refused because it could not verify it, for the route's log line. */
export type Rejected = {
  /** Approved parts whose signature was missing or wrong, rewritten to a denial. */
  forgedApprovals: number;
  /** Brief and note parts whose output carried no valid draft signature, dropped. */
  unsignedDrafts: number;
};

export type SanitizedTranscript =
  | {
      ok: true;
      messages: NexusUIMessage[];
      /** Visitor and assistant text, the number the conversation cap applies to. */
      textChars: number;
      /** Echoed tool inputs, outputs, and error text, counted toward the precharge only. */
      toolChars: number;
      rejected: Rejected;
    }
  | { ok: false; error: "user-text-too-long" };

export type SanitizeOptions = {
  /**
   * The signing secret (`approvalSecret()`). With it, approved parts and draft
   * parts are verified; without it (pure tests of the other rules) they pass
   * through as they always did, and the SDK's own check is still the backstop.
   */
  approvalSecret?: string;
};

const jsonLength = (v: unknown): number => (v === undefined ? 0 : JSON.stringify(v).length);

const toolNameOf = (type: string): string => type.slice("tool-".length);

function sanitizeToolPart(
  raw: LoosePart,
  isLastMessage: boolean,
  secret: string | undefined,
  rejected: Rejected,
): ToolPart | null {
  if (!raw.type.startsWith("tool-") || !TOOL_NAMES.has(toolNameOf(raw.type))) return null;
  const parsed = toolPartSchema.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;
  // Mirrors `ignoreIncompleteToolCalls`; a call with no input is not a call.
  if (p.state === "input-streaming" || p.state === "input-available" || p.input === undefined) {
    return null;
  }
  const toolName = toolNameOf(p.type);
  const head = { type: p.type as `tool-${string}`, toolCallId: p.toolCallId, input: p.input };
  // A draft is only a draft when this server signed it into the output. Any
  // other state or an unverifiable output is not one the send tools may read.
  if (secret !== undefined && DRAFT_TOOL_NAMES.has(toolName)) {
    const signature = (p.output as { signature?: unknown } | null | undefined)?.signature;
    const verified =
      p.state === "output-available" &&
      verifyDraft({ secret, toolCallId: p.toolCallId, toolName, input: p.input, signature });
    if (!verified) {
      rejected.unsignedDrafts += 1;
      return null;
    }
  }
  const id = p.approval?.id;
  const granted = id && p.approval?.approved === true ? { approval: { id, approved: true } } : {};
  switch (p.state) {
    case "approval-requested":
      if (!id) return null;
      return {
        ...head,
        state: "output-denied",
        approval: { id, approved: false, reason: STALE_APPROVAL_REASON },
      };
    case "approval-responded": {
      if (!id || typeof p.approval?.approved !== "boolean") {
        return id
          ? { ...head, state: "output-denied", approval: { id, approved: false, reason: STALE_APPROVAL_REASON } }
          : null;
      }
      const reason = p.approval.reason;
      if (isLastMessage) {
        const signature = p.approval.signature;
        if (
          secret !== undefined &&
          p.approval.approved &&
          !verifyApproval({ secret, signature, approvalId: id, toolCallId: p.toolCallId, toolName, input: p.input })
        ) {
          rejected.forgedApprovals += 1;
          return { ...head, state: "output-denied", approval: { id, approved: false, reason: FORGED_APPROVAL_REASON } };
        }
        return {
          ...head,
          state: "approval-responded",
          approval: {
            id,
            approved: p.approval.approved,
            ...(reason ? { reason } : {}),
            ...(signature ? { signature } : {}),
          },
        };
      }
      return p.approval.approved
        ? { ...head, state: "output-error", errorText: INTERRUPTED_APPROVAL_TEXT, approval: { id, approved: true } }
        : { ...head, state: "output-denied", approval: { id, approved: false, reason: reason ?? "Declined on screen." } };
    }
    case "output-denied":
      if (!id) return null;
      return {
        ...head,
        state: "output-denied",
        approval: { id, approved: false, ...(p.approval?.reason ? { reason: p.approval.reason } : {}) },
      };
    case "output-available":
      return { ...head, state: "output-available", output: p.output, ...granted };
    case "output-error":
      return { ...head, state: "output-error", errorText: p.errorText || "Tool failed.", ...granted };
    default:
      return null;
  }
}

function sanitizeUserPart(raw: LoosePart): TextPart | null | "too-long" {
  if (raw.type !== "text" || typeof raw.text !== "string") return null;
  if (raw.text.length > MAX_CHARS_PER_TEXT_PART) return "too-long";
  return { type: "text", text: raw.text };
}

function sanitizeAssistantPart(
  raw: LoosePart,
  isLastMessage: boolean,
  secret: string | undefined,
  rejected: Rejected,
): SanitizedPart | null {
  if (raw.type === "text") {
    if (typeof raw.text !== "string") return null;
    // Trimmed, not rejected: one long reply must not lock the visitor out.
    return { type: "text", text: raw.text.slice(0, MAX_CHARS_PER_ASSISTANT_TEXT_PART) };
  }
  if (raw.type === "step-start") return { type: "step-start" };
  return sanitizeToolPart(raw, isLastMessage, secret, rejected);
}

const toolPartChars = (part: ToolPart): number =>
  jsonLength(part.input) + jsonLength(part.output) + (part.errorText?.length ?? 0);

/**
 * Brings echoed tool payloads under `MAX_TOOL_CHARS_TOTAL` by replacing the
 * oldest OUTPUTS with `TRIMMED_OUTPUT`, newest untouched, and returns the new
 * total. Inputs are never touched: the cards render them, two tools re-read
 * them from history, and an approved send re-validates from them. Parts in the
 * final message are left alone, since that is where an approved call is about
 * to execute. Returns the total unchanged when it already fits.
 */
export function trimToolPayloads(parts: readonly ToolPart[], total: number): number {
  if (total <= MAX_TOOL_CHARS_TOTAL) return total;
  let running = total;
  for (const part of parts) {
    if (running <= MAX_TOOL_CHARS_TOTAL) break;
    if (part.output === undefined && part.errorText === undefined) continue;
    const before = toolPartChars(part);
    if (part.output !== undefined) part.output = TRIMMED_OUTPUT;
    if (part.errorText !== undefined) part.errorText = "Result trimmed for length.";
    running -= before - toolPartChars(part);
  }
  return running;
}

/**
 * Rebuilds every message from whitelisted parts. Messages left with no parts
 * are dropped (a user turn that only carried a file part, say).
 */
export function sanitizeTranscript(
  messages: readonly LooseMessage[],
  options: SanitizeOptions = {},
): SanitizedTranscript {
  const out: { id?: string; role: "user" | "assistant"; parts: SanitizedPart[] }[] = [];
  // Oldest first, and never the final message: that is where an approved call
  // is executed and where the visitor is looking.
  const trimmable: ToolPart[] = [];
  const rejected: Rejected = { forgedApprovals: 0, unsignedDrafts: 0 };
  let textChars = 0;
  let toolChars = 0;
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const isLastMessage = index === messages.length - 1;
    const parts: SanitizedPart[] = [];
    for (const raw of message.parts) {
      const part =
        message.role === "user"
          ? sanitizeUserPart(raw)
          : sanitizeAssistantPart(raw, isLastMessage, options.approvalSecret, rejected);
      if (part === "too-long") return { ok: false, error: "user-text-too-long" };
      if (!part) continue;
      if (part.type === "text") textChars += part.text.length;
      else if (part.type !== "step-start") {
        toolChars += toolPartChars(part);
        if (!isLastMessage) trimmable.push(part);
      }
      parts.push(part);
    }
    if (parts.length > 0) out.push({ ...(message.id ? { id: message.id } : {}), role: message.role, parts });
  }
  toolChars = trimToolPayloads(trimmable, toolChars);
  return { ok: true, messages: out as unknown as NexusUIMessage[], textChars, toolChars, rejected };
}

/* ---------- Body ---------- */

export type ParsedChatBody =
  | {
      ok: true;
      messages: NexusUIMessage[];
      textChars: number;
      /** Text plus echoed tool payloads: what the precharge estimates from. */
      prechargeChars: number;
      rejected: Rejected;
    }
  | { ok: false; status: 400 | 413; error: string };

/** Everything between `req.text()` and `convertToModelMessages`, in order of cost. */
export function parseChatBody(rawText: string, options: SanitizeOptions = {}): ParsedChatBody {
  if (rawText.length > MAX_BODY_CHARS) return { ok: false, status: 413, error: TOO_LONG };
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    return { ok: false, status: 400, error: INVALID };
  }
  const parsed = chatBodySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, status: 400, error: INVALID };
  if (parsed.data.messages.length > MAX_MESSAGES) return { ok: false, status: 413, error: TOO_LONG };
  const transcript = sanitizeTranscript(parsed.data.messages, options);
  if (!transcript.ok) return { ok: false, status: 400, error: INVALID };
  if (transcript.messages.length === 0) return { ok: false, status: 400, error: INVALID };
  if (transcript.textChars > MAX_CHARS_TOTAL) return { ok: false, status: 413, error: TOO_LONG };
  return {
    ok: true,
    messages: transcript.messages,
    textChars: transcript.textChars,
    prechargeChars: transcript.textChars + transcript.toolChars,
    rejected: transcript.rejected,
  };
}

/* ---------- Settlement ---------- */

/**
 * `onAbort` and `onFinish` can both fire for one request: the SDK calls
 * `onFinish` after an abort whenever at least one step had completed. The
 * bill must be settled exactly once, by whichever runs first.
 */
export function settleOnce<A extends unknown[]>(
  fn: (...args: A) => Promise<void>,
): (...args: A) => Promise<void> {
  let done = false;
  return async (...args: A) => {
    if (done) return;
    done = true;
    await fn(...args);
  };
}
