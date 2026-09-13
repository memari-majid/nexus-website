import { describe, expect, it } from "vitest";
import { resolveSuggestions, suggestionsForRegistration } from "@/lib/chat-suggestions";

const j = (s: string[]) => s.join(" | ").toLowerCase();

describe("suggestionsForRegistration — chips follow the form state", () => {
  it("offers headcount buckets that span the pricing tiers first", () => {
    const s = suggestionsForRegistration({}, []);
    expect(s.some((c) => /people/i.test(c))).toBe(true);
    expect(s.some((c) => /40/.test(c))).toBe(true);
  });

  it("offers delivery options once headcount is known", () => {
    const s = suggestionsForRegistration({ headcount: 10 }, []);
    expect(j(s)).toContain("in person");
    expect(j(s)).toContain("remote");
  });

  it("offers timing options after delivery", () => {
    const s = suggestionsForRegistration({ headcount: 10, delivery: "remote" }, []);
    expect(s.length).toBeGreaterThan(0);
  });

  it("does not chip for name or email (the visitor types those)", () => {
    const s = suggestionsForRegistration(
      { headcount: 10, delivery: "remote", timing: "Q1" },
      [],
    );
    expect(s).toEqual([]);
  });

  it("offers a book action once the essentials are captured", () => {
    const s = suggestionsForRegistration(
      { name: "Ada", email: "ada@acme.com", headcount: 10, delivery: "remote", timing: "Q1" },
      [],
    );
    expect(j(s)).toContain("book");
  });

  it("never repeats a chip the visitor already tapped", () => {
    const s = suggestionsForRegistration({}, ["About 15 people"]);
    expect(s).not.toContain("About 15 people");
  });
});

describe("resolveSuggestions — booking state wins over generic model chips", () => {
  it("uses form-state chips while a booking is in progress", () => {
    const chips = resolveSuggestions(["tell me more", "learn more"], {
      registration: {},
      used: [],
    });
    expect(chips.some((c) => /people/i.test(c))).toBe(true);
  });

  it("falls back to model chips when no booking is active", () => {
    const chips = resolveSuggestions(["Schedule the workshop", "What's covered?"], { used: [] });
    expect(chips).toContain("Schedule the workshop");
  });
});
