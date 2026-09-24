import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BRIEF_KEYS,
  BRIEF_TOOL_NAME,
  consultingBriefSchema,
  findBrief,
  type ConsultingBrief,
} from "@/lib/brief-schema";

export const SAMPLE_BRIEF: ConsultingBrief = {
  organization: "40-person logistics company in Utah; ops manager",
  goal: "Reliable answers about our own SOPs instead of ChatGPT guesses",
  currentState: "300 Word docs on SharePoint, one owner, two Python developers",
  opportunities: [
    { title: "SOP question answering", why: "Docs exist and questions repeat", effort: "medium" },
  ],
  risks: [{ title: "Stale documents", mitigation: "Assign an owner and a review cadence" }],
  keepWithPeople: ["Exception approvals stay with the ops manager"],
  recommendedPath: { path: "consulting", reason: "Scope before building" },
  firstStep: "Inventory the SOPs and pick 20 real questions to test against",
  openQuestions: ["Who owns SOP accuracy?"],
};

function briefCall(id: string, input: unknown = SAMPLE_BRIEF): ModelMessage {
  return {
    role: "assistant",
    content: [{ type: "tool-call", toolCallId: id, toolName: BRIEF_TOOL_NAME, input }],
  };
}

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

describe("consultingBriefSchema", () => {
  it("accepts a slightly long field (caps are twice the display target)", () => {
    const long = { ...SAMPLE_BRIEF, organization: "x".repeat(150) };
    expect(consultingBriefSchema.safeParse(long).success).toBe(true);
    const tooLong = { ...SAMPLE_BRIEF, organization: "x".repeat(201) };
    expect(consultingBriefSchema.safeParse(tooLong).success).toBe(false);
  });

  it("only allows the four real Nexus paths", () => {
    const bad = { ...SAMPLE_BRIEF, recommendedPath: { path: "nvidia-partnership", reason: "x" } };
    expect(consultingBriefSchema.safeParse(bad).success).toBe(false);
  });

  it("emits a JSON schema free of format and pattern keywords", () => {
    const json = z.toJSONSchema(consultingBriefSchema, { target: "draft-7", io: "input" });
    const keys = keysDeep(json);
    expect(keys.has("format")).toBe(false);
    expect(keys.has("pattern")).toBe(false);
  });

  it("renders keys in a fixed order that covers every field", () => {
    expect([...BRIEF_KEYS].sort()).toEqual(Object.keys(consultingBriefSchema.shape).sort());
  });
});

describe("findBrief", () => {
  it("returns null when nothing was drafted", () => {
    expect(findBrief([])).toBeNull();
    expect(findBrief([{ role: "user", content: "hi" }])).toBeNull();
    expect(findBrief([{ role: "assistant", content: "plain text" }])).toBeNull();
  });

  it("returns the latest valid brief when no id is given", () => {
    const first = briefCall("a", { ...SAMPLE_BRIEF, goal: "first" });
    const second = briefCall("b", { ...SAMPLE_BRIEF, goal: "second" });
    expect(findBrief([first, { role: "user", content: "ok" }, second])?.goal).toBe("second");
  });

  it("prefers the brief whose toolCallId the model echoed", () => {
    const first = briefCall("a", { ...SAMPLE_BRIEF, goal: "first" });
    const second = briefCall("b", { ...SAMPLE_BRIEF, goal: "second" });
    expect(findBrief([first, second], "a")?.goal).toBe("first");
  });

  it("falls back to latest-wins when the echoed id is unknown", () => {
    const first = briefCall("a", { ...SAMPLE_BRIEF, goal: "first" });
    expect(findBrief([first], "zzz")?.goal).toBe("first");
  });

  it("ignores invalid or crafted inputs and other tools", () => {
    const junk = briefCall("j", { organization: "only this" });
    const other: ModelMessage = {
      role: "assistant",
      content: [{ type: "tool-call", toolCallId: "o", toolName: "recommendWorkshop", input: SAMPLE_BRIEF }],
    };
    expect(findBrief([junk, other])).toBeNull();
    expect(findBrief([junk, briefCall("ok")])?.goal).toBe(SAMPLE_BRIEF.goal);
  });
});
