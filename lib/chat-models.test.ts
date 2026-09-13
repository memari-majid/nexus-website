import { describe, expect, it } from "vitest";
import {
  CHAT_MODELS,
  DEFAULT_MODEL_ID,
  FALLBACK_MODEL_ID,
  defaultModel,
  fallbackModel,
  findModel,
  formatUsd,
  resolveModel,
} from "@/lib/chat-models";

describe("CHAT_MODELS", () => {
  it("lists the four picker models with the 2026-09-12 gateway prices", () => {
    const byId = Object.fromEntries(CHAT_MODELS.map((m) => [m.id, [m.inputPerM, m.outputPerM]]));
    expect(byId).toEqual({
      "anthropic/claude-opus-5": [5, 25],
      "anthropic/claude-sonnet-5": [2, 10],
      "openai/gpt-5.6-sol": [2, 10],
      "google/gemini-3.8-flash": [0.75, 3.75],
    });
  });

  it("prices cached reads at a tenth of input on every model", () => {
    for (const m of CHAT_MODELS) expect(m.cacheReadPerM).toBeCloseTo(m.inputPerM / 10, 6);
  });

  it("defaults to Opus 5 and falls back to Sonnet 5", () => {
    expect(DEFAULT_MODEL_ID).toBe("anthropic/claude-opus-5");
    expect(FALLBACK_MODEL_ID).toBe("anthropic/claude-sonnet-5");
    expect(defaultModel().id).toBe(DEFAULT_MODEL_ID);
    expect(fallbackModel().id).toBe(FALLBACK_MODEL_ID);
  });
});

describe("resolveModel", () => {
  it("returns the matching model for a known id", () => {
    expect(resolveModel("google/gemini-3.8-flash").label).toBe("Gemini 3.8 Flash");
  });

  it("falls back to the default for unknown, empty, or non-string ids", () => {
    expect(resolveModel("anthropic/claude-fable-5.1").id).toBe(DEFAULT_MODEL_ID);
    expect(resolveModel("").id).toBe(DEFAULT_MODEL_ID);
    expect(resolveModel(undefined).id).toBe(DEFAULT_MODEL_ID);
    expect(resolveModel({ id: "anthropic/claude-opus-5" }).id).toBe(DEFAULT_MODEL_ID);
  });

  it("honours a custom fallback (the env-selected default)", () => {
    const sonnet = findModel("anthropic/claude-sonnet-5")!;
    expect(resolveModel("nope", sonnet).id).toBe(sonnet.id);
  });
});

describe("formatUsd", () => {
  it("shows four decimals under a dollar and two above", () => {
    expect(formatUsd(0.01234)).toBe("$0.0123");
    expect(formatUsd(1.5)).toBe("$1.50");
    expect(formatUsd(0)).toBe("$0.0000");
    expect(formatUsd(Number.NaN)).toBe("$0.0000");
  });
});
