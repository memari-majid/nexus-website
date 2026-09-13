/**
 * Visitor-selectable chat models and their gateway list prices.
 *
 * One table feeds the route (billing and budget), the widget (model picker and
 * per-reply stats), the how-it-works page, and the evals, so the numbers can
 * never disagree. Prices are Vercel AI Gateway list prices in dollars per one
 * million tokens, read from the gateway on 2026-09-12. Update here only.
 *
 * Client-safe: no React, no `ai` runtime import, no `process.env` reads.
 */

export type ChatModel = {
  /** Gateway slug, passed straight to `gateway(id)`. */
  id: string;
  /** Short label for the picker. */
  label: string;
  vendor: "Anthropic" | "OpenAI" | "Google";
  /** $ per 1M uncached input tokens. */
  inputPerM: number;
  /** $ per 1M output tokens (reasoning tokens bill as output). */
  outputPerM: number;
  /** $ per 1M prompt-cache read tokens. */
  cacheReadPerM: number;
  /** $ per 1M prompt-cache write tokens. */
  cacheWritePerM: number;
  /** One line for the picker tooltip and the page. */
  note: string;
};

export const DEFAULT_MODEL_ID = "anthropic/claude-opus-5";
/** Where traffic goes once the global soft budget is spent. */
export const FALLBACK_MODEL_ID = "anthropic/claude-sonnet-5";

export const CHAT_MODELS: readonly ChatModel[] = [
  {
    id: "anthropic/claude-opus-5",
    label: "Claude Opus 5",
    vendor: "Anthropic",
    inputPerM: 5,
    outputPerM: 25,
    cacheReadPerM: 0.5,
    cacheWritePerM: 6.25,
    note: "Default. The most human, most specific consulting answers in the bake-off.",
  },
  {
    id: "anthropic/claude-sonnet-5",
    label: "Claude Sonnet 5",
    vendor: "Anthropic",
    inputPerM: 2,
    outputPerM: 10,
    cacheReadPerM: 0.2,
    cacheWritePerM: 2.5,
    note: "Fastest to first token and nearly as good. The budget fallback.",
  },
  {
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    vendor: "OpenAI",
    inputPerM: 2,
    outputPerM: 10,
    cacheReadPerM: 0.2,
    cacheWritePerM: 2,
    note: "Correct and terse in the bake-off.",
  },
  {
    id: "google/gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    vendor: "Google",
    inputPerM: 0.75,
    outputPerM: 3.75,
    cacheReadPerM: 0.075,
    cacheWritePerM: 0.75,
    note: "Cheapest seat at the table.",
  },
];

export function findModel(id: unknown): ChatModel | undefined {
  if (typeof id !== "string") return undefined;
  return CHAT_MODELS.find((m) => m.id === id);
}

/**
 * Resolves a visitor-supplied (or env-supplied) model id to a known model.
 * Anything outside the allowlist falls back, so a crafted request can never
 * route to an unpriced model.
 */
export function resolveModel(id: unknown, fallback: ChatModel = defaultModel()): ChatModel {
  return findModel(id) ?? fallback;
}

export function defaultModel(): ChatModel {
  return CHAT_MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ?? CHAT_MODELS[0];
}

export function fallbackModel(): ChatModel {
  return CHAT_MODELS.find((m) => m.id === FALLBACK_MODEL_ID) ?? defaultModel();
}

/** `$0.0123` style, four decimals under a dollar, two above. */
export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "$0.0000";
  return usd < 1 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`;
}
