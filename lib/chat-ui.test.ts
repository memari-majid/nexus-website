import { describe, expect, it } from "vitest";
import {
  APPROVAL_WAITING,
  FOCUSABLE_SELECTOR,
  NOT_SENT_COPY,
  SHEET_PANEL_QUERY,
  announcementFor,
  announcementText,
  betweenSteps,
  escapeClosesDialog,
  hasDraftedBrief,
  hasPendingApproval,
  hasUnsettledApproval,
  isNotSentReason,
  lockedBodyStyle,
  nextAnnouncement,
  notSentCopy,
  notSentStepLabel,
  readChatMetadata,
  scrollBehavior,
  statSummary,
  trapTabTarget,
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

describe("trapTabTarget", () => {
  it("wraps from the last control to the first and back", () => {
    expect(trapTabTarget(2, 3, false)).toBe(0);
    expect(trapTabTarget(0, 3, true)).toBe(2);
  });

  it("leaves a move inside the dialog to the browser", () => {
    expect(trapTabTarget(0, 3, false)).toBeUndefined();
    expect(trapTabTarget(1, 3, false)).toBeUndefined();
    expect(trapTabTarget(2, 3, true)).toBeUndefined();
    expect(trapTabTarget(1, 3, true)).toBeUndefined();
  });

  it("pulls focus back in when it sits outside the dialog", () => {
    expect(trapTabTarget(-1, 3, false)).toBe(0);
    expect(trapTabTarget(-1, 3, true)).toBe(2);
    expect(trapTabTarget(7, 3, false)).toBe(0);
  });

  it("cycles a single control onto itself and does nothing with none", () => {
    expect(trapTabTarget(0, 1, false)).toBe(0);
    expect(trapTabTarget(0, 1, true)).toBe(0);
    expect(trapTabTarget(-1, 0, false)).toBeUndefined();
    expect(trapTabTarget(0, 0, true)).toBeUndefined();
  });

  it("skips the dialog container and disabled controls in the focusable selector", () => {
    expect(FOCUSABLE_SELECTOR).toContain('[tabindex]:not([tabindex="-1"])');
    expect(FOCUSABLE_SELECTOR).toContain("button:not([disabled])");
    expect(FOCUSABLE_SELECTOR).toContain("input:not([disabled])");
    expect(FOCUSABLE_SELECTOR).toContain("select:not([disabled])");
    expect(FOCUSABLE_SELECTOR).toContain("a[href]");
  });
});

describe("escapeClosesDialog", () => {
  it("closes from anywhere except a native select", () => {
    expect(escapeClosesDialog("INPUT")).toBe(true);
    expect(escapeClosesDialog("BUTTON")).toBe(true);
    expect(escapeClosesDialog("DIV")).toBe(true);
    expect(escapeClosesDialog(undefined)).toBe(true);
    expect(escapeClosesDialog(null)).toBe(true);
    expect(escapeClosesDialog("SELECT")).toBe(false);
    expect(escapeClosesDialog("select")).toBe(false);
  });
});

describe("announcementFor", () => {
  const text = { type: "text", state: "done" };
  const requested = { type: "tool-handOffToMajid", state: "approval-requested" };
  const done = { type: "tool-handOffToMajid", state: "output-available" };

  it("announces the reply's own words when the turn has any", () => {
    expect(announcementFor({ id: "a1", text: "Start with a two week pilot.", parts: [text] })).toEqual({
      id: "a1",
      text: "Start with a two week pilot.",
    });
    expect(announcementFor({ id: "a1", text: "  Two week pilot.\n", parts: [text, requested] })).toEqual({
      id: "a1",
      text: "Two week pilot.",
    });
  });

  it("says an approval is waiting when the turn is only a card", () => {
    expect(announcementFor({ id: "a1", text: "", parts: [requested] })).toEqual({
      id: "a1",
      text: APPROVAL_WAITING,
    });
    expect(APPROVAL_WAITING).toContain("Send");
    expect(APPROVAL_WAITING).toContain("Not now");
  });

  it("has nothing to say for a wordless turn with no card waiting", () => {
    expect(announcementFor({ id: "a1", text: "", parts: [done] })).toBeUndefined();
    expect(announcementFor({ id: "a1", text: "   ", parts: [] })).toBeUndefined();
    expect(announcementFor(undefined)).toBeUndefined();
  });
});

describe("nextAnnouncement", () => {
  const reply = { id: "a1", text: "Start with a two week pilot." };

  it("announces a finished reply once and stays quiet while it streams", () => {
    expect(nextAnnouncement(reply, true, undefined)).toBeUndefined();
    expect(nextAnnouncement(reply, false, undefined)).toEqual(reply);
    expect(nextAnnouncement(reply, false, reply)).toBeUndefined();
  });

  it("announces a new message, or the same message once it has grown", () => {
    expect(nextAnnouncement({ id: "a2", text: reply.text }, false, reply)).toEqual({ id: "a2", text: reply.text });
    const grown = { id: "a1", text: `${reply.text} Sent to Majid.` };
    expect(nextAnnouncement(grown, false, reply)).toEqual(grown);
  });

  it("keeps a repeated reply distinguishable by id, so the live region can re-announce it", () => {
    const repeat = nextAnnouncement({ id: "a2", text: reply.text }, false, reply);
    expect(repeat).toBeDefined();
    expect(repeat!.text).toBe(reply.text);
    // The widget keys the live-region element by this id: same words, new
    // element, so a screen reader reads the second reply as well.
    expect(repeat!.id).not.toBe(reply.id);
  });

  it("has nothing to say without an assistant message or without text", () => {
    expect(nextAnnouncement(undefined, false, undefined)).toBeUndefined();
    expect(nextAnnouncement({ id: "a1", text: "   " }, false, undefined)).toBeUndefined();
  });

  it("trims the text it announces so whitespace changes do not repeat it", () => {
    expect(nextAnnouncement({ id: "a1", text: `  ${reply.text}\n` }, false, undefined)).toEqual(reply);
    expect(nextAnnouncement({ id: "a1", text: `  ${reply.text}\n` }, false, reply)).toBeUndefined();
  });
});

describe("announcementText", () => {
  it("reads markdown as plain prose", () => {
    expect(
      announcementText(
        "## Next step\n\nStart with a **two week** pilot on the [workshop page](/nvidia-dli-workshops).\n\n- Scope it\n- *Measure* it\n\nRun `vercel env pull` first.",
      ),
    ).toBe("Next step Start with a two week pilot on the workshop page. Scope it Measure it Run vercel env pull first.");
  });

  it("keeps underscores and asterisks that are part of words or maths", () => {
    expect(announcementText("Use snake_case names and 3 * 4 = 12")).toBe("Use snake_case names and 3 * 4 = 12");
  });

  it("drops code fences and quotes but keeps their text", () => {
    expect(announcementText("> Quoted line\n\n```ts\nconst a = 1;\n```")).toBe("Quoted line const a = 1;");
  });

  it("returns an empty string for empty or whitespace input", () => {
    expect(announcementText("")).toBe("");
    expect(announcementText(" \n ")).toBe("");
  });
});

describe("lockedBodyStyle", () => {
  it("pins the page at its current offset", () => {
    expect(lockedBodyStyle(240)).toEqual({
      position: "fixed",
      top: "-240px",
      left: "0",
      right: "0",
      width: "100%",
      overflow: "hidden",
    });
  });

  it("never produces a positive or fractional top", () => {
    expect(lockedBodyStyle(0).top).toBe("-0px");
    expect(lockedBodyStyle(-30).top).toBe("-0px");
    expect(lockedBodyStyle(12.6).top).toBe("-13px");
    expect(lockedBodyStyle(Number.NaN).top).toBe("-0px");
  });

  it("locks only the full-screen sheet below Tailwind's sm breakpoint", () => {
    expect(SHEET_PANEL_QUERY).toBe("(min-width: 40rem)");
  });
});

describe("scrollBehavior", () => {
  it("drops the smooth scroll for visitors who prefer reduced motion", () => {
    expect(scrollBehavior(false)).toBe("smooth");
    expect(scrollBehavior(true)).toBe("auto");
  });
});
