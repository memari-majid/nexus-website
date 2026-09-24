/**
 * Every knob that costs money, in one owner-tunable file.
 *
 * Budgets are in dollars, not tokens, so cached prompt reads (a tenth of the
 * input price on Anthropic) are charged for what they cost. The dollar
 * figures were set when the chat ran a dearer model and are kept as they
 * were: on Claude Haiku 4.5 they buy several times the conversations they
 * did, and the hard budget is still the ceiling. The per-IP allowance is
 * $1.00 because cached reads count at a tenth and a whole company behind one
 * NAT shares the bucket.
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

/** Model loop: a lookup, a brief, a snapshot, and the reply fit with one spare step. */
export const MAX_STEPS = 6;
/** Bounds the reply; on thinking models it also bounds the reasoning before it. */
export const MAX_OUTPUT_TOKENS = 2_500;
/** The SDK aborts first so `onAbort` runs and accounting completes before Vercel kills the function. */
export const STREAM_TIMEOUT_MS = 150_000;
/** Vercel function ceiling for the chat route (also set in `vercel.json`). */
export const MAX_DURATION_SECONDS = 180;

/**
 * Raw request text. Echoed tool parts are 4 to 6k characters each, and the
 * ten-tool set can produce a 3.5k `estimateProject` input and a 1.5k outreach
 * draft in one conversation, so the raw cap is the looser of the two bounds
 * and `MAX_TOOL_CHARS_TOTAL` is the one that actually holds the line.
 */
export const MAX_BODY_CHARS = 96_000;
/**
 * Echoed tool inputs, outputs, and error text across the whole conversation.
 * Only `textChars` was ever checked against `MAX_CHARS_TOTAL`, so before this
 * cap existed tool payloads were bounded only by the raw body cap, and they
 * are billed on every turn. Over this, the route trims the OLDEST tool
 * outputs first (`lib/chat-request.ts`): the newest card a visitor is looking
 * at keeps its detail, and an old one degrades to a short marker the model can
 * still read.
 */
export const MAX_TOOL_CHARS_TOTAL = 24_000;
/** Visitor and assistant text across the whole conversation. */
export const MAX_CHARS_TOTAL = 12_000;
/** One visitor text part. Assistant parts get the larger cap below. */
export const MAX_CHARS_PER_TEXT_PART = 4_000;
export const MAX_MESSAGES = 40;
export const MAX_PARTS_PER_MESSAGE = 50;

/**
 * Rendered system prompt plus the ten tool schemas, as the gateway counts
 * them on a cold cache: 13,460 to 13,528 tokens written to the cache on
 * Anthropic models, measured 2026-09-13 on the first turn after a deploy.
 * Rounded up, because this is the number the per-IP cap refuses on: at the
 * old 6,000 a cold turn reserved well under what it billed, so a parallel
 * burst from one address walked past $1 before any request settled.
 */
export const PROMPT_TOKENS_ESTIMATE = 14_000;
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

/* ---------- Contact form classification (`lib/inquiry.ts`) ---------- */

/**
 * The contact form asks a model to sort one message into a category and write
 * the acknowledgment the visitor reads. It is small, but it is a model call
 * started by an anonymous visitor, so it goes through the same per-minute
 * limiter and the same daily budget as the chat: the global hard cap only
 * means something if every model call on the site passes through it.
 *
 * The same block exists in `../majidmemari/lib/chat-limits.ts` under the same
 * export names, in the same order, so the two files diff by eye (AGENTS.md
 * 9.2). Only the numbers each site owns may differ.
 */

/** Output tokens reserved for one classification; also the cap passed to the call. */
export const CONTACT_CLASSIFY_OUTPUT_TOKENS = 400;

/**
 * Message characters the classifier is allowed to read. The form accepts a
 * longer message and the team receives all of it; only the model call is
 * bounded, so a very long paste cannot turn one form submission into an
 * unbounded reservation against the daily budget.
 */
export const CONTACT_CLASSIFY_MESSAGE_CHARS = 4_000;

/** Name characters the classifier is allowed to read, for the same reason. */
export const CONTACT_CLASSIFY_NAME_CHARS = 120;

/** One classification is a single short call: it never needs longer than this. */
export const CONTACT_CLASSIFY_TIMEOUT_MS = 20_000;

/**
 * Consecutive failed classifications on one instance before the classifier
 * is paused, and for how long. A model that never returns a usable object
 * (measured 2026-09-13: `openai/gpt-oss-20b` answered 99 of 99 submissions
 * with text that fit no schema) would otherwise be paid for on every form
 * post while every visitor got the fixed acknowledgment anyway. While paused
 * the form still delivers with that acknowledgment and spends nothing, and the
 * pause is logged as its own `paused` outcome so a run of them reads as a
 * misconfigured model, not a quiet day. Per instance: a fresh instance tries
 * again, which is the retry.
 */
export const CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES = 5;
export const CONTACT_CLASSIFY_PAUSE_MS = 60 * 60 * 1000;

