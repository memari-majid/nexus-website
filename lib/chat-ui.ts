/**
 * Client-side view of the chat tools: the typed UI message and tool parts
 * (derived from the route's tool set), the step labels for each tool, and the
 * small presentation helpers the widget needs (picker storage, stat
 * formatting, defensive readers for echoed data).
 *
 * Client-safe: type-only `ai` and `chat-tools` imports, no React, no
 * `process.env`. Never import a value from `lib/chat-tools.ts` here.
 */

import type { DeepPartial, ToolUIPart } from "ai";
import type { ConsultingBrief } from "@/lib/brief-schema";
import { chatMessageMetadataSchema, type ChatMessageMetadata } from "@/lib/chat-metadata";
import { findModel, formatUsd } from "@/lib/chat-models";
import type { ChatUITools, NexusUIMessage, NotSentReason } from "@/lib/chat-tools";

/** The `reason` union of the three sending tools, re-exported so cards never import the server module. */
export type { NotSentReason } from "@/lib/chat-tools";
import { READINESS_DIMENSIONS, type ReadinessInput, type ReadinessKey } from "@/lib/readiness";

/**
 * Tool input and output types come straight from the route's `chatTools`
 * (`InferUITools`), through a type-only import that the bundler erases, so the
 * cards are checked against the real `execute` shapes and cannot drift.
 */
export type { ChatUITools } from "@/lib/chat-tools";

export type ChatToolName = keyof ChatUITools;

export type ChatUIMessage = NexusUIMessage;

export type ChatToolPart = ToolUIPart<ChatUITools>;

export type ChatToolPartOf<NAME extends ChatToolName> = Extract<ChatToolPart, { type: `tool-${NAME}` }>;

/** What the widget sees while the brief is still being typed out. */
export type PartialBrief = DeepPartial<ConsultingBrief>;

export const CHAT_TOOL_NAMES: readonly ChatToolName[] = [
  "recommendWorkshop",
  "draftConsultingBrief",
  "assessReadiness",
  "handOffToMajid",
  "emailBriefToVisitor",
  "emailWorkshopInfo",
];

export function isChatToolName(name: string): name is ChatToolName {
  return (CHAT_TOOL_NAMES as readonly string[]).includes(name);
}

/** Visible step labels. Running rows get an ellipsis appended by the UI. */
export const TOOL_STEP_COPY: Record<
  ChatToolName,
  { title: string; running: string; done: string; sending: string }
> = {
  recommendWorkshop: {
    title: "Training match",
    running: "Checking the NVIDIA catalog",
    done: "Matched a workshop",
    sending: "",
  },
  draftConsultingBrief: {
    title: "Consulting brief",
    running: "Drafting your consulting brief",
    done: "Brief drafted",
    sending: "",
  },
  assessReadiness: {
    title: "Readiness snapshot",
    running: "Scoring AI readiness",
    done: "Readiness scored",
    sending: "",
  },
  handOffToMajid: {
    title: "Hand-off to Majid",
    running: "Preparing the hand-off",
    done: "Hand-off filed",
    sending: "Sending to Majid",
  },
  emailBriefToVisitor: {
    title: "Your copy of the brief",
    running: "Preparing your copy",
    done: "Brief emailed",
    sending: "Sending your copy",
  },
  emailWorkshopInfo: {
    title: "Workshop details",
    running: "Preparing the workshop details",
    done: "Details emailed",
    sending: "Sending the details",
  },
};

/* ---------- Delivery outcomes ---------- */

/**
 * Visitor copy for each `reason` a sending tool returns with `delivered:
 * false`. Each line is a complete sentence so the cards can follow it with the
 * contact-form fallback.
 */
export const NOT_SENT_COPY: Record<NotSentReason, string> = {
  "invalid-email": "that email address did not look valid. Check it and ask me to try again.",
  "rate-limited": "this network has used today's email allowance.",
  "not-configured": "email delivery is not connected on this site yet.",
  "send-failed": "the email service rejected the message.",
  "no-brief": "no brief has been drafted yet. Ask me to draft one first.",
};

const GENERIC_NOT_SENT = "it could not be sent.";

/** Echoed outputs are untrusted: an unknown or crafted reason gets the generic line. */
export function isNotSentReason(v: unknown): v is NotSentReason {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(NOT_SENT_COPY, v);
}

export function notSentCopy(reason: unknown): string {
  return isNotSentReason(reason) ? NOT_SENT_COPY[reason] : GENERIC_NOT_SENT;
}

/**
 * "Noted" is only true for `not-configured`: the tool reached the send step
 * and the server logged the message. Every other reason returned before
 * anything was recorded, so the step row and the card say "Not sent" there.
 */
export function wasNoted(reason: unknown): boolean {
  return reason === "not-configured";
}

