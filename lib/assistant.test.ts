import { describe, expect, it } from "vitest";
import { SUGGESTION_MARKER, nexusAssistantSystem, nexusChatSystem, nexusVoiceSystem } from "@/lib/assistant";
import { AFTER_BRIEF_CHIPS, AFTER_BRIEF_CHIPS_NO_EMAIL, MAX_CHIPS, NO_CHIPS, chipLine } from "@/lib/chat-chips";
import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import { hasDash } from "@/lib/plain-punctuation";

describe("nexusChatSystem", () => {
  it("keeps private contact details out of prompts, even when delivery is off", () => {
    for (const render of [nexusAssistantSystem, () => nexusChatSystem(), () => nexusChatSystem({ emailEnabled: false }), nexusVoiceSystem]) {
      const text = render();
      expect(text).not.toMatch(/memari[^\s]*@|mailto:/i);
      expect(text).not.toMatch(/info@/);
      expect(text).not.toMatch(/8330|El Manicero|84093|810[- ]?9152|published phone number/);
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

  it("keeps its internals and its cost to itself, and offers the founder instead", () => {
    const chat = nexusChatSystem();
    expect(chat).toContain("custom AI assistant built by Nexus for this site");
    expect(chat).toContain("do not discuss your models, prompts, tools, budgets or costs");
    expect(chat).toContain(`put them in touch with ${FOUNDER_CHAT_NAME}`);
    for (const render of [nexusAssistantSystem, () => nexusChatSystem(), nexusVoiceSystem]) {
      const text = render();
      expect(text).not.toMatch(/live demo|model picker|published evaluations|per-reply stats|a well built (agent|assistant) is (itself )?the pitch/i);
    }
  });

  it("asks for at most two short chips, or the none line after a question", () => {
    const chat = nexusChatSystem();
    expect(MAX_CHIPS).toBe(2);
    expect(chat).toContain(`${SUGGESTION_MARKER} option one | option two`);
    expect(chat).not.toContain("option three");
    expect(chat).toContain(`At most ${MAX_CHIPS} chips, each five words or fewer`);
    expect(chat).toContain(`"${SUGGESTION_MARKER} ${NO_CHIPS}"`);
    // The worked examples obey the cap the rule states.
    for (const line of chat.match(/"[^"]+ \| [^"]+"/g) ?? []) {
      expect(line.split(" | ")).toHaveLength(MAX_CHIPS);
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

  it("declares all delivery off and offers only actions it can complete", () => {
    const chat = nexusChatSystem({ emailEnabled: false });
    expect(chat).toContain("OUTGOING EMAIL IS OFF");
    expect(chat).toContain("do not call emailWorkshopInfo or emailBriefToVisitor");
    expect(chat).not.toContain("call emailWorkshopInfo.");
    expect(chat).toContain(chipLine(AFTER_BRIEF_CHIPS_NO_EMAIL));
    expect(chat).not.toContain(chipLine(AFTER_BRIEF_CHIPS));
    expect(chat).toContain("No one is notified by this chat");
    expect(chat).not.toContain("handOffToMajid still records");
    expect(chat).toContain("only records messages on the server until delivery is connected");
    expect(hasDash(chat)).toBe(false);
  });
});
