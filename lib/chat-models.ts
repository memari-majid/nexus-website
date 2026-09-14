/**
 * The chat model and its gateway list prices.
 *
 * One table feeds the route (billing and budget) and the contact classifier's
 * price lookup, so the numbers can never disagree. Prices are Vercel AI
 * Gateway list prices in dollars per one million tokens, read from the gateway
 * on 2026-09-13. Update here only.
 *
 * One entry, on purpose (owner decision, 2026-09-13): the chat runs on one
 * model and visitors are not offered a choice. A model id a client sends is
 * ignored by the route, so nothing outside this file can route a request to an
 * unpriced model.
 *
 * Client-safe: no React, no `ai` runtime import, no `process.env` reads.
 */

export type ChatModel = {
  /** Gateway slug, passed straight to `gateway(id)`. The dot is the real slug. */
  id: string;
  /** Short label for logs and owner-facing docs. */
  label: string;
  vendor: "Anthropic" | "OpenAI" | "Google";
  /** Whether the route marks the system prompt for provider prompt caching. */
  promptCache: boolean;
  /** $ per 1M uncached input tokens. */
  inputPerM: number;
  /** $ per 1M output tokens (reasoning tokens bill as output). */
  outputPerM: number;
  /** $ per 1M prompt-cache read tokens. */
  cacheReadPerM: number;
  /** $ per 1M prompt-cache write tokens. */
  cacheWritePerM: number;
};

export const DEFAULT_MODEL_ID = "anthropic/claude-haiku-4.5";
/**
 * Where traffic goes once the global soft budget is spent. The same model as
 * the default, so the soft budget is a no-op and only the hard budget acts.
 */
export const FALLBACK_MODEL_ID = DEFAULT_MODEL_ID;

export const CHAT_MODELS: readonly ChatModel[] = [
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    vendor: "Anthropic",
    promptCache: true,
    inputPerM: 1,
    outputPerM: 5,
    cacheReadPerM: 0.1,
    cacheWritePerM: 1.25,
  },
];

export function findModel(id: unknown): ChatModel | undefined {
  if (typeof id !== "string") return undefined;
  return CHAT_MODELS.find((m) => m.id === id);
}

/**
 * Resolves an env-supplied model id to a known model. Anything outside the
 * allowlist falls back, so a stray setting can never route to an unpriced
 * model.
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
