import { describe, expect, it } from "vitest";
import {
  NOT_SENT_COPY,
  betweenSteps,
  hasDraftedBrief,
  hasPendingApproval,
  hasUnsettledApproval,
  isNotSentReason,
  notSentCopy,
  notSentStepLabel,
  readChatMetadata,
  statSummary,
  wasNoted,
} from "@/lib/chat-ui";

describe("notSentCopy", () => {
  it("has a visitor sentence for every reason the sending tools return", () => {
    for (const reason of ["invalid-email", "rate-limited", "not-configured", "send-failed", "no-brief"]) {
      expect(isNotSentReason(reason)).toBe(true);
      expect(notSentCopy(reason)).toBe(NOT_SENT_COPY[reason as keyof typeof NOT_SENT_COPY]);
      expect(notSentCopy(reason)).toMatch(/\.$/);
    }
  });

  it("never claims delivery is disconnected for a crafted or missing reason", () => {
    expect(notSentCopy(undefined)).toBe("it could not be sent.");
    expect(notSentCopy("toString")).toBe("it could not be sent.");
    expect(notSentCopy({ reason: "not-configured" })).toBe("it could not be sent.");
    expect(isNotSentReason("constructor")).toBe(false);
  });
});

describe("not-sent step labels", () => {
  it("says noted only when the server logged the request", () => {
    expect(wasNoted("not-configured")).toBe(true);
    expect(notSentStepLabel("not-configured")).toBe("Noted, not emailed");
    for (const reason of ["invalid-email", "rate-limited", "send-failed", "no-brief", undefined, "toString"]) {
      expect(wasNoted(reason)).toBe(false);
      expect(notSentStepLabel(reason)).toBe("Not sent");
    }
  });
});

describe("approval state", () => {
  const text = { type: "text", state: "done" };
  const requested = { type: "tool-handOffToMajid", state: "approval-requested" };
  const responded = { type: "tool-handOffToMajid", state: "approval-responded" };
  const done = { type: "tool-handOffToMajid", state: "output-available" };

  it("locks the input while a card waits and until the answer has an output", () => {
    expect(hasPendingApproval([text, requested])).toBe(true);
    expect(hasUnsettledApproval([text, requested])).toBe(true);
    expect(hasPendingApproval([text, responded])).toBe(false);
    expect(hasUnsettledApproval([text, responded])).toBe(true);
    expect(hasPendingApproval([text, done])).toBe(false);
    expect(hasUnsettledApproval([text, done])).toBe(false);
    expect(hasUnsettledApproval([])).toBe(false);
  });

  it("ignores non-tool parts that happen to carry a state", () => {
    expect(hasUnsettledApproval([{ type: "text", state: "approval-requested" }])).toBe(false);
  });
});

describe("betweenSteps", () => {
  it("is true after a finished tool step or a step boundary", () => {
    expect(
      betweenSteps([{ type: "step-start" }, { type: "tool-draftConsultingBrief", state: "output-available" }]),
    ).toBe(true);
    expect(betweenSteps([{ type: "tool-draftConsultingBrief", state: "output-available" }, { type: "step-start" }])).toBe(
      true,
    );
    expect(betweenSteps([{ type: "tool-handOffToMajid", state: "output-denied" }])).toBe(true);
    expect(betweenSteps([{ type: "tool-draftConsultingBrief", state: "output-error" }])).toBe(true);
  });

  it("is false while text or a tool call is still streaming, or a card is waiting", () => {
    expect(betweenSteps([{ type: "tool-draftConsultingBrief", state: "input-streaming" }])).toBe(false);
    expect(betweenSteps([{ type: "tool-draftConsultingBrief", state: "input-available" }])).toBe(false);
    expect(betweenSteps([{ type: "tool-handOffToMajid", state: "approval-requested" }])).toBe(false);
    expect(betweenSteps([{ type: "tool-handOffToMajid", state: "approval-responded" }])).toBe(false);
    expect(betweenSteps([{ type: "step-start" }, { type: "text", state: "streaming" }])).toBe(false);
    expect(betweenSteps([{ type: "step-start" }, { type: "text", state: "done" }])).toBe(false);
    expect(betweenSteps([])).toBe(false);
  });
});

describe("hasDraftedBrief", () => {
  it("counts only a completed brief on an assistant turn", () => {
    const completed = { type: "tool-draftConsultingBrief", state: "output-available" };
    expect(hasDraftedBrief([{ role: "assistant", parts: [{ type: "text" }, completed] }])).toBe(true);
    expect(
      hasDraftedBrief([{ role: "assistant", parts: [{ type: "tool-draftConsultingBrief", state: "input-streaming" }] }]),
    ).toBe(false);
    expect(hasDraftedBrief([{ role: "user", parts: [completed] }])).toBe(false);
    expect(hasDraftedBrief([])).toBe(false);
  });
});

describe("readChatMetadata and statSummary", () => {
  it("renders the compact line from merged start and finish metadata", () => {
    const meta = readChatMetadata({
      model: "anthropic/claude-opus-5",
      modelLabel: "Claude Opus 5",
      budgetFallback: false,
      ttftMs: 900,
      totalMs: 6200,
      tokens: { input: 400, cacheRead: 5000, cacheWrite: 0, output: 300, reasoning: 0, total: 5700 },
      costUsd: 0.012,
    });
    expect(meta).toBeDefined();
    expect(statSummary(meta!)).toBe("Claude Opus 5 · first token 900ms · 6.2s · 5.7k tokens · $0.0120");
  });

  it("rejects metadata of the wrong shape instead of throwing", () => {
    expect(readChatMetadata({ totalMs: "fast" })).toBeUndefined();
    expect(readChatMetadata(null)).toBeUndefined();
  });
});
