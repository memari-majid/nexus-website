import { describe, expect, it } from "vitest";
import {
  AFTER_ADVICE_CHIPS,
  AFTER_BRIEF_CHIPS,
  AFTER_BRIEF_CHIPS_NO_EMAIL,
  AFTER_HANDOFF_CHIPS,
  AFTER_SNAPSHOT_CHIPS,
  DISCOVERY_CHIPS,
  MAX_CHIPS,
  OPENING_CHIPS,
  READY_CHIPS,
  chipLine,
} from "@/lib/chat-chips";
import {
  BRIEF_DRAFTED_RE,
  OPENING_CHIPS as REEXPORTED_OPENING_CHIPS,
  SNAPSHOT_SHOWN_RE,
  fallbackSuggestions,
  resolveSuggestions,
} from "@/lib/chat-suggestions";

/** Chips from the removed booking flow; none may surface on a consulting-only site. */
const BOOKING_CHIP_RE = /people|in person|remote|quarter|two months|book it|change a detail/i;

describe("resolveSuggestions", () => {
  it("uses the model's chips when at least two survive sanitizing", () => {
    const chips = resolveSuggestions(["Which training fits us?", "What's covered?"], { used: [] });
    expect(chips).toEqual(["Which training fits us?", "What's covered?"]);
  });

  it("fills in contextual chips when the model only emits fluff", () => {
    const chips = resolveSuggestions(["tell me more", "learn more"], {
      lastAssistant: "Consulting first: scope the SOP problem before building.",
      used: [],
    });
    expect(chips).toEqual(AFTER_ADVICE_CHIPS.slice(0, MAX_CHIPS));
  });

  it("never hands the widget more than the cap, whatever the model emits", () => {
    const chips = resolveSuggestions(
      ["Which training fits us?", "What's covered?", "Would an FDE help?", "When should we skip AI?"],
      { used: [] },
    );
    expect(chips).toHaveLength(MAX_CHIPS);
    expect(MAX_CHIPS).toBe(2);
  });

  it("drops chips that invite an email while outgoing email is off", () => {
    const chips = resolveSuggestions(["Send it to Majid", "Email me the brief", "Rate our AI readiness"], {
      emailEnabled: false,
      used: [],
    });
    expect(chips).toEqual(["Send it to Majid", "Rate our AI readiness"]);
    const on = resolveSuggestions(["Send it to Majid", "Email me the brief", "Rate our AI readiness"], {
      used: [],
    });
    expect(on).toContain("Email me the brief");
  });
});

describe("shared chips", () => {
  it("re-exports the opening chips from lib/chat-chips so the widget import keeps working", () => {
    expect(REEXPORTED_OPENING_CHIPS).toBe(OPENING_CHIPS);
  });

  it("renders the prompt's example lines at the cap, five words or fewer each", () => {
    for (const list of [DISCOVERY_CHIPS, AFTER_ADVICE_CHIPS, READY_CHIPS, AFTER_BRIEF_CHIPS, AFTER_BRIEF_CHIPS_NO_EMAIL, AFTER_SNAPSHOT_CHIPS, AFTER_HANDOFF_CHIPS]) {
      const line = chipLine(list);
      expect(line.split(" | ")).toHaveLength(MAX_CHIPS);
      for (const chip of list) expect(chip.split(/\s+/).length, chip).toBeLessThanOrEqual(5);
    }
  });

  it("keeps the no-email after-brief list free of email chips", () => {
    expect(AFTER_BRIEF_CHIPS_NO_EMAIL.some((c) => /email/i.test(c))).toBe(false);
    expect(AFTER_BRIEF_CHIPS.some((c) => /email/i.test(c))).toBe(true);
  });
});

describe("no booking-era chips (consulting-only site)", () => {
  it("never offers headcount, delivery, or timing chips, whatever the turn says", () => {
    for (const lastAssistant of [
      "How many people are on the team, roughly?",
      "Keep exception approvals with people; automate the lookups.",
      "Would you run this in person or remote?",
      "When would you want to host the workshop? Lead time is six weeks.",
      "Participants usually come from ops and engineering.",
    ]) {
      const chips = fallbackSuggestions({ lastAssistant });
      expect(chips.length, lastAssistant).toBeGreaterThan(0);
      for (const c of chips) expect(c, lastAssistant).not.toMatch(BOOKING_CHIP_RE);
    }
  });

  it("does not export a registration-driven chip resolver any more", async () => {
    const mod = (await import("@/lib/chat-suggestions")) as Record<string, unknown>;
    expect(mod.suggestionsForRegistration).toBeUndefined();
  });
});

describe("after-brief detection (spec 4.3)", () => {
  it("does not match an offer to draft", () => {
    for (const s of [
      "Want me to draft the brief?",
      "I can draft a brief if that helps.",
      "Should I put together a brief for you?",
      "A brief would help here. Want one?",
    ]) {
      expect(BRIEF_DRAFTED_RE.test(s), s).toBe(false);
    }
  });

  it("matches a drafted brief", () => {
    for (const s of [
      "I've drafted your brief above.",
      "Here's the brief. The short version: start with consulting.",
      "Your brief is ready. Two things stand out.",
      "I put together a brief from what you told me.",
    ]) {
      expect(BRIEF_DRAFTED_RE.test(s), s).toBe(true);
    }
  });

  it("offers the after-brief chips only once the brief exists", () => {
    const after = fallbackSuggestions({ lastAssistant: "Here's your brief." });
    expect(after).toEqual(AFTER_BRIEF_CHIPS.slice(0, MAX_CHIPS));
    const offer = fallbackSuggestions({
      lastAssistant: "Want me to draft the brief?",
      lastUser: "Draft a consulting brief",
    });
    expect(offer).not.toEqual(AFTER_BRIEF_CHIPS.slice(0, MAX_CHIPS));
  });

  it("swaps to the no-email after-brief chips when outgoing email is off", () => {
    const after = fallbackSuggestions({ lastAssistant: "Here's your brief.", emailEnabled: false });
    expect(after).toEqual(AFTER_BRIEF_CHIPS_NO_EMAIL.slice(0, MAX_CHIPS));
  });

  it("offers the after-snapshot and after-hand-off chips in their moments", () => {
    expect(SNAPSHOT_SHOWN_RE.test("Here is your readiness snapshot.")).toBe(true);
    expect(SNAPSHOT_SHOWN_RE.test("Want a readiness check?")).toBe(false);
    expect(fallbackSuggestions({ lastAssistant: "Your readiness snapshot is above." })).toEqual(
      AFTER_SNAPSHOT_CHIPS.slice(0, MAX_CHIPS),
    );
    expect(
      fallbackSuggestions({ lastAssistant: "Noted but not sent: email is not set up yet." }),
    ).toEqual(AFTER_HANDOFF_CHIPS.slice(0, MAX_CHIPS));
  });
});
