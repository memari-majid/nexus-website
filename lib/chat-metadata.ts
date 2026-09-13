/**
 * Per-reply stats the route streams to the widget as message metadata, plus
 * the token and cost math both sides share.
 *
 * Client-safe: type-only `ai` import, zod for the client-side schema.
 */

import type { LanguageModelUsage } from "ai";
import { z } from "zod";
import type { ChatModel } from "@/lib/chat-models";

export type TokenBreakdown = {
  /** Uncached input tokens. */
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
  /** Reasoning tokens, already included in `output` on every provider we use. */
  reasoning: number;
  total: number;
};

export const EMPTY_TOKENS: TokenBreakdown = {
  input: 0,
  cacheRead: 0,
  cacheWrite: 0,
  output: 0,
  reasoning: 0,
  total: 0,
};

const num = (n: number | undefined | null): number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;

/**
 * Normalizes SDK usage into the numbers cost needs. Prefers the detailed
 * fields; the flat `cachedInputTokens` / `reasoningTokens` are deprecated
 * aliases kept as fallbacks. When `noCacheTokens` is present, `input` is
 * reconstructed from the details, so cost is right whether or not a provider's
 * `inputTokens` includes the cached tokens.
 */
export function tokenBreakdown(usage: Partial<LanguageModelUsage> | undefined): TokenBreakdown {
  if (!usage) return EMPTY_TOKENS;
  const details = usage.inputTokenDetails;
  const cacheRead = num(details?.cacheReadTokens ?? usage.cachedInputTokens);
  const cacheWrite = num(details?.cacheWriteTokens);
  const noCache = details?.noCacheTokens;
  const input =
    typeof noCache === "number" && Number.isFinite(noCache)
      ? num(noCache)
      : Math.max(0, num(usage.inputTokens) - cacheRead);
  const output = num(usage.outputTokens);
  const reasoning = num(usage.outputTokenDetails?.reasoningTokens ?? usage.reasoningTokens);
  const total = num(usage.totalTokens) || input + cacheRead + cacheWrite + output;
  return { input, cacheRead, cacheWrite, output, reasoning, total };
}

/** Dollars for one breakdown at one model's list prices. */
export function costUsd(model: ChatModel, t: TokenBreakdown): number {
  return (
    (t.input * model.inputPerM +
      t.cacheRead * model.cacheReadPerM +
      t.cacheWrite * model.cacheWritePerM +
      t.output * model.outputPerM) /
    1_000_000
  );
}

export function addTokens(a: TokenBreakdown, b: TokenBreakdown): TokenBreakdown {
  return {
    input: a.input + b.input,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
    output: a.output + b.output,
    reasoning: a.reasoning + b.reasoning,
    total: a.total + b.total,
  };
}

/**
 * What a request is billed against the budgets: the sum of each step's cost,
 * with any step that reported no usage charged at the precharge estimate.
 * A request that produced no steps at all is charged the estimate too.
 */
export function billedUsd(
  model: ChatModel,
  stepUsages: readonly (Partial<LanguageModelUsage> | undefined)[],
  precharge: number,
): number {
  if (stepUsages.length === 0) return precharge;
  return stepUsages.reduce((sum, usage) => {
    const t = tokenBreakdown(usage);
    return sum + (t.total > 0 ? costUsd(model, t) : precharge);
  }, 0);
}

/**
 * What an aborted request (visitor stop or the stream timeout) is billed: every
 * completed step at its real cost, plus the step that was in flight at the
 * estimate, since the provider had already consumed its prompt. With no
 * completed steps that is the estimate alone, the same as `billedUsd`.
 */
export function abortedBilledUsd(
  model: ChatModel,
  stepUsages: readonly (Partial<LanguageModelUsage> | undefined)[],
  precharge: number,
): number {
  if (stepUsages.length === 0) return precharge;
  return billedUsd(model, stepUsages, precharge) + precharge;
}

export const tokenBreakdownSchema = z.object({
  input: z.number(),
  cacheRead: z.number(),
  cacheWrite: z.number(),
  output: z.number(),
  reasoning: z.number(),
  total: z.number(),
});

/**
 * Streamed in pieces and merged on the client: `model`, `budgetFallback`, and
 * `emailEnabled` on start, `ttftMs` with the first text delta, the rest on
 * finish.
 */
export const chatMessageMetadataSchema = z.object({
  model: z.string().optional(),
  modelLabel: z.string().optional(),
  /** True when the global soft budget routed this reply to the fallback model. */
  budgetFallback: z.boolean().optional(),
  /**
   * False when outgoing email is not configured on the site, so the widget can
   * pick chips that do not invite an email (`AFTER_BRIEF_CHIPS_NO_EMAIL`).
   */
  emailEnabled: z.boolean().optional(),
  /** Time to first visible text token, milliseconds from request start. */
  ttftMs: z.number().optional(),
  /** Request start to stream finish, milliseconds. */
  totalMs: z.number().optional(),
  tokens: tokenBreakdownSchema.optional(),
  costUsd: z.number().optional(),
  steps: z.number().optional(),
  toolCalls: z.number().optional(),
  finishReason: z.string().optional(),
});

export type ChatMessageMetadata = z.infer<typeof chatMessageMetadataSchema>;
