import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import { scrubForEmail } from "@/lib/email";
import {
  OUTREACH_TOOL_NAME,
  audienceLabel,
  findOutreachNote,
  noteWordCount,
  outreachNoteSchema,
  renderNoteText,
  type OutreachNote,
} from "@/lib/outreach";

export const SAMPLE_NOTE: OutreachNote = {
  audience: "leadership",
  subject: "Getting straight answers out of our SOPs",
  paragraphs: [
    "Our ops team keeps asking a public chatbot about our own SOPs and getting confident wrong answers.",
    "The first step is search over the SOPs we already have, with a test set so we can see when it is wrong.",
  ],
  ask: "Can I spend two weeks proving this on the top twenty questions?",
};

const noteMessage = (toolCallId: string, input: unknown): ModelMessage => ({
  role: "assistant",
  content: [{ type: "tool-call", toolCallId, toolName: OUTREACH_TOOL_NAME, input }],
});

describe("outreachNoteSchema", () => {
  it("keeps the JSON schema free of format keywords and regex", () => {
    const json = JSON.stringify(
      z.toJSONSchema(outreachNoteSchema, { target: "draft-7", io: "input" }),
    );
    expect(json).not.toContain('"format"');
    expect(json).not.toContain('"pattern"');
  });

  it("caps the note so an echoed draft cannot grow without bound", () => {
    const long = {
      ...SAMPLE_NOTE,
      paragraphs: ["a".repeat(401), "b", "c", "d"],
    };
    expect(outreachNoteSchema.safeParse(long).success).toBe(false);
    const five = { ...SAMPLE_NOTE, paragraphs: ["a", "b", "c", "d", "e"] };
    expect(outreachNoteSchema.safeParse(five).success).toBe(false);
  });

  it("refuses an audience that is not one of the three", () => {
    expect(outreachNoteSchema.safeParse({ ...SAMPLE_NOTE, audience: "press" }).success).toBe(false);
  });
});

describe("audienceLabel", () => {
  it("names the founder from the persona module, never a literal", () => {
    expect(audienceLabel("founder")).toBe(FOUNDER_CHAT_NAME);
    expect(audienceLabel("leadership")).toBe("Your leadership");
  });

  it("falls back rather than throwing on a crafted value", () => {
    expect(audienceLabel("nonsense")).toBe("Your reader");
    expect(audienceLabel(null)).toBe("Your reader");
  });
});

describe("renderNoteText", () => {
  it("keeps one paragraph per line so the scrubber cannot flatten the note", () => {
    const text = renderNoteText(SAMPLE_NOTE, scrubForEmail);
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    expect(lines[0]).toContain("Subject:");
    expect(lines).toHaveLength(4);
  });

  it("scrubs links and addresses out of every paragraph", () => {
    const injected: OutreachNote = {
      ...SAMPLE_NOTE,
      paragraphs: ["Go to https://evil.example/login now", "Mail me at ada@evil.example"],
    };
    const text = renderNoteText(injected, scrubForEmail);
    expect(text).not.toContain("evil.example");
    expect(text).toContain("[link removed]");
    expect(text).toContain("[address removed]");
  });
});

describe("noteWordCount", () => {
  it("counts the body and the ask, not the subject", () => {
    expect(noteWordCount(SAMPLE_NOTE)).toBeGreaterThan(30);
    expect(noteWordCount({ ...SAMPLE_NOTE, paragraphs: ["one two"], ask: "three" })).toBe(3);
  });
});

describe("findOutreachNote", () => {
  it("returns the note with the given id", () => {
    const other = { ...SAMPLE_NOTE, subject: "Other" };
    const found = findOutreachNote([noteMessage("n1", SAMPLE_NOTE), noteMessage("n2", other)], "n1");
    expect(found?.subject).toBe(SAMPLE_NOTE.subject);
  });

  it("returns the latest note when no id is given", () => {
    const other = { ...SAMPLE_NOTE, subject: "Later" };
    const found = findOutreachNote([noteMessage("n1", SAMPLE_NOTE), noteMessage("n2", other)]);
    expect(found?.subject).toBe("Later");
  });

  it("re-validates: a crafted call in history is not a note", () => {
    expect(findOutreachNote([noteMessage("n1", { audience: "leadership" })])).toBeNull();
    expect(findOutreachNote([noteMessage("n1", "not an object")])).toBeNull();
  });

  it("returns null when no note was drafted", () => {
    expect(findOutreachNote([])).toBeNull();
    expect(
      findOutreachNote([
        { role: "assistant", content: "just text" },
        { role: "user", content: "hello" },
      ]),
    ).toBeNull();
  });
});
