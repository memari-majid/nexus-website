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

export type Rates = { inputPerM: number; outputPerM: number };

/**
 * Rates assumed when nothing prices the slug in `CONTACT_CLASSIFY_MODEL`: it is
 * not on the chat allowlist, not in the table below, and no env override names
 * a price. They match the most expensive model on the allowlist (Opus 5), so an
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
 * They need their own table because `CHAT_MODELS` is the picker's allowlist,
 * not a price list: the classifier is deliberately a model no visitor can
 * select, so `findModel` returns nothing for it and there is no published price
 * to settle against.
 *
 * Both sites carry the same two rows so the tables diff by eye, and each site's
 * own default is one of them. Recorded on 2026-09-13 from the gateway's
 * published list prices. Recheck them when the gateway reprices; the env
 * override exists so that is not a deploy.
 *
 * A slug that neither this table nor the picker prices is both reserved and
 * settled at `UNPRICED_MODEL_RATES`. Correct it with `CONTACT_CLASSIFY_RATES`
 * in the environment rather than leaving it to that fallback.
 */
export const CONTACT_CLASSIFY_RATES: Readonly<Record<string, Rates | undefined>> = {
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
 *    a price in the environment means that price, even for a slug the picker
 *    also prices, so this wins rather than being silently ignored.
 * 2. The allowlisted model's own published price, when the classifier happens
 *    to be a model the picker offers.
 * 3. `UNPRICED_MODEL_RATES`, the answer for a slug nothing prices.
 *
 * Which branch each site's default takes, because the two differ and it is easy
 * to assume otherwise: the personal site's default (`openai/gpt-oss-20b`) and
 * this site's default (`anthropic/claude-haiku-4-5`) BOTH take branch 1, from
 * the table above. Neither slug is on its site's picker allowlist. This site's
 * `CHAT_MODELS` is Opus 5, Sonnet 5, GPT-5.6 Sol and Gemini 3.8 Flash, with no
 * Haiku row, so `findModel("anthropic/claude-haiku-4-5")` is undefined here and
 * branch 2 never fires for the default. Branch 2 exists for the operator who
 * points `CONTACT_CLASSIFY_MODEL` at a picker model; delete the table row for
 * the default and it falls to branch 3, which prices Haiku at five times its
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

/* ---------- Live evaluation run (`app/api/evals/run/route.ts`) ---------- */

/**
 * The evaluations panel can run a real, scored comparison on demand. It is the
 * most expensive thing a visitor can trigger, so it is fenced four ways: a
 * counted cap of one run per visitor per UTC day, its own sub-budget inside
 * the global soft budget, the same `reserveBudget` call every chat request
 * makes (that one call is the only global hard cap there is), and two bounded
 * legs that cannot add up to the function ceiling.
 */

/**
 * Live runs one client IP may start per UTC day. Enforced by a counter in the
 * limiter (`reserveEvalRun`), taken before any model is called: a run that
 * fails, times out, or is abandoned still counts, because it still spent. The
 * run cache (`rememberRun` / `recallRun`) sits in front of the counter and
 * gives a repeat of the SAME pair that day its own earlier result instead of a
 * refusal. It is keyed on the challenger as well as the visitor and the day, so
 * it never answers a pair that was not run; the counter is the cap. Raising
 * this number raises the most expensive thing a visitor can trigger:
 * `GLOBAL_EVAL_USD_PER_DAY` divided by
 * `evalPrechargeUsd` is the number of runs the day can afford in total.
 */
export const EVAL_RUNS_PER_IP_PER_DAY = 1;
/**
 * Model spend live evaluation runs may cause per UTC day, across all visitors.
 * Sits INSIDE `GLOBAL_SOFT_DAILY_USD`: every run also reserves against the
 * ordinary day counters, so this only narrows the share evals may take.
 */
export const GLOBAL_EVAL_USD_PER_DAY = 1.0;
/** One turn, not the two the published bake-off used. Keeps a run near a cent. */
export const EVAL_MAX_OUTPUT_TOKENS = 600;
/**
 * The judge writes five scores and one line of rationale, which is about 120
 * tokens of text. The cap is far above that because a reasoning model spends
 * this same budget thinking first: measured on `google/gemini-3.8-flash`, the
 * default judge, one verdict took 619 reasoning tokens and left 66 for the
 * answer, so the object came back truncated and the score was lost. That is
 * how the published table came back unscored and how a visitor's live run
 * would have reported "the judge did not return a score this time" nearly
 * every time, since both read this constant. Raise it before lowering it, and
 * remember it also sets the judge's share of `evalPrechargeUsd`.
 */
export const EVAL_JUDGE_MAX_OUTPUT_TOKENS = 1_500;
/** Both contestants run in parallel inside this leg. */
export const EVAL_CONTESTANT_TIMEOUT_MS = 40_000;
/** The judge leg. 40 + 30 leaves headroom under `EVAL_MAX_DURATION_SECONDS`. */
export const EVAL_JUDGE_TIMEOUT_MS = 30_000;
/** Vercel function ceiling for the eval route (also set in `vercel.json`). */
export const EVAL_MAX_DURATION_SECONDS = 120;
/** Raw request text for the eval route: a model id and nothing else. */
export const EVAL_MAX_BODY_CHARS = 2_000;
/** Rendered eval prompt plus the one scenario turn, measured the same way as the chat estimate. */
export const EVAL_PROMPT_TOKENS_ESTIMATE = 6_000;
/** The judge reads both replies, so its prompt is the scenario plus two answers. */
export const EVAL_JUDGE_PROMPT_TOKENS_ESTIMATE = 8_000;

/**
 * Default judge: the cheapest seat at the table, and the one model that is
 * never the production default, so scoring a run costs a fraction of running
 * it. A model must not judge itself, so when a visitor picks the judge as a
 * contestant the route swaps to `EVAL_JUDGE_ALT_MODEL_ID`.
 */
export const EVAL_JUDGE_MODEL_ID = "google/gemini-3.8-flash";
export const EVAL_JUDGE_ALT_MODEL_ID = "anthropic/claude-sonnet-5";

/**
 * What one live run is charged before it starts: both contestants at one turn
 * each, plus the judge reading both replies. Settled against actual usage when
 * the run finishes, exactly like a chat request.
 */
export function evalPrechargeUsd(
  contestants: readonly ChatModel[],
  judge: ChatModel,
): number {
  const perContestant = contestants.reduce(
    (sum, model) =>
      sum +
      (EVAL_PROMPT_TOKENS_ESTIMATE * model.inputPerM +
        EVAL_MAX_OUTPUT_TOKENS * model.outputPerM) /
        1_000_000,
    0,
  );
  const judged =
    (EVAL_JUDGE_PROMPT_TOKENS_ESTIMATE * judge.inputPerM +
      EVAL_JUDGE_MAX_OUTPUT_TOKENS * judge.outputPerM) /
    1_000_000;
  return Math.max(perContestant + judged, 0.0001);
}