/** Step-row label for a `delivered: false` outcome. */
export function notSentStepLabel(reason: unknown): string {
  return wasNoted(reason) ? "Noted, not emailed" : "Not sent";
}

/* ---------- Turn state (pure, so the widget rules are testable) ---------- */

/** The subset of a UI part the turn-state helpers read. */
export type PartLike = { type: string; state?: string };

function isToolPartLike(p: PartLike): boolean {
  return p.type.startsWith("tool-");
}

/** A tool call is waiting on the visitor's Send or Not now click. */
export function hasPendingApproval(parts: readonly PartLike[]): boolean {
  return parts.some((p) => isToolPartLike(p) && p.state === "approval-requested");
}

/**
 * A tool call is waiting on the visitor, or the visitor has answered and the
 * re-send that executes (or drops) the call has not produced its output yet.
 * While this is true the transcript must not gain a new user message: the
 * server throws on an unanswered request, and it runs an answered one only
 * when the answer is the last thing in the conversation.
 */
export function hasUnsettledApproval(parts: readonly PartLike[]): boolean {
  return parts.some(
    (p) =>
      isToolPartLike(p) && (p.state === "approval-requested" || p.state === "approval-responded"),
  );
}

/**
 * True when a streaming turn has nothing moving on screen: the last part is a
 * finished tool step or a step boundary, so the model is composing its next
 * step. The widget shows the thinking row then.
 */
export function betweenSteps(parts: readonly PartLike[]): boolean {
  const last = parts[parts.length - 1];
  if (!last) return false;
  if (last.type === "step-start") return true;
  return (
    isToolPartLike(last) &&
    (last.state === "output-available" ||
      last.state === "output-error" ||
      last.state === "output-denied")
  );
}

/**
 * A completed consulting brief exists in the transcript, which is what the
 * server's `findBrief` attaches to a hand-off whether or not the model passed
 * its id.
 */
export function hasDraftedBrief(
  messages: readonly { role: string; parts: readonly PartLike[] }[],
): boolean {
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      m.parts.some((p) => p.type === "tool-draftConsultingBrief" && p.state === "output-available"),
  );
}

/* ---------- Model picker ---------- */

/** localStorage key for the visitor's picker choice. */
export const MODEL_STORAGE_KEY = "nexus:chat-model";

/** True only for ids in the allowlist, so a stale stored value cannot leak through. */
export function isChatModelId(id: unknown): id is string {
  return findModel(id) !== undefined;
}

/** Display name for a gateway id, or the raw id when it is not in the list. */
export function modelLabel(id: string | undefined): string {
  if (!id) return "";
  return findModel(id)?.label ?? id;
}

/* ---------- Per-reply stats ---------- */

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Metadata is whatever the stream carried; validate before rendering. */
export function readChatMetadata(raw: unknown): ChatMessageMetadata | undefined {
  const parsed = chatMessageMetadataSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

/** Compact one-liner: "Claude Opus 5 · first token 0.9s · 6.2s · 3.4k tokens · $0.0210" */
export function statSummary(meta: ChatMessageMetadata): string {
  const bits: string[] = [];
  const label = meta.modelLabel || modelLabel(meta.model);
  if (label) bits.push(label);
  if (meta.ttftMs != null) bits.push(`first token ${formatMs(meta.ttftMs)}`);
  if (meta.totalMs != null) bits.push(formatMs(meta.totalMs));
  if (meta.tokens) bits.push(`${formatTokens(meta.tokens.total)} tokens`);
  if (meta.costUsd != null) bits.push(formatUsd(meta.costUsd));
  return bits.join(" · ");
}

/* ---------- Readiness ---------- */

function isReadinessKey(v: unknown): v is ReadinessKey {
  return typeof v === "string" && READINESS_DIMENSIONS.some((d) => d.key === v);
}

/**
 * Reads readiness data from the streaming partial input, the tool output, or
 * an echoed transcript (all three carry `dimensions`, `headline`, `nextStep`)
 * and returns a clean input for `summarizeReadiness`, so the card always shows
 * a verdict recomputed from the scores. Dimensions without a numeric score yet
 * are skipped, which is what hides them while the call streams.
 */
export function readReadinessInput(raw: unknown): ReadinessInput | undefined {
  const src = asRecord(raw);
  const items = Array.isArray(src.dimensions) ? src.dimensions : [];
  const dimensions: ReadinessInput["dimensions"] = [];
  for (const item of items) {
    const d = asRecord(item);
    if (!isReadinessKey(d.key) || typeof d.score !== "number" || !Number.isFinite(d.score)) continue;
    dimensions.push({ key: d.key, score: d.score, note: typeof d.note === "string" ? d.note : "" });
  }
  const headline = typeof src.headline === "string" ? src.headline : "";
  const nextStep = typeof src.nextStep === "string" ? src.nextStep : "";
  if (dimensions.length === 0 && !headline) return undefined;
  return { headline, dimensions, nextStep };
}
