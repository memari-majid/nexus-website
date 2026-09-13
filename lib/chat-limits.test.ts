import { describe, expect, it } from "vitest";
import {
  CHARS_PER_TOKEN,
  CONTACT_CLASSIFY_MESSAGE_CHARS,
  CONTACT_CLASSIFY_NAME_CHARS,
  CONTACT_CLASSIFY_OUTPUT_TOKENS,
  CONTACT_CLASSIFY_TIMEOUT_MS,
  GLOBAL_HARD_DAILY_USD,
  GLOBAL_SOFT_DAILY_USD,
  MAX_BODY_CHARS,
  MAX_CHARS_PER_ASSISTANT_TEXT_PART,
  MAX_CHARS_PER_TEXT_PART,
  MAX_CHARS_TOTAL,
  MAX_DURATION_SECONDS,
  MAX_OUTPUT_TOKENS,
  MAX_STEPS,
  MAX_TOOL_CHARS_TOTAL,
  PER_IP_DAILY_USD,
  PER_IP_REQUESTS_PER_MINUTE,
  PRECHARGE_OUTPUT_TOKENS,
  STORE_TIMEOUT_MS,
  STREAM_TIMEOUT_MS,
  UNPRICED_MODEL_RATES,
  contactClassifyCostUsd,
  contactClassifyFloorUsd,
  contactClassifyPrechargeUsd,
  contactClassifyRates,
  contactClassifyResolvedRates,
  parseClassifyRates,
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
    expect(MAX_STEPS).toBe(6);
  });

  it("bounds echoed tool payloads below the raw body cap, above the text cap", () => {
    // Only `textChars` is checked against MAX_CHARS_TOTAL, so without this cap
    // tool payloads are bounded only by the raw body, and they are billed on
    // every turn. Ten tools reach that quickly: a 3.5k estimate input and a
    // 1.5k note draft is 5k in one exchange.
    expect(MAX_TOOL_CHARS_TOTAL).toBeGreaterThan(MAX_CHARS_TOTAL);
    expect(MAX_TOOL_CHARS_TOTAL).toBeLessThan(MAX_BODY_CHARS);
    // Room for the text cap, the tool cap, and the JSON around both.
    expect(MAX_BODY_CHARS).toBeGreaterThan((MAX_CHARS_TOTAL + MAX_TOOL_CHARS_TOTAL) * 2);
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

describe("contact classifier rates", () => {
  it("resolves an explicit override ahead of an allowlisted slug's published price", () => {
    // The override is the operator writing a price in the environment. A
    // resolver that read the allowlist first would make that variable silently
    // unreachable for exactly the slugs an operator is most likely to reprice.
    const opus = findModel("anthropic/claude-opus-5");
    expect(opus).toBeDefined();
    const override = { inputPerM: 0.04, outputPerM: 0.16 };
    expect(contactClassifyResolvedRates({ model: opus, rates: override })).toEqual(override);
    const fromModel = contactClassifyResolvedRates({ model: opus });
    expect(fromModel.inputPerM).toBe(opus?.inputPerM);
    expect(fromModel.outputPerM).toBe(opus?.outputPerM);
    expect(contactClassifyResolvedRates({ model: undefined })).toEqual(UNPRICED_MODEL_RATES);
  });

  it("prices the default classifier from the table, because it is not a picker model here", () => {
    // Worth asserting rather than assuming: `anthropic/claude-haiku-4-5` is the
    // default CONTACT_CLASSIFY_MODEL and is NOT on this site's chat allowlist,
    // so the published-price branch never fires for it. Drop the table row and
    // every classification would be priced at Opus rates.
    expect(findModel("anthropic/claude-haiku-4-5")).toBeUndefined();
    const tabled = contactClassifyRates("anthropic/claude-haiku-4-5");
    expect(tabled).toEqual({ inputPerM: 1, outputPerM: 5 });
    expect(contactClassifyResolvedRates({ model: undefined, rates: tabled })).toEqual(tabled);
    expect(contactClassifyRates("openai/gpt-oss-20b")).toEqual({
      inputPerM: 0.04,
      outputPerM: 0.16,
    });
    expect(contactClassifyRates("some/unknown-model")).toBeUndefined();
    expect(contactClassifyRates(undefined)).toBeUndefined();
    // A plain object, so an inherited key cannot masquerade as a price.
    expect(contactClassifyRates("toString")).toBeUndefined();
  });

  it("parses a well-formed override and rejects everything that is not a price", () => {
    expect(parseClassifyRates("0.04,0.16")).toEqual({ inputPerM: 0.04, outputPerM: 0.16 });
    expect(parseClassifyRates(" 1 , 5 ")).toEqual({ inputPerM: 1, outputPerM: 5 });
    // One side free is still a price.
    expect(parseClassifyRates("0,5")).toEqual({ inputPerM: 0, outputPerM: 5 });
    // Free on both sides is a typo, not a price: accepting it would price every
    // classification at $0.00 with no warning, and a metered call that costs
    // nothing is an unmetered call.
    expect(parseClassifyRates("0,0")).toBeUndefined();
    expect(parseClassifyRates(",")).toBeUndefined();
    expect(parseClassifyRates("0.04,")).toBeUndefined();
    expect(parseClassifyRates(",0.16")).toBeUndefined();
    expect(parseClassifyRates("-1,5")).toBeUndefined();
    expect(parseClassifyRates("1,-5")).toBeUndefined();
    expect(parseClassifyRates("Infinity,5")).toBeUndefined();
    expect(parseClassifyRates("1,NaN")).toBeUndefined();
    expect(parseClassifyRates("abc,5")).toBeUndefined();
    expect(parseClassifyRates("1")).toBeUndefined();
    expect(parseClassifyRates("1,5,9")).toBeUndefined();
    expect(parseClassifyRates("")).toBeUndefined();
    expect(parseClassifyRates(undefined)).toBeUndefined();
  });

  it("floors a classification at the tokens sent plus the whole output cap", () => {
    const rates = { inputPerM: 1, outputPerM: 5 };
    const promptChars = 4_000;
    const floor = contactClassifyFloorUsd({ model: undefined, rates, promptChars });
    const inputTokens = Math.ceil(promptChars / CHARS_PER_TOKEN);
    expect(floor).toBeCloseTo(
      (inputTokens * rates.inputPerM + CONTACT_CLASSIFY_OUTPUT_TOKENS * rates.outputPerM) / 1e6,
      9,
    );
    // The failure path settles here, so it must never be zero for a real prompt.
    expect(floor).toBeGreaterThan(0);
    // The precharge is the same ceiling, never rounded away to nothing.
    expect(contactClassifyPrechargeUsd({ model: undefined, rates, promptChars })).toBe(floor);
    expect(
      contactClassifyPrechargeUsd({ model: undefined, rates, promptChars: 0 }),
    ).toBeGreaterThanOrEqual(0.0001);
    // A success settles at real tokens, which is below the floor for a short reply.
    const success = contactClassifyCostUsd({
      model: undefined,
      rates,
      inputTokens,
      outputTokens: 120,
    });
    expect(success).toBeLessThan(floor);
    expect(success).toBeGreaterThan(0);
  });

  it("bounds what one visitor can put in front of the classifier", () => {
    expect(CONTACT_CLASSIFY_MESSAGE_CHARS).toBe(4_000);
    expect(CONTACT_CLASSIFY_NAME_CHARS).toBe(120);
    expect(CONTACT_CLASSIFY_OUTPUT_TOKENS).toBeLessThan(PRECHARGE_OUTPUT_TOKENS);
    // A single short call finishes long before the chat stream's ceiling.
    expect(CONTACT_CLASSIFY_TIMEOUT_MS).toBeLessThan(STREAM_TIMEOUT_MS);
  });
});
