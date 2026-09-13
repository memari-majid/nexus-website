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

const opus = defaultModel();

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
    const cached = costUsd(opus, { ...EMPTY_TOKENS, cacheRead: 1_000_000, total: 1_000_000 });
    const fresh = costUsd(opus, { ...EMPTY_TOKENS, input: 1_000_000, total: 1_000_000 });
    expect(fresh).toBeCloseTo(5, 6);
    expect(cached).toBeCloseTo(0.5, 6);
  });

  it("bills output at the output price", () => {
    expect(costUsd(opus, { ...EMPTY_TOKENS, output: 100_000, total: 100_000 })).toBeCloseTo(2.5, 6);
  });
});

describe("billedUsd", () => {
  const precharge = 0.05;

  it("charges a step with no reported usage at the precharge estimate, never free", () => {
    const billed = billedUsd(opus, [{ inputTokens: 0, outputTokens: 0, totalTokens: 0 }], precharge);
    expect(billed).toBeCloseTo(precharge, 6);
  });

  it("charges the estimate when no step ran at all", () => {
    expect(billedUsd(opus, [], precharge)).toBeCloseTo(precharge, 6);
  });

  it("sums real usage per step and only substitutes the estimate for empty steps", () => {
    const billed = billedUsd(
      opus,
      [
        { inputTokens: 1_000, outputTokens: 100, totalTokens: 1_100 },
        { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      ],
      precharge,
    );
    const real = (1_000 * opus.inputPerM + 100 * opus.outputPerM) / 1e6;
    expect(billed).toBeCloseTo(real + precharge, 6);
  });
});

describe("abortedBilledUsd", () => {
  const precharge = 0.05;

  it("charges the estimate when the abort hit before any step completed", () => {
    expect(abortedBilledUsd(opus, [], precharge)).toBeCloseTo(precharge, 6);
  });

  it("adds the interrupted step at the estimate on top of the completed steps", () => {
    const completed = [{ inputTokens: 1_000, outputTokens: 100, totalTokens: 1_100 }];
    const real = (1_000 * opus.inputPerM + 100 * opus.outputPerM) / 1e6;
    expect(abortedBilledUsd(opus, completed, precharge)).toBeCloseTo(real + precharge, 6);
    expect(abortedBilledUsd(opus, completed, precharge)).toBeGreaterThan(
      billedUsd(opus, completed, precharge),
    );
  });
});

describe("chatMessageMetadataSchema", () => {
  it("accepts the partial pieces the route streams and merges", () => {
    expect(chatMessageMetadataSchema.safeParse({ model: "anthropic/claude-opus-5" }).success).toBe(true);
    expect(chatMessageMetadataSchema.safeParse({ ttftMs: 812 }).success).toBe(true);
    expect(chatMessageMetadataSchema.safeParse({ tokens: EMPTY_TOKENS, costUsd: 0.01 }).success).toBe(true);
    expect(chatMessageMetadataSchema.safeParse({ emailEnabled: false }).success).toBe(true);
    expect(chatMessageMetadataSchema.safeParse({ ttftMs: "fast" }).success).toBe(false);
  });
});
