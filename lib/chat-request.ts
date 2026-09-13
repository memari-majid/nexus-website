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
 * Server-only (imports the tool set for its names).
 */

import { z } from "zod";
import {
  MAX_BODY_CHARS,
  MAX_CHARS_PER_ASSISTANT_TEXT_PART,
  MAX_CHARS_PER_TEXT_PART,
  MAX_CHARS_TOTAL,
  MAX_MESSAGES,
  MAX_PARTS_PER_MESSAGE,
} from "@/lib/chat-limits";
import { chatTools, type NexusUIMessage } from "@/lib/chat-tools";

export const TOO_LONG = "This conversation is getting long. Tap New to start a fresh chat.";
export const INVALID = "Invalid request body.";

/** Model-facing reason on a stale, unanswered approval. */
export const STALE_APPROVAL_REASON =
  "The visitor moved on without answering the on-screen approval, so nothing was sent. Do not call this tool again unless they ask.";
/** Model-facing error on an approval that was granted but never executed. */
export const INTERRUPTED_APPROVAL_TEXT =
  "Approved on screen, but that request was interrupted before the send ran, so nothing was sent. Offer to try again only if the visitor asks.";

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

export const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES * 4),
  /** Picker choice; validated by `resolveModel`, not `z.enum`, so an unknown id falls back. */
  model: z.string().max(64).optional(),
});

type LooseMessage = z.infer<typeof messageSchema>;
type LoosePart = z.infer<typeof loosePartSchema>;

/* ---------- Sanitizing ---------- */

type Approval = { id: string; approved?: boolean; reason?: string };
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

export type SanitizedTranscript =
  | {
      ok: true;
      messages: NexusUIMessage[];
      /** Visitor and assistant text, the number the conversation cap applies to. */
      textChars: number;
      /** Echoed tool inputs, outputs, and error text, counted toward the precharge only. */
      toolChars: number;
    }
  | { ok: false; error: "user-text-too-long" };

const jsonLength = (v: unknown): number => (v === undefined ? 0 : JSON.stringify(v).length);

function sanitizeToolPart(raw: LoosePart, isLastMessage: boolean): ToolPart | null {
  if (!raw.type.startsWith("tool-") || !TOOL_NAMES.has(raw.type.slice("tool-".length))) return null;
  const parsed = toolPartSchema.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;
  // Mirrors `ignoreIncompleteToolCalls`; a call with no input is not a call.
  if (p.state === "input-streaming" || p.state === "input-available" || p.input === undefined) {
    return null;
  }
  const head = { type: p.type as `tool-${string}`, toolCallId: p.toolCallId, input: p.input };
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
        return {
          ...head,
          state: "approval-responded",
          approval: { id, approved: p.approval.approved, ...(reason ? { reason } : {}) },
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

function sanitizeAssistantPart(raw: LoosePart, isLastMessage: boolean): SanitizedPart | null {
  if (raw.type === "text") {
    if (typeof raw.text !== "string") return null;
    // Trimmed, not rejected: one long reply must not lock the visitor out.
    return { type: "text", text: raw.text.slice(0, MAX_CHARS_PER_ASSISTANT_TEXT_PART) };
  }
  if (raw.type === "step-start") return { type: "step-start" };
  return sanitizeToolPart(raw, isLastMessage);
}

/**
 * Rebuilds every message from whitelisted parts. Messages left with no parts
 * are dropped (a user turn that only carried a file part, say).
 */
export function sanitizeTranscript(messages: readonly LooseMessage[]): SanitizedTranscript {
  const out: { id?: string; role: "user" | "assistant"; parts: SanitizedPart[] }[] = [];
  let textChars = 0;
  let toolChars = 0;
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const isLastMessage = index === messages.length - 1;
    const parts: SanitizedPart[] = [];
    for (const raw of message.parts) {
      const part =
        message.role === "user" ? sanitizeUserPart(raw) : sanitizeAssistantPart(raw, isLastMessage);
      if (part === "too-long") return { ok: false, error: "user-text-too-long" };
      if (!part) continue;
      if (part.type === "text") textChars += part.text.length;
      else if (part.type !== "step-start") {
        toolChars += jsonLength(part.input) + jsonLength(part.output) + (part.errorText?.length ?? 0);
      }
      parts.push(part);
    }
    if (parts.length > 0) out.push({ ...(message.id ? { id: message.id } : {}), role: message.role, parts });
  }
  return { ok: true, messages: out as unknown as NexusUIMessage[], textChars, toolChars };
}

/* ---------- Body ---------- */

export type ParsedChatBody =
  | {
      ok: true;
      messages: NexusUIMessage[];
      model?: string;
      textChars: number;
      /** Text plus echoed tool payloads: what the precharge estimates from. */
      prechargeChars: number;
    }
  | { ok: false; status: 400 | 413; error: string };

/** Everything between `req.text()` and `convertToModelMessages`, in order of cost. */
export function parseChatBody(rawText: string): ParsedChatBody {
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
  const transcript = sanitizeTranscript(parsed.data.messages);
  if (!transcript.ok) return { ok: false, status: 400, error: INVALID };
  if (transcript.messages.length === 0) return { ok: false, status: 400, error: INVALID };
  if (transcript.textChars > MAX_CHARS_TOTAL) return { ok: false, status: 413, error: TOO_LONG };
  return {
    ok: true,
    messages: transcript.messages,
    ...(parsed.data.model ? { model: parsed.data.model } : {}),
    textChars: transcript.textChars,
    prechargeChars: transcript.textChars + transcript.toolChars,
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
