/**
 * Server-verified authorization for everything the chat transcript can ask
 * the server to send.
 *
 * The transcript is client-supplied. Before this module a request could carry
 * an `approval-responded` tool part for a call the model never made, with a
 * self-chosen id and an attacker-chosen input, and the SDK executed it: the
 * only thing that kept a forged hand-off inert was that email was not
 * configured. Two signatures close that:
 *
 * 1. Approvals. `streamText` takes `experimental_toolApprovalSecret` and signs
 *    every approval request it emits (HMAC-SHA256 over the approval id, the
 *    tool call id, the tool name and a digest of the input). The widget echoes
 *    the signature back with the visitor's answer and the SDK refuses to run
 *    an approval whose signature is missing or wrong. `verifyApproval` is the
 *    same scheme, implemented here so the request sanitizer can refuse a forged
 *    approval BEFORE any budget is reserved or a model is called, with a reason
 *    the model can act on instead of a stream error. `lib/chat-request.test.ts`
 *    checks this implementation against a signature the real SDK issued, so a
 *    change to the SDK's scheme fails the suite rather than a visitor's send.
 *
 * 2. Drafts. The brief and the note are tool INPUTS the model wrote, re-read
 *    from history by the send tools (`findBrief`, `findOutreachNote`). A
 *    forged transcript could plant one the model never drafted. Each draft
 *    tool's `execute` now signs its own input into its output (`signDraft`),
 *    and the sanitizer keeps a draft part only when that signature verifies.
 *    The scheme is this module's own and never meets the SDK.
 *
 * The secret: `CHAT_APPROVAL_SECRET` from the environment. Without it, the key
 * is derived from `RESEND_API_KEY` when that is set, so switching email on
 * never switches signing off, and otherwise a per-process random key with one
 * warning: approvals then verify only on the instance that issued them, which
 * is the accepted degradation while nothing can be sent anyway.
 *
 * Server-only (node:crypto). Never import from a client component.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** The environment variable that carries the signing secret. Same name in both repos. */
export const APPROVAL_SECRET_ENV = "CHAT_APPROVAL_SECRET";

/** Bound so a crafted part cannot carry a megabyte of "signature" through the parser. */
export const MAX_SIGNATURE_CHARS = 128;

/**
 * Sorted-key JSON, so two encodings of the same input hash the same. Mirrors
 * the SDK's canonicalization exactly: primitives through `JSON.stringify`,
 * arrays in order, object keys sorted, and an `undefined` value rendered by
 * the template as the word undefined, as the SDK's template renders it.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
  return `{${entries.join(",")}}`;
}

const base64url = (bytes: Buffer): string =>
  bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const inputDigest = (input: unknown): string =>
  base64url(createHash("sha256").update(canonicalJson(input)).digest());

const hmac = (secret: string, payload: string): string =>
  base64url(createHmac("sha256", secret).update(payload).digest());

/** Constant-time equality on two base64url strings; false on any length mismatch. */
function sameSignature(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type ApprovalSignatureInput = {
  secret: string;
  approvalId: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
};

/**
 * The SDK's approval signature, byte for byte: `approvalId`, `toolCallId`,
 * `toolName` and the base64url SHA-256 of the canonical input, newline
 * separated, under HMAC-SHA256 with the secret.
 */
export function signApproval(args: ApprovalSignatureInput): string {
  const payload = `${args.approvalId}\n${args.toolCallId}\n${args.toolName}\n${inputDigest(args.input)}`;
  return hmac(args.secret, payload);
}

/** True only for a signature the same secret issued over the same call and input. */
export function verifyApproval(args: ApprovalSignatureInput & { signature: unknown }): boolean {
  if (typeof args.signature !== "string" || !args.signature || args.signature.length > MAX_SIGNATURE_CHARS) {
    return false;
  }
  return sameSignature(signApproval(args), args.signature);
}

export type DraftSignatureInput = {
  secret: string;
  toolCallId: string;
  toolName: string;
  input: unknown;
};

/**
 * The draft scheme signs under its own key, derived from the secret, rather
 * than under a label inside the payload: an approval id is a client-supplied
 * string, so any label could be echoed as one and a draft signature replayed
 * as an approval over the same call. A separate key makes the two spaces
 * disjoint whatever the ids say.
 */
const draftKey = (secret: string): Buffer =>
  createHash("sha256").update(`chat-draft:${secret}`).digest();

/**
 * This site's own signature over a draft the model wrote: the tool call id,
 * the tool name and the canonical input, under the draft key.
 */
export function signDraft(args: DraftSignatureInput): string {
  const payload = `${args.toolCallId}\n${args.toolName}\n${inputDigest(args.input)}`;
  return base64url(createHmac("sha256", draftKey(args.secret)).update(payload).digest());
}

export function verifyDraft(args: DraftSignatureInput & { signature: unknown }): boolean {
  if (typeof args.signature !== "string" || !args.signature || args.signature.length > MAX_SIGNATURE_CHARS) {
    return false;
  }
  return sameSignature(signDraft(args), args.signature);
}

let processSecret: string | undefined;

/**
 * The signing secret, resolved once per process. Order: the environment, a key
 * derived from `RESEND_API_KEY` (hashed with a label, never the key itself),
 * then a random per-process key with one warning.
 */
export function approvalSecret(): string {
  const configured = process.env[APPROVAL_SECRET_ENV]?.trim();
  if (configured) return configured;
  const resend = process.env.RESEND_API_KEY?.trim();
  if (resend) return createHash("sha256").update(`chat-approval:${resend}`).digest("hex");
  if (!processSecret) {
    processSecret = randomBytes(32).toString("hex");
    console.warn(
      `[chat] ${APPROVAL_SECRET_ENV} is not set; approvals are signed with a per-instance key and verify only on the instance that issued them. Set it before enabling email.`,
    );
  }
  return processSecret;
}
