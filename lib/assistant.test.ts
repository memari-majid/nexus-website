import { describe, expect, it } from "vitest";
import { nexusAssistantSystem, nexusChatSystem, nexusVoiceSystem } from "@/lib/assistant";
import { AFTER_BRIEF_CHIPS, AFTER_BRIEF_CHIPS_NO_EMAIL, chipLine } from "@/lib/chat-chips";
import { hasDash } from "@/lib/plain-punctuation";
import { SITE } from "@/lib/site";

describe("nexusChatSystem", () => {
  it("never points visitors at the published address (no inbound mail yet)", () => {
    for (const render of [nexusAssistantSystem, () => nexusChatSystem(), nexusVoiceSystem]) {
      const text = render();
      expect(text).not.toContain(SITE.email);
      expect(text).not.toMatch(/info@/);
    }
    const chat = nexusChatSystem();
    expect(chat).toContain("/contact");
    expect(chat).toContain("never claim an email went out");
    expect(chat).toContain("noted but not sent");
  });

  it("knows Utah is the home base and the market is the whole United States", () => {
    for (const render of [nexusAssistantSystem, () => nexusChatSystem(), nexusVoiceSystem]) {
      const text = render();
      expect(text).toContain("across the United States");
      expect(text).toContain("anywhere in the US");
      expect(text).toContain("Utah is the home base, not the edge of the market");
      expect(text).not.toMatch(/only (in )?Utah|Utah[- ]only|serving Utah|Utah businesses|Utah companies/i);
      expect(text).not.toMatch(/Mountain West|Wasatch Front|Salt Lake area/i);
    }
  });

  it("offers the email tools and the email chip by default", () => {
    const chat = nexusChatSystem();
    expect(chat).toContain("call emailWorkshopInfo");
    expect(chat).toContain("call emailBriefToVisitor");
    expect(chat).toContain(chipLine(AFTER_BRIEF_CHIPS));
    expect(chat).not.toContain("OUTGOING EMAIL IS OFF");
    expect(nexusChatSystem({ emailEnabled: true })).toBe(chat);
  });

  it("declares email off, swaps the brief chips, and keeps the hand-off when email is not configured", () => {
    const chat = nexusChatSystem({ emailEnabled: false });
    expect(chat).toContain("OUTGOING EMAIL IS OFF");
    expect(chat).toContain("do not call emailWorkshopInfo or emailBriefToVisitor");
    expect(chat).not.toContain("call emailWorkshopInfo.");
    expect(chat).toContain(chipLine(AFTER_BRIEF_CHIPS_NO_EMAIL));
    expect(chat).not.toContain(chipLine(AFTER_BRIEF_CHIPS));
    expect(chat).toContain("handOffToMajid still records the hand-off");
    expect(chat).toContain("only records messages on the server until delivery is connected");
    expect(hasDash(chat)).toBe(false);
  });
});
