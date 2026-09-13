import { describe, expect, it } from "vitest";
import { z } from "zod";
import { hasDash } from "@/lib/plain-punctuation";
import {
  estimateInputSchema,
  estimateProject,
  kindLabel,
  type EstimateInput,
} from "@/lib/estimate";

const base: EstimateInput = {
  goal: "Answer ops questions from our own SOPs instead of a public chatbot",
  components: [
    { name: "Search over the SOP library", kind: "retrieval", complexity: "medium" },
    { name: "Answer quality checks", kind: "evaluation", complexity: "low" },
  ],
  dataReadiness: "partly-ready",
  teamCapacity: "small-team",
};

const withData = (dataReadiness: EstimateInput["dataReadiness"]): EstimateInput => ({
  ...base,
  dataReadiness,
});

describe("estimateProject", () => {
  it("returns four phases whose weeks add up to the total", () => {
    const out = estimateProject(base);
    expect(out.phases.map((p) => p.name)).toEqual([
      "Discovery",
      "Build",
      "Evaluation and hardening",
      "Adoption",
    ]);
    expect(out.totalLow).toBe(out.phases.reduce((sum, p) => sum + p.low, 0));
    expect(out.totalHigh).toBe(out.phases.reduce((sum, p) => sum + p.high, 0));
    expect(out.totalHigh).toBeGreaterThanOrEqual(out.totalLow);
  });

  it("is deterministic: the same input gives the same weeks", () => {
    expect(estimateProject(base)).toEqual(estimateProject(base));
  });

  it("widens rather than narrows when nobody has looked at the data", () => {
    const ready = estimateProject(withData("ready"));
    const unknown = estimateProject(withData("unknown"));
    expect(unknown.totalHigh).toBeGreaterThan(ready.totalHigh);
    expect(unknown.drivers.join(" ")).toContain("data");
    expect(unknown.biggestUnknown).toContain("data");
  });

  it("stretches the calendar when one engineer would carry it", () => {
    const team = estimateProject(base);
    const solo = estimateProject({ ...base, teamCapacity: "one-engineer" });
    expect(solo.totalHigh).toBeGreaterThan(team.totalHigh);
  });

  it("shortens when a platform team would build it", () => {
    const platform = estimateProject({ ...base, teamCapacity: "platform-team" });
    expect(platform.totalHigh).toBeLessThanOrEqual(estimateProject(base).totalHigh);
    expect(platform.drivers.join(" ")).toContain("platform team");
  });

  it("names the hard pieces and offers to cut one", () => {
    const out = estimateProject({
      ...base,
      components: [
        { name: "Multi-agent dispatch", kind: "agent", complexity: "high" },
        { name: "Search over the SOP library", kind: "retrieval", complexity: "medium" },
      ],
    });
    expect(out.drivers.join(" ")).toContain("Multi-agent dispatch");
    expect(out.whatShrinksIt).toContain("Multi-agent dispatch");
  });

  it("prefers the open question the model supplied as the biggest unknown", () => {
    const out = estimateProject({
      ...base,
      openQuestions: ["Whether legal will allow the SOPs to leave the network."],
    });
    expect(out.biggestUnknown).toBe("Whether legal will allow the SOPs to leave the network.");
  });

  it("always labels itself a planning range, never a quote", () => {
    const out = estimateProject(base);
    expect(out.disclaimer).toContain("Planning range");
    expect(out.disclaimer).toContain("not a quote");
    expect(hasDash(out.disclaimer)).toBe(false);
  });

  it("never returns a phase of less than one week", () => {
    const tiny = estimateProject({
      ...base,
      components: [{ name: "Route a form", kind: "classification", complexity: "low" }],
      dataReadiness: "ready",
      teamCapacity: "platform-team",
    });
    for (const phase of tiny.phases) expect(phase.low, phase.name).toBeGreaterThanOrEqual(1);
  });
});

describe("estimateInputSchema", () => {
  it("keeps the JSON schema free of format keywords and regex", () => {
    const json = JSON.stringify(
      z.toJSONSchema(estimateInputSchema, { target: "draft-7", io: "input" }),
    );
    expect(json).not.toContain('"format"');
    expect(json).not.toContain('"pattern"');
  });

  it("refuses an empty component list and caps it at eight", () => {
    expect(estimateInputSchema.safeParse({ ...base, components: [] }).success).toBe(false);
    const nine = Array.from({ length: 9 }, (_, i) => ({
      name: `part ${i}`,
      kind: "integration" as const,
      complexity: "low" as const,
    }));
    expect(estimateInputSchema.safeParse({ ...base, components: nine }).success).toBe(false);
  });

  it("refuses a kind that is not work Nexus delivers", () => {
    const parsed = estimateInputSchema.safeParse({
      ...base,
      components: [{ name: "Blockchain", kind: "blockchain", complexity: "low" }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("kindLabel", () => {
  it("falls back rather than throwing on a crafted value", () => {
    expect(kindLabel("retrieval")).toContain("Retrieval");
    expect(kindLabel("nonsense")).toBe("Work item");
    expect(kindLabel(undefined)).toBe("Work item");
  });
});
