import { describe, expect, it } from "vitest";
import {
  GLOBAL_HARD_DAILY_USD,
  GLOBAL_SOFT_DAILY_USD,
  MAX_BODY_CHARS,
  MAX_CHARS_PER_ASSISTANT_TEXT_PART,
  MAX_CHARS_PER_TEXT_PART,
  MAX_CHARS_TOTAL,
  MAX_DURATION_SECONDS,
  MAX_OUTPUT_TOKENS,
  MAX_STEPS,
  PER_IP_DAILY_USD,
  PER_IP_REQUESTS_PER_MINUTE,
  STORE_TIMEOUT_MS,
  STREAM_TIMEOUT_MS,
  prechargeUsd,
} from "@/lib/chat-limits";
import { defaultModel, findModel } from "@/lib/chat-models";

describe("budget constants", () => {
  it("map the token targets to dollars at the Opus input price", () => {
    const opusInput = defaultModel().inputPerM; // $5 per 1M
    expect(GLOBAL_SOFT_DAILY_USD).toBeCloseTo((600_000 * opusInput) / 1e6, 6); // $3.00
    expect(GLOBAL_HARD_DAILY_USD).toBeCloseTo((2_000_000 * opusInput) / 1e6, 6); // $10.00
    expect(PER_IP_DAILY_USD).toBe(1.0);
    expect(PER_IP_REQUESTS_PER_MINUTE).toBe(20);
  });

  it("keeps the SDK timeout inside the function ceiling and the body caps ordered", () => {
    expect(STREAM_TIMEOUT_MS).toBeLessThan(MAX_DURATION_SECONDS * 1000);
    expect(MAX_DURATION_SECONDS).toBe(180);
    expect(MAX_BODY_CHARS).toBeGreaterThan(MAX_CHARS_TOTAL);
    expect(MAX_STEPS).toBe(5);
  });

  it("lets an assistant part hold a full-length reply while visitor parts stay at 4k", () => {
    expect(MAX_CHARS_PER_TEXT_PART).toBe(4_000);
    expect(MAX_CHARS_PER_ASSISTANT_TEXT_PART).toBeGreaterThanOrEqual(4 * MAX_OUTPUT_TOKENS);
    expect(MAX_CHARS_PER_ASSISTANT_TEXT_PART).toBeGreaterThan(MAX_CHARS_PER_TEXT_PART);
  });

  it("times out a hung counter store long before the stream timeout", () => {
    expect(STORE_TIMEOUT_MS).toBeGreaterThan(0);
    expect(STORE_TIMEOUT_MS * 3).toBeLessThan(STREAM_TIMEOUT_MS / 10);
  });
});

describe("prechargeUsd", () => {
  const opus = defaultModel();
  const gemini = findModel("google/gemini-3.8-flash")!;

  it("is never zero and grows with conversation length", () => {
    const empty = prechargeUsd(opus, 0);
    const long = prechargeUsd(opus, 12_000);
    expect(empty).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(empty);
  });

  it("is cheaper on a cheaper model", () => {
    expect(prechargeUsd(gemini, 2_000)).toBeLessThan(prechargeUsd(opus, 2_000));
  });

  it("sits in the cents range for one Opus request", () => {
    const usd = prechargeUsd(opus, 2_000);
    expect(usd).toBeGreaterThan(0.01);
    expect(usd).toBeLessThan(0.2);
  });
});
