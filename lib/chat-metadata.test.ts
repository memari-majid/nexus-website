import { describe, expect, it } from "vitest";
import {
  EMPTY_TOKENS,
  abortedBilledUsd,
  billedUsd,
  chatMessageMetadataSchema,
  costUsd,
  tokenBreakdown,
} from "@/lib/chat-metadata";
import { defaultModel } from "@/lib/chat-models";

const haiku = defaultModel();

describe("tokenBreakdown", () => {
  it("reconstructs uncached input from the details when noCacheTokens is present", () => {
    const t = tokenBreakdown({
      inputTokens: 5_000, // provider counts cached tokens in the total
      inputTokenDetails: { noCacheTokens: 500, cacheReadTokens: 4_500, cacheWriteTokens: 0 },
      outputTokens: 300,
      outputTokenDetails: { textTokens: 250, reasoningTokens: 50 },
      totalTokens: 5_300,
    });
    expect(t).toEqual({ input: 500, cacheRead: 4_500, cacheWrite: 0, output: 300, reasoning: 50, total: 5_300 });
  });

  it("subtracts cached reads from inputTokens when the details are missing", () => {
    const t = tokenBreakdown({
      inputTokens: 5_000,
      cachedInputTokens: 4_500, // deprecated alias
      outputTokens: 100,
      reasoningTokens: 20, // deprecated alias
    });
    expect(t.input).toBe(500);
    expect(t.cacheRead).toBe(4_500);
    expect(t.reasoning).toBe(20);
    expect(t.total).toBe(5_100);
  });

  it("never goes negative or NaN on odd provider numbers", () => {
    const t = tokenBreakdown({ inputTokens: 100, cachedInputTokens: 400, outputTokens: undefined });
    expect(t.input).toBe(0);
    expect(t.output).toBe(0);
    expect(Number.isFinite(t.total)).toBe(true);
    expect(tokenBreakdown(undefined)).toEqual(EMPTY_TOKENS);
  });
});

describe("costUsd", () => {
  it("bills cached reads at a tenth of the input price", () => {
    const cached = costUsd(haiku, { ...EMPTY_TOKENS, cacheRead: 1_000_000, total: 1_000_000 });
    const fresh = costUsd(haiku, { ...EMPTY_TOKENS, input: 1_000_000, total: 1_000_000 });
    expect(fresh).toBeCloseTo(1, 6);
    expect(cached).toBeCloseTo(0.1, 6);
  });

  it("bills cache writes at a quarter over the input price", () => {
    expect(costUsd(haiku, { ...EMPTY_TOKENS, cacheWrite: 1_000_000, total: 1_000_000 })).toBeCloseTo(1.25, 6);
  });

  it("bills output at the output price", () => {
    expect(costUsd(haiku, { ...EMPTY_TOKENS, output: 100_000, total: 100_000 })).toBeCloseTo(0.5, 6);
  });
});

describe("billedUsd", () => {
  const precharge = 0.05;

  it("charges a step with no reported usage at the precharge estimate, never free", () => {
    const billed = billedUsd(haiku, [{ inputTokens: 0, outputTokens: 0, totalTokens: 0 }], precharge);
    expect(billed).toBeCloseTo(precharge, 6);
  });

  it("charges the estimate when no step ran at all", () => {
    expect(billedUsd(haiku, [], precharge)).toBeCloseTo(precharge, 6);
  });

  it("sums real usage per step and only substitutes the estimate for empty steps", () => {
    const billed = billedUsd(
      haiku,
      [
        { inputTokens: 1_000, outputTokens: 100, totalTokens: 1_100 },
        { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      ],
      precharge,
    );
    const real = (1_000 * haiku.inputPerM + 100 * haiku.outputPerM) / 1e6;
    expect(billed).toBeCloseTo(real + precharge, 6);
  });
});

describe("abortedBilledUsd", () => {
  const precharge = 0.05;

  it("charges the estimate when the abort hit before any step completed", () => {
    expect(abortedBilledUsd(haiku, [], precharge)).toBeCloseTo(precharge, 6);
  });

  it("adds the interrupted step at the estimate on top of the completed steps", () => {
    const completed = [{ inputTokens: 1_000, outputTokens: 100, totalTokens: 1_100 }];
    const real = (1_000 * haiku.inputPerM + 100 * haiku.outputPerM) / 1e6;
    expect(abortedBilledUsd(haiku, completed, precharge)).toBeCloseTo(real + precharge, 6);
    expect(abortedBilledUsd(haiku, completed, precharge)).toBeGreaterThan(
      billedUsd(haiku, completed, precharge),
    );
  });
});

describe("chatMessageMetadataSchema", () => {
  it("accepts the email flag the route streams on start", () => {
    expect(chatMessageMetadataSchema.safeParse({ emailEnabled: false }).success).toBe(true);
    expect(chatMessageMetadataSchema.safeParse({}).success).toBe(true);
    expect(chatMessageMetadataSchema.safeParse({ emailEnabled: "no" }).success).toBe(false);
  });

  it("carries nothing about cost, tokens, model, or latency to the client", () => {
    // Unknown keys are stripped rather than rejected, so nothing can be read
    // back out of the parsed metadata even if a stray field were streamed.
    const parsed = chatMessageMetadataSchema.safeParse({
      emailEnabled: true,
      model: "anthropic/claude-haiku-4.5",
      costUsd: 0.01,
      tokens: EMPTY_TOKENS,
      ttftMs: 100,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(Object.keys(parsed.data)).toEqual(["emailEnabled"]);
  });
});
