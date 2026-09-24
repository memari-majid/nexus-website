import { describe, expect, it } from "vitest";
import { nexusAssistantSystem, nexusChatSystem, nexusVoiceSystem, SUGGESTION_MARKER } from "@/lib/assistant";
import { AFTER_BRIEF_CHIPS, DISCOVERY_CHIPS, chipLine } from "@/lib/chat-chips";
import { ASSISTANT_NAME, FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import { chatTools } from "@/lib/chat-tools";
import { hasDash, plainPunctuation } from "@/lib/plain-punctuation";

describe("plainPunctuation", () => {
  it("turns numeric ranges into 'to'", () => {
    expect(plainPunctuation("2–4 sentences")).toBe("2 to 4 sentences");
    expect(plainPunctuation("9:00 — 17:00")).toBe("9:00 to 17:00");
  });

  it("turns a leading dash into a bullet and inner dashes into commas", () => {
    expect(plainPunctuation("— first\n— second")).toBe("- first\n- second");
    expect(plainPunctuation("Three buckets — Research, Industry — as on the page")).toBe(
      "Three buckets, Research, Industry, as on the page",
    );
    expect(plainPunctuation("word—word")).toBe("word, word");
  });

  it("does not eat line breaks or double up commas", () => {
    expect(plainPunctuation("end of line —\nnext")).toBe("end of line,\nnext");
    expect(plainPunctuation("a, — b")).toBe("a, b");
    expect(plainPunctuation("done. — next")).toBe("done. next");
  });

  it("leaves plain text alone", () => {
    const s = "Hyphen-ated words, colons: fine; and $500 per seat.";
    expect(plainPunctuation(s)).toBe(s);
    expect(hasDash(s)).toBe(false);
  });
});

describe("rendered system prompts", () => {
  it("carry no em or en dashes after interpolating the data files", () => {
    for (const render of [nexusAssistantSystem, nexusChatSystem, nexusVoiceSystem]) {
      const text = render();
      expect(text.length).toBeGreaterThan(1000);
      expect(hasDash(text)).toBe(false);
    }
  });

  it("names every tool, the honesty rule, and the shared chips", () => {
    const p = nexusChatSystem();
    for (const tool of Object.keys(chatTools)) {
      expect(p, `prompt names ${tool}`).toContain(tool);
    }
    expect(Object.keys(chatTools)).toHaveLength(10);
    expect(p).toContain("noted but not sent");
    expect(p).toContain("never claim an email went out");
    expect(p).toContain(SUGGESTION_MARKER);
    expect(p).toContain(chipLine(DISCOVERY_CHIPS));
    expect(p).toContain(chipLine(AFTER_BRIEF_CHIPS));
    expect(p).not.toContain("requestAppointment");
  });

  it("keeps the editorial rules: no Dr. for Majid himself, never free, industry only", () => {
    const p = nexusChatSystem();
    // "Dr. Majid" appears exactly twice, and both are rules forbidding it: the
    // site-wide one in the shared facts, and the chat override that says the
    // founder is Dr. Memari in here and never Dr. Majid.
    expect(p).toContain('never "Dr. Majid Memari, PhD"');
    expect(p).toContain('Never write "Dr. Majid Memari"');
    expect(p.match(/Dr\. Majid/g)).toHaveLength(2);
    expect(p).toContain('never call consulting "free"');
    expect(p).toContain("never imply NVIDIA endorses Nexus");
  });

  it("renames the assistant and the founder inside the chat only (AGENTS.md 9.1)", () => {
    const chat = nexusChatSystem();
    const voice = nexusVoiceSystem();
    expect(chat).toContain(`You are the ${ASSISTANT_NAME}`);
    expect(chat).toContain(FOUNDER_CHAT_NAME);
    expect(chat).not.toContain("Dr. MJ");
    // The voice agent shares the facts, not the persona: it is never
    // introduced as the assistant and it never calls him Dr. Memari.
    // `ASSISTANT_NAME` itself is not asserted absent: "AI Consultant" is also
    // the founder's factual prior role at One-U RAI, which both prompts carry.
    expect(voice).not.toContain(`You are the ${ASSISTANT_NAME}`);
    expect(voice).not.toContain(FOUNDER_CHAT_NAME);
    expect(voice).not.toContain("Dr. MJ");
  });
});
