/**
 * The token and cost math the chat route bills with, plus the one piece of
 * message metadata the route still streams to the widget.
 *
 * Nothing about cost, tokens, model, or latency reaches the client (owner
 * decision, 2026-09-13): those numbers go to the server's `chat.usage` log
 * line only. The widget receives `emailEnabled`, which it needs to pick chips
 * that do not invite an email while outgoing email is off.
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

/**
 * Streamed on the `start` part and merged on the client. This is the whole of
 * what a reply carries about the server: nothing about the model, the tokens,
 * the cost, or the time it took.
 */
export const chatMessageMetadataSchema = z.object({
  /**
   * False when outgoing email is not configured on the site, so the widget can
   * pick chips that do not invite an email (`AFTER_BRIEF_CHIPS_NO_EMAIL`).
   */
  emailEnabled: z.boolean().optional(),
});

export type ChatMessageMetadata = z.infer<typeof chatMessageMetadataSchema>;