export type FailureBreaker = {
  /** True while the pause is in force: skip the call. */
  paused(): boolean;
  /** Records how a call ended. A success clears the count; a failure counts toward the trip. */
  record(ok: boolean): void;
};

/**
 * The pause above, as a pure object the metering wraps around the model call.
 * Trips after `trips` consecutive failures, stays tripped for `pauseMs`, and a
 * success at any point resets it. `now` is injectable so the tests need no
 * clock.
 */
export function createFailureBreaker(args: {
  trips?: number;
  pauseMs?: number;
  now?: () => number;
}): FailureBreaker {
  const trips = args.trips ?? CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES;
  const pauseMs = args.pauseMs ?? CONTACT_CLASSIFY_PAUSE_MS;
  const now = args.now ?? Date.now;
  let failures = 0;
  let pausedUntil = 0;
  return {
    paused: () => now() < pausedUntil,
    record: (ok) => {
      if (ok) {
        failures = 0;
        pausedUntil = 0;
        return;
      }
      failures += 1;
      if (failures >= trips) {
        pausedUntil = now() + pauseMs;
        failures = 0;
      }
    },
  };
}

export type Rates = { inputPerM: number; outputPerM: number };

/**
 * Rates assumed when nothing prices the slug in `CONTACT_CLASSIFY_MODEL`: it is
 * not on the chat allowlist, not in the table below, and no env override names
 * a price. They are Opus-class rates, the dearest tier the gateway lists, so an
 * unknown model over-reserves rather than under-reserving.
 *
 * The last resort, for both halves of the accounting. Using them for a slug
 * that is priced is the hole this group of functions exists to close. Settling
 * a known model here would never bring the reservation down toward the real
 * cost; reserving a known model here leaves the difference standing on any path
 * that does not settle at all. Either way an anonymous form post would hold
 * roughly a hundred times what it spends, a few hundred posts would walk one IP
 * through `PER_IP_DAILY_USD`, and a couple of thousand would walk the site
 * through `GLOBAL_HARD_DAILY_USD` and close the chat for everyone.
 */
export const UNPRICED_MODEL_RATES = { inputPerM: 5, outputPerM: 25 } as const;

/**
 * USD per 1M tokens for the classifier models, keyed by gateway slug.
 *
 * They need their own table because `CHAT_MODELS` is the chat's allowlist,
 * not a price list: the classifier is deliberately not the chat model, so
 * `findModel` returns nothing for it and there is no published price to settle
 * against.
 *
 * Both sites carry the same three rows so the tables diff by eye, and the
 * default on both, `openai/gpt-4.1-nano`, is the first of them. Recorded on
 * 2026-09-13 from the gateway's published list prices. Recheck them when the
 * gateway reprices; the env override exists so that is not a deploy.
 *
 * A slug that neither this table nor the chat allowlist prices is both reserved and
 * settled at `UNPRICED_MODEL_RATES`. Correct it with `CONTACT_CLASSIFY_RATES`
 * in the environment rather than leaving it to that fallback.
 */
export const CONTACT_CLASSIFY_RATES: Readonly<Record<string, Rates | undefined>> = {
  "openai/gpt-4.1-nano": { inputPerM: 0.1, outputPerM: 0.4 },
  "openai/gpt-oss-20b": { inputPerM: 0.04, outputPerM: 0.16 },
  "anthropic/claude-haiku-4-5": { inputPerM: 1, outputPerM: 5 },
};

/** The rates we assume for one classifier slug, or undefined when it is unknown. */
export function contactClassifyRates(modelId: string | undefined): Rates | undefined {
  const wanted = modelId?.trim();
  if (!wanted || !Object.hasOwn(CONTACT_CLASSIFY_RATES, wanted)) return undefined;
  return CONTACT_CLASSIFY_RATES[wanted];
}

/**
 * Parses an owner override of those rates, `"inputPerM,outputPerM"` in USD per
 * 1M tokens (for example `"1,5"`), so a price change or a new classifier slug
 * is an env edit rather than a deploy.
 *
 * Pure: the caller reads the environment. Anything malformed, negative,
 * non-finite, or free on both sides returns undefined, so a typo falls back to
 * the table and then to the pessimistic rates instead of settling a real call
 * at zero.
 *
 * `"0,0"` is the case worth naming: both halves parse as finite and
 * non-negative, so a guard that only checked those would accept them and price
 * every classification at exactly $0.00 while the caller's startup warning
 * stayed quiet, because rates had been returned. A free pair is not a price, it
 * is a typo, and a metered call that costs nothing is an unmetered call. One
 * side free is still a price and is kept.
 */
