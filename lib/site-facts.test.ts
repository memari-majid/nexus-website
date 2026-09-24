import { describe, expect, it } from "vitest";
import { INDEXABLE_PATHS, organizationJsonLd } from "@/lib/seo";
import { MAX_FACTS, SITE_FACTS, citationLine, lookupFacts } from "@/lib/site-facts";
import { hasDash } from "@/lib/plain-punctuation";

describe("SITE_FACTS", () => {
  it("keeps email, phone and street address out of search metadata", () => {
    const org = organizationJsonLd();
    expect(org).not.toHaveProperty("email");
    expect(org).not.toHaveProperty("telephone");
    expect(org).not.toHaveProperty("address");
    expect(JSON.stringify(SITE_FACTS)).not.toMatch(/8330|El Manicero|84093|810[- ]?9152/);
  });
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

  it("finds the fact about itself, and that fact keeps the internals out", () => {
    const ids = lookupFacts("how do you work, who built you?").map((f) => f.id);
    expect(ids).toContain("how-the-agent-works");
    const self = SITE_FACTS.find((f) => f.id === "how-the-agent-works");
    expect(self).toBeDefined();
    if (!self) return;
    expect(self.text).toContain("custom AI assistant built by Nexus");
    expect(self.text).not.toMatch(/model|prompt|token|budget|cost|picker|evaluation/i);
    expect(self.source.path).toBe("/");
  });

  it("publishes no evaluation or model-choice fact any more", () => {
    expect(SITE_FACTS.find((f) => f.id === "evaluations")).toBeUndefined();
    expect(lookupFacts("which model is this, and how did you compare them?").map((f) => f.id)).not.toContain(
      "evaluations",
    );
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
