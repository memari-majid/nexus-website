import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  READINESS_DIMENSIONS,
  clampScore,
  readinessInputSchema,
  readinessLevel,
  summarizeReadiness,
} from "@/lib/readiness";

function keysDeep(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysDeep(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysDeep(v, out);
    }
  }
  return out;
}

describe("clampScore", () => {
  it("returns an integer 0..5 for anything", () => {
    expect(clampScore(3.4)).toBe(3);
    expect(clampScore(3.6)).toBe(4);
    expect(clampScore(99)).toBe(5);
    expect(clampScore(-2)).toBe(0);
    expect(clampScore("4")).toBe(4);
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(undefined)).toBe(0);
    expect(clampScore({})).toBe(0);
    expect(() => "x".repeat(clampScore(null))).not.toThrow();
  });
});

describe("readinessLevel", () => {
  it("bands the mean score", () => {
    expect(readinessLevel(1)).toBe("Early");
    expect(readinessLevel(2.4)).toBe("Early");
    expect(readinessLevel(2.5)).toBe("Forming");
    expect(readinessLevel(3.5)).toBe("Ready to pilot");
    expect(readinessLevel(4.5)).toBe("Ready to scale");
  });
});

describe("summarizeReadiness", () => {
  it("orders dimensions canonically, clamps scores, and finds the weakest", () => {
    const s = summarizeReadiness({
      headline: "Clear goal, thin data",
      nextStep: "Inventory the SOP docs",
      dimensions: [
        { key: "team", score: 4, note: "Two Python devs" },
        { key: "useCase", score: 5, note: "SOP answers" },
        { key: "data", score: 1.6, note: "300 Word docs, uncurated" },
      ],
    });
    expect(s.dimensions.map((d) => d.key)).toEqual(["useCase", "data", "team"]);
    expect(s.dimensions.find((d) => d.key === "data")?.score).toBe(2);
    expect(s.weakest?.key).toBe("data");
    expect(s.overall).toBeCloseTo(3.7, 6);
    expect(s.level).toBe("Ready to pilot");
    expect(s.dimensions[0].label).toBe("Use case");
  });

  it("lets the last repeated key win and tolerates an empty list", () => {
    const s = summarizeReadiness({
      headline: "h",
      nextStep: "n",
      dimensions: [
        { key: "data", score: 1, note: "first" },
        { key: "data", score: 5, note: "second" },
      ],
    });
    expect(s.dimensions).toHaveLength(1);
    expect(s.dimensions[0].note).toBe("second");
    const empty = summarizeReadiness({ headline: "h", nextStep: "n", dimensions: [] });
    expect(empty.overall).toBe(0);
    expect(empty.weakest).toBeNull();
  });
});

describe("readinessInputSchema", () => {
  it("rejects unknown dimension keys and out-of-range scores", () => {
    expect(
      readinessInputSchema.safeParse({
        headline: "h",
        nextStep: "n",
        dimensions: [{ key: "budget", score: 3, note: "x" }],
      }).success,
    ).toBe(false);
    expect(
      readinessInputSchema.safeParse({
        headline: "h",
        nextStep: "n",
        dimensions: [{ key: "data", score: 9, note: "x" }],
      }).success,
    ).toBe(false);
  });

  it("emits a JSON schema with no format or pattern keywords", () => {
    const json = z.toJSONSchema(readinessInputSchema, { target: "draft-7", io: "input" });
    const keys = keysDeep(json);
    expect(keys.has("format")).toBe(false);
    expect(keys.has("pattern")).toBe(false);
    expect(JSON.stringify(json)).toContain(READINESS_DIMENSIONS[0].key);
  });
});
