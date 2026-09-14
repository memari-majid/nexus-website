import { describe, expect, it } from "vitest";
import {
  CHAT_MODELS,
  DEFAULT_MODEL_ID,
  FALLBACK_MODEL_ID,
  defaultModel,
  fallbackModel,
  findModel,
  resolveModel,
} from "@/lib/chat-models";

describe("CHAT_MODELS", () => {
  it("is Claude Haiku 4.5 alone, at the 2026-09-13 gateway prices", () => {
    expect(CHAT_MODELS).toHaveLength(1);
    const [haiku] = CHAT_MODELS;
    // The dot is the real gateway slug; the dashed spelling does not exist there.
    expect(haiku.id).toBe("anthropic/claude-haiku-4.5");
    expect(haiku.label).toBe("Claude Haiku 4.5");
    expect(haiku.vendor).toBe("Anthropic");
    expect(haiku.promptCache).toBe(true);
    expect([haiku.inputPerM, haiku.outputPerM]).toEqual([1, 5]);
    expect(haiku.cacheReadPerM).toBeCloseTo(0.1, 6);
    expect(haiku.cacheWritePerM).toBeCloseTo(1.25, 6);
  });

  it("prices cached reads at a tenth of input", () => {
    for (const m of CHAT_MODELS) expect(m.cacheReadPerM).toBeCloseTo(m.inputPerM / 10, 6);
  });

  it("defaults to Haiku 4.5 and falls back to the same model, so the soft budget is a no-op", () => {
    expect(DEFAULT_MODEL_ID).toBe("anthropic/claude-haiku-4.5");
    expect(FALLBACK_MODEL_ID).toBe(DEFAULT_MODEL_ID);
    expect(defaultModel().id).toBe(DEFAULT_MODEL_ID);
    expect(fallbackModel().id).toBe(DEFAULT_MODEL_ID);
  });
});

describe("resolveModel", () => {
  it("returns the one model for its own id", () => {
    expect(resolveModel("anthropic/claude-haiku-4.5").label).toBe("Claude Haiku 4.5");
  });

  it("falls back to the default for unknown, dashed, empty, or non-string ids", () => {
    expect(resolveModel("anthropic/claude-opus-5").id).toBe(DEFAULT_MODEL_ID);
    expect(resolveModel("anthropic/claude-haiku-4-5").id).toBe(DEFAULT_MODEL_ID);
    expect(resolveModel("").id).toBe(DEFAULT_MODEL_ID);
    expect(resolveModel(undefined).id).toBe(DEFAULT_MODEL_ID);
    expect(resolveModel({ id: "anthropic/claude-haiku-4.5" }).id).toBe(DEFAULT_MODEL_ID);
    expect(findModel("google/gemini-3.8-flash")).toBeUndefined();
  });

  it("honours a custom fallback", () => {
    const haiku = defaultModel();
    expect(resolveModel("nope", haiku).id).toBe(haiku.id);
  });
});
