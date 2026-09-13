import { describe, expect, it } from "vitest";
import { INDEXABLE_PATHS } from "@/lib/seo";
import { hasPublishedScores } from "@/lib/evals";
import { MAX_FACTS, SITE_FACTS, citationLine, lookupFacts } from "@/lib/site-facts";
import { hasDash } from "@/lib/plain-punctuation";

describe("SITE_FACTS", () => {
  it("cites only pages that exist and are indexable", () => {
    for (const fact of SITE_FACTS) {
      expect(INDEXABLE_PATHS as readonly string[], fact.id).toContain(fact.source.path);
    }
  });

  it("ships no em or en dash, whatever the source modules contain", () => {
    for (const fact of SITE_FACTS) {
      expect(hasDash(fact.text), `${fact.id} text`).toBe(false);
      expect(hasDash(fact.topic), `${fact.id} topic`).toBe(false);
      expect(hasDash(citationLine(fact)), `${fact.id} citation`).toBe(false);
    }
  });

  it("keeps every fact short enough to echo on every later turn", () => {
    for (const fact of SITE_FACTS) {
      expect(fact.text.length, fact.id).toBeLessThanOrEqual(400);
    }
  });

  it("has unique ids", () => {
    const ids = SITE_FACTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("lookupFacts", () => {
  it("finds pricing by the words a visitor would use", () => {
    const [top] = lookupFacts("how much does a workshop cost per person?");
    expect(top?.id).toBe("pricing");
    expect(top?.source.path).toBe("/nvidia-dli-workshops");
  });

  it("answers a coverage question with the coverage fact", () => {
    const ids = lookupFacts("do you work with companies in Texas or only Utah?").map((f) => f.id);
    expect(ids).toContain("coverage");
  });

  it("finds how the agent works, which is the fact about itself", () => {
    const ids = lookupFacts("how do you work, what tools do you have?").map((f) => f.id);
    expect(ids).toContain("how-the-agent-works");
  });

  it("reports the published scores the artifact has, and crowns no winner", () => {
    // The fact exists so the model can cite rather than assert, so it must say
    // what the artifact says: scored when a judge scored it, unscored when not.
    // It names no model as the best one either: published rows tie, and a tie
    // reported as a single winner is a claim nobody measured.
    const evaluations = SITE_FACTS.find((f) => f.id === "evaluations");
    expect(evaluations).toBeDefined();
    if (!evaluations) return;
    expect(evaluations.text).toContain(
      hasPublishedScores() ? "scored every reply" : "No model has scored those replies",
    );
    expect(evaluations.text).not.toMatch(/\b(winner|won|highest|best|beat)\b/i);
  });

  it("surfaces the evaluations fact when asked which model answers", () => {
    const ids = lookupFacts("which model is this, and how did you compare them?").map((f) => f.id);
    expect(ids).toContain("evaluations");
  });

  it("returns nothing rather than something irrelevant", () => {
    expect(lookupFacts("what is the weather in Lisbon tomorrow")).toEqual([]);
    expect(lookupFacts("")).toEqual([]);
    expect(lookupFacts("the and for")).toEqual([]);
  });

  it("ignores a non-string query instead of throwing", () => {
    expect(lookupFacts(undefined)).toEqual([]);
    expect(lookupFacts({ query: "pricing" })).toEqual([]);
  });

  it("never returns more than the cap, whatever limit is asked for", () => {
    expect(lookupFacts("nexus ai training workshop pricing team founder", 99).length).toBeLessThanOrEqual(
      MAX_FACTS,
    );
    expect(lookupFacts("nexus ai training workshop pricing", 0).length).toBeGreaterThan(0);
    expect(lookupFacts("nexus training pricing", 2).length).toBeLessThanOrEqual(2);
  });

  it("is stable: the same question returns the same facts in the same order", () => {
    const a = lookupFacts("what does an FDE engagement involve?").map((f) => f.id);
    const b = lookupFacts("what does an FDE engagement involve?").map((f) => f.id);
    expect(a).toEqual(b);
  });
});
