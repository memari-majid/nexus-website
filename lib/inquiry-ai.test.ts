import { describe, expect, it } from "vitest";
import { AUTO_REPLY_MAX_CHARS, inquiryPromptChars, parseInquiryClassification } from "@/lib/inquiry-ai";

/**
 * The three shapes `openai/gpt-oss-20b` actually returned on 2026-09-13, when
 * the schema path failed 99 of 99 submissions, plus the clean answer a
 * well-behaved model gives. The parser must read all of the readable ones.
 */
describe("parseInquiryClassification", () => {
  it("reads a clean object", () => {
    expect(parseInquiryClassification('{"category": "workshop", "autoReply": "Thanks, Ada. We will follow up."}')).toEqual({
      category: "workshop",
      autoReply: "Thanks, Ada. We will follow up.",
    });
  });

  it("reads the acknowledgment under the alias a small model used, and strips its channel tokens", () => {
    expect(
      parseInquiryClassification(
        '<|channel|>final<|message|>{ "category": "consulting", "acknowledgment": "Thanks for reaching out, Ada.  We will be in touch." }',
      ),
    ).toEqual({ category: "consulting", autoReply: "Thanks for reaching out, Ada. We will be in touch." });
  });

  it("reads an object inside a code fence or surrounded by prose", () => {
    expect(
      parseInquiryClassification('Sure! Here it is:\n```json\n{"category":"careers","autoReply":"Thanks, Ada."}\n```\nLet me know.'),
    ).toEqual({ category: "careers", autoReply: "Thanks, Ada." });
  });

  it("maps an unknown or oddly cased category to general and keeps the acknowledgment", () => {
    expect(parseInquiryClassification('{"category": "Consulting", "autoReply": "Hi."}')?.category).toBe("consulting");
    expect(parseInquiryClassification('{"category": "sales", "autoReply": "Hi."}')?.category).toBe("general");
    expect(parseInquiryClassification('{"autoReply": "Hi."}')?.category).toBe("general");
  });

  it("cuts an over-long acknowledgment rather than rejecting the whole answer", () => {
    const long = parseInquiryClassification(`{"category":"general","autoReply":"${"x".repeat(900)}"}`);
    expect(long?.autoReply).toHaveLength(AUTO_REPLY_MAX_CHARS);
  });

  it("returns null for the answers nothing can read, so the call is charged as a failure", () => {
    for (const text of [
      "",
      "Category: consulting. Thanks for reaching out!",
      '{"final**Category:** consulting, autoReply: yes',
      '{"category": "consulting"}',
      '{"category": "consulting", "autoReply": ""}',
      "[1, 2, 3]",
      "{}",
    ]) {
      expect(parseInquiryClassification(text), JSON.stringify(text)).toBeNull();
    }
  });
});

describe("inquiryPrompt", () => {
  it("asks for one JSON object with the two field names the parser reads first", () => {
    // The prompt is private; its length is not. A prompt that asks for the
    // object is longer than the bare message by at least the instruction.
    expect(inquiryPromptChars({ name: "Ada", message: "hello" })).toBeGreaterThan(2_000);
  });
});
