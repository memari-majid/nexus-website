import { describe, expect, it } from "vitest";
import {
  CHARS_PER_TOKEN,
  CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES,
  CONTACT_CLASSIFY_MESSAGE_CHARS,
  CONTACT_CLASSIFY_NAME_CHARS,
  CONTACT_CLASSIFY_OUTPUT_TOKENS,
  CONTACT_CLASSIFY_PAUSE_MS,
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
  PROMPT_TOKENS_ESTIMATE,
  STORE_TIMEOUT_MS,
  STREAM_TIMEOUT_MS,
  UNPRICED_MODEL_RATES,
  contactClassifyCostUsd,
  contactClassifyFloorUsd,
  contactClassifyPrechargeUsd,
  contactClassifyRates,
  contactClassifyResolvedRates,
  createFailureBreaker,
  parseClassifyRates,
  prechargeUsd,
} from "@/lib/chat-limits";
import { defaultModel, findModel, type ChatModel } from "@/lib/chat-models";

describe("budget constants", () => {
  it("keep the dollar budgets as they were set, soft under hard", () => {
    // Unchanged when the chat moved to Haiku 4.5 (2026-09-13): the same
    // dollars now buy several times the conversations, and the hard budget is
    // still the ceiling.
    expect(GLOBAL_SOFT_DAILY_USD).toBe(3.0);
    expect(GLOBAL_HARD_DAILY_USD).toBe(10.0);
    expect(GLOBAL_SOFT_DAILY_USD).toBeLessThan(GLOBAL_HARD_DAILY_USD);
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
  const haiku = defaultModel();
  /** A model priced five times Haiku, to show the estimate follows the price list. */
  const dearer: ChatModel = { ...haiku, id: "test/dearer", inputPerM: 5, outputPerM: 25 };

  it("is never zero and grows with conversation length", () => {
    const empty = prechargeUsd(haiku, 0);
    const long = prechargeUsd(haiku, 12_000);
    expect(empty).toBeGreaterThan(0);
    expect(long).toBeGreaterThan(empty);
  });

  it("follows the model's list price", () => {
    expect(prechargeUsd(haiku, 2_000)).toBeLessThan(prechargeUsd(dearer, 2_000));
  });

  it("sits in the cents range for one Haiku request", () => {
    const usd = prechargeUsd(haiku, 2_000);
    expect(usd).toBeGreaterThan(0.01);
    expect(usd).toBeLessThan(0.05);
  });

  it("reserves the whole prompt at the uncached price, which is where the per-IP cap has to refuse", () => {
    // Measured 2026-09-13 on the first turn after a deploy: the prompt plus
    // the ten tool schemas wrote 13,460 to 13,528 tokens to the cache. At the
    // old 6,000 estimate a cold turn was under-reserved, so a parallel burst
    // from one address was admitted past $1 before anything settled.
    expect(PROMPT_TOKENS_ESTIMATE).toBeGreaterThanOrEqual(13_528);
    const coldPrompt = (PROMPT_TOKENS_ESTIMATE * haiku.inputPerM) / 1e6;
    expect(prechargeUsd(haiku, 0)).toBeGreaterThan(coldPrompt);
  });
});

describe("createFailureBreaker", () => {
  it("pauses after the configured run of failures, for the configured time, and a success resets it", () => {
    let t = 0;
    const breaker = createFailureBreaker({ trips: 3, pauseMs: 1_000, now: () => t });
    expect(breaker.paused()).toBe(false);
    breaker.record(false);
    breaker.record(false);
    expect(breaker.paused()).toBe(false);
    // A success in between clears the run.
    breaker.record(true);
    breaker.record(false);
    breaker.record(false);
    expect(breaker.paused()).toBe(false);
    breaker.record(false);
    expect(breaker.paused()).toBe(true);
    t = 999;
    expect(breaker.paused()).toBe(true);
    t = 1_000;
    expect(breaker.paused()).toBe(false);
    // Tripped again only after another full run, not on the next failure.
    breaker.record(false);
    expect(breaker.paused()).toBe(false);
  });

  it("ships with the documented defaults", () => {
    expect(CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES).toBe(5);
    expect(CONTACT_CLASSIFY_PAUSE_MS).toBe(60 * 60 * 1000);
    let t = 0;
    const breaker = createFailureBreaker({ now: () => t });
    for (let i = 0; i < CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES; i++) breaker.record(false);
    expect(breaker.paused()).toBe(true);
    t = CONTACT_CLASSIFY_PAUSE_MS;
    expect(breaker.paused()).toBe(false);
  });
});

describe("contact classifier rates", () => {
  it("resolves an explicit override ahead of an allowlisted slug's published price", () => {
    // The override is the operator writing a price in the environment. A
    // resolver that read the allowlist first would make that variable silently
    // unreachable for exactly the slugs an operator is most likely to reprice.
    const haiku = findModel("anthropic/claude-haiku-4.5");
    expect(haiku).toBeDefined();
    const override = { inputPerM: 0.04, outputPerM: 0.16 };
    expect(contactClassifyResolvedRates({ model: haiku, rates: override })).toEqual(override);
    const fromModel = contactClassifyResolvedRates({ model: haiku });
    expect(fromModel.inputPerM).toBe(haiku?.inputPerM);
    expect(fromModel.outputPerM).toBe(haiku?.outputPerM);
    expect(contactClassifyResolvedRates({ model: undefined })).toEqual(UNPRICED_MODEL_RATES);
  });

  it("prices the default classifier from the table, because it is not the chat model here", () => {
    // Worth asserting rather than assuming: `openai/gpt-4.1-nano` is the
    // default CONTACT_CLASSIFY_MODEL and is NOT on this site's chat allowlist,
    // so the published-price branch never fires for it. Drop the table row and
    // every classification would be priced at the pessimistic rates.
    expect(findModel("openai/gpt-4.1-nano")).toBeUndefined();
    const tabled = contactClassifyRates("openai/gpt-4.1-nano");
    expect(tabled).toEqual({ inputPerM: 0.1, outputPerM: 0.4 });
    expect(contactClassifyResolvedRates({ model: undefined, rates: tabled })).toEqual(tabled);
    expect(contactClassifyRates("anthropic/claude-haiku-4-5")).toEqual({ inputPerM: 1, outputPerM: 5 });
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