export function parseClassifyRates(raw: string | undefined): Rates | undefined {
  const parts = raw?.trim().split(",");
  if (!parts || parts.length !== 2) return undefined;
  const [rawInput, rawOutput] = parts.map((part) => part.trim());
  // `Number("")` is 0, so an empty field would otherwise read as a free side.
  if (!rawInput || !rawOutput) return undefined;
  const inputPerM = Number(rawInput);
  const outputPerM = Number(rawOutput);
  if (!Number.isFinite(inputPerM) || !Number.isFinite(outputPerM)) return undefined;
  if (inputPerM < 0 || outputPerM < 0) return undefined;
  if (inputPerM === 0 && outputPerM === 0) return undefined;
  return { inputPerM, outputPerM };
}

/**
 * The rates one classification is priced at, resolved once so the reservation,
 * the floor and the settle can never disagree about what the call costs.
 *
 * Order, most specific first:
 *
 * 1. `rates`, which only an explicit `CONTACT_CLASSIFY_RATES` env override or
 *    the `CONTACT_CLASSIFY_RATES` table above ever sets. An operator who writes
 *    a price in the environment means that price, even for a slug the chat
 *    allowlist also prices, so this wins rather than being silently ignored.
 * 2. The allowlisted model's own published price, when the classifier happens
 *    to be the chat model.
 * 3. `UNPRICED_MODEL_RATES`, the answer for a slug nothing prices.
 *
 * Which branch the default takes, because it is easy to assume otherwise: both
 * sites default to `openai/gpt-4.1-nano` (since 2026-09-13; before that this
 * site named `anthropic/claude-haiku-4-5`, a slug the gateway does not serve,
 * and the personal site `openai/gpt-oss-20b`, which never returned a usable
 * object), and it takes branch 1, from the table above. The slug is on neither
 * site's chat allowlist. This site's `CHAT_MODELS` is Claude Haiku 4.5 alone,
 * with no nano row, so `findModel("openai/gpt-4.1-nano")` is undefined here and
 * branch 2 never fires for the default. Branch 2 exists for the operator who
 * points `CONTACT_CLASSIFY_MODEL` at the chat model; delete the table row for
 * the default and it falls to branch 3, which prices nano at fifty times its
 * real rate rather than at nothing.
 */
export function contactClassifyResolvedRates(args: {
  model: ChatModel | undefined;
  rates?: Rates | undefined;
}): Rates {
  return args.rates ?? args.model ?? UNPRICED_MODEL_RATES;
}

/**
 * The least one classification can be allowed to cost the budget once the
 * prompt has been handed to the gateway: every input token the prompt sends,
 * plus the whole output cap, at the resolved rates.
 *
 * This is the failure path's settle. A failed call is not a free call. The
 * tokens are billed whether or not the object validated, and failure is not
 * only something the gateway does to us: the visitor controls
 * `CONTACT_CLASSIFY_MESSAGE_CHARS` of the prompt, and `generateObject` throws
 * when the object does not validate or when the JSON is truncated at
 * `CONTACT_CLASSIFY_OUTPUT_TOKENS`. Charging the ceiling of what that call
 * could have spent is what keeps a chosen failure from being cheaper than a
 * success, which is how the failure path becomes the cheap way through
 * `PER_IP_DAILY_USD` and then `GLOBAL_HARD_DAILY_USD`.
 */
export function contactClassifyFloorUsd(args: {
  model: ChatModel | undefined;
  rates?: Rates | undefined;
  promptChars: number;
}): number {
  const rates = contactClassifyResolvedRates(args);
  const inputTokens = Math.ceil(args.promptChars / CHARS_PER_TOKEN);
  const usd =
    (inputTokens * rates.inputPerM + CONTACT_CLASSIFY_OUTPUT_TOKENS * rates.outputPerM) / 1_000_000;
  return Math.max(Math.round(usd * 1_000_000) / 1_000_000, 0);
}

/**
 * What one classification will probably cost, reserved before the model runs.
 *
 * The same ceiling as the floor above, at the same rates, with a minimum so a
 * reservation is never rounded away to nothing. Pessimism belongs in the rates
 * for a slug nothing prices, not in the arithmetic: a priced slug reserved at
 * Opus rates holds about a hundred times what it spends, and any path that does
 * not settle, the failure path above all, keeps that difference.
 */
export function contactClassifyPrechargeUsd(args: {
  model: ChatModel | undefined;
  rates?: Rates | undefined;
  promptChars: number;
}): number {
  return Math.max(contactClassifyFloorUsd(args), 0.0001);
}

/**
 * What the classification cost: the real token counts the call reported, at the
 * rates we assume for that model.
 *
 * Not the real cost. The gateway hands back tokens, not a price, so this is a
 * measurement multiplied by an assumption, and the assumption is the caller's
 * to supply through `contactClassifyResolvedRates` above.
 */
export function contactClassifyCostUsd(args: {
  model: ChatModel | undefined;
  rates?: Rates | undefined;
  inputTokens: number;
  outputTokens: number;
}): number {
  const rates = contactClassifyResolvedRates(args);
  const usd =
    (args.inputTokens * rates.inputPerM + args.outputTokens * rates.outputPerM) / 1_000_000;
  return Math.max(Math.round(usd * 1_000_000) / 1_000_000, 0);
}
