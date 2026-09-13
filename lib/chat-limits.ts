/**
 * Every knob that costs money, in one owner-tunable file.
 *
 * Budgets are in dollars, not tokens, so cached prompt reads (a tenth of the
 * input price on Anthropic) and cheaper picker models are charged for what
 * they cost. At the Opus input price ($5 per 1M) the daily budgets map to
 * the original token targets: 600k tokens = $3.00 soft, 2M tokens = $10.00
 * hard. The per-IP allowance is $1.00 rather than the 60k-token equivalent
 * ($0.30) because cached reads count at a tenth and a whole company behind
 * one NAT shares the bucket.
 *
 * Client-safe: constants and pure functions only.
 */

import type { ChatModel } from "@/lib/chat-models";

/** Requests per minute from one client IP before a 429. */
export const PER_IP_REQUESTS_PER_MINUTE = 20;
/** Model spend one client IP may cause per UTC day. */
export const PER_IP_DAILY_USD = 1.0;
/** Above this, all traffic routes to the fallback model for the rest of the day. */
export const GLOBAL_SOFT_DAILY_USD = 3.0;
/** Above this, chat answers with a polite unavailable message until midnight UTC. */
export const GLOBAL_HARD_DAILY_USD = 10.0;

/** Visitor-addressed emails (brief, one-pager) one IP may trigger per day. */
export const PER_IP_EMAILS_PER_DAY = 3;
/** Visitor-addressed emails the whole site may send per day. */
export const GLOBAL_EMAILS_PER_DAY = 40;
/** Hand-offs to the founder inbox one IP may file per day (a company shares a NAT). */
export const PER_IP_HANDOFFS_PER_DAY = 10;
/** Hand-offs the whole site may file per day. */
export const GLOBAL_HANDOFFS_PER_DAY = 100;

/** Model loop: brief + snapshot + reply fits with one spare step. */
export const MAX_STEPS = 5;
/** Bounds the reply; on thinking models it also bounds the reasoning before it. */
export const MAX_OUTPUT_TOKENS = 2_500;
/** The SDK aborts first so `onAbort` runs and accounting completes before Vercel kills the function. */
export const STREAM_TIMEOUT_MS = 150_000;
/** Vercel function ceiling for the chat route (also set in `vercel.json`). */
export const MAX_DURATION_SECONDS = 180;

/** Raw request text. Echoed tool parts are 4 to 6k characters each. */
export const MAX_BODY_CHARS = 60_000;
/** Visitor and assistant text across the whole conversation. */
export const MAX_CHARS_TOTAL = 12_000;
/** One visitor text part. Assistant parts get the larger cap below. */
export const MAX_CHARS_PER_TEXT_PART = 4_000;
export const MAX_MESSAGES = 40;
export const MAX_PARTS_PER_MESSAGE = 50;

/** Rendered system prompt (about 4.7k tokens) plus tool schemas (about 1.4k), measured 2026-09-12. */
export const PROMPT_TOKENS_ESTIMATE = 6_000;
/** Typical reply plus one tool call. */
export const PRECHARGE_OUTPUT_TOKENS = 1_200;
export const CHARS_PER_TOKEN = 4;
/**
 * Assistant text parts are echoed back on every request. A reply is bounded
 * by `MAX_OUTPUT_TOKENS`, so this is about the longest one can legitimately
 * be. The route trims longer assistant parts instead of rejecting the body,
 * so one long answer can never lock a visitor out of the conversation.
 */
export const MAX_CHARS_PER_ASSISTANT_TEXT_PART = MAX_OUTPUT_TOKENS * CHARS_PER_TOKEN;

/**
 * Upstash REST call timeout. A store that hangs must not stall the chat: past
 * this the call throws and the limiter uses its in-memory fallback for it.
 */
export const STORE_TIMEOUT_MS = 1_500;

/**
 * What one request is charged before the model runs. The reservation is
 * settled against actual usage in `onFinish`; a step that reports no usage
 * stays charged at this estimate so nothing is ever free. Deliberately counts
 * the prompt at the uncached price so parallel requests at the edge of a cap
 * are refused rather than admitted.
 */
export function prechargeUsd(model: ChatModel, conversationChars: number): number {
  const inputTokens =
    PROMPT_TOKENS_ESTIMATE + Math.max(0, Math.ceil(conversationChars / CHARS_PER_TOKEN));
  const usd =
    (inputTokens * model.inputPerM + PRECHARGE_OUTPUT_TOKENS * model.outputPerM) / 1_000_000;
  return Math.max(usd, 0.0001);
}
