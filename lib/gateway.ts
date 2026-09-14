/**
 * Provider options for every gateway call this site makes.
 *
 * Two things ride on it. The tags, which every route already sent, so gateway
 * spend can be filtered by site and feature. And the provider order for
 * Anthropic models, which is load-bearing for cost.
 *
 * Measured 2026-09-13 on the personal site, on this same gateway: with no
 * order set, the gateway resolved an Anthropic model to `vertexAnthropic`, and
 * three sequential calls five seconds apart, each with the same `cacheControl`
 * system message, all came back as a full cache write (0 read). Through that
 * site's chat route it showed as 9 of 34 requests in one session paying the
 * cache write instead of the read, five times the price of a warm turn. With
 * `order: ["anthropic"]` the same three calls read the cache from the second
 * one on. Anthropic direct keeps one cache; the Vertex route does not reliably
 * serve one back. This site's prompt is about 14k tokens on a cold turn, so
 * the same miss costs more here. The other providers stay as fallbacks, so
 * availability is unchanged: only the first choice moves.
 *
 * Same export and contract as the personal site's `lib/gateway.ts`; the tags
 * are this site's own.
 *
 * Server-only: reads `VERCEL_ENV` per call.
 */

import type { ChatModel } from "@/lib/chat-models";

export type GatewayFeature = "chat" | "contact-classify";

/** First choice per vendor. Only Anthropic needs one; the rest keep the gateway's own order. */
const PROVIDER_ORDER: Partial<Record<ChatModel["vendor"], readonly string[]>> = {
  Anthropic: ["anthropic"],
};

/**
 * The `providerOptions.gateway` block for one call. `model` is optional
 * because the contact classifier is not the chat model and has no vendor; it
 * then gets tags only.
 */
export function gatewayProviderOptions(feature: GatewayFeature, model?: ChatModel) {
  const order = model ? PROVIDER_ORDER[model.vendor] : undefined;
  return {
    gateway: {
      tags: ["site:nexus", `feature:${feature}`, `env:${process.env.VERCEL_ENV ?? "dev"}`],
      ...(order ? { order: [...order] } : {}),
    },
  };
}
