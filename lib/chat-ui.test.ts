import { describe, expect, it } from "vitest";
import { ASSISTANT_NAME, FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import {
  APPROVAL_VALUE_CELL,
  APPROVAL_VALUE_CELL_UNBROKEN,
  APPROVAL_WAITING,
  CHAT_HEADER_ROW,
  CHAT_TOOL_NAMES,
  COMPOSER_ROW,
  FLOATING_PANEL_HEIGHT,
  FOCUSABLE_SELECTOR,
  INLINE_DEMO_HEIGHT,
  NOT_SENT_COPY,
  NO_SIDEWAYS_OVERFLOW,
  SHEET_PANEL_QUERY,
  TOOL_STEP_COPY,
  TRANSCRIPT_SCROLLER,
  announcementFor,
  announcementText,
  betweenSteps,
  errorRole,
  escapeClosesDialog,
  hasDraftedBrief,
  hasPendingApproval,
  hasUnsettledApproval,
  isNotSentReason,
  lockedBodyStyle,
  nextAnnouncement,
  notSentCopy,
  chatTitleId,
  displayAssistantText,
  friendlyError,
  isNearBottom,
  liveRegionMode,
  messageText,
  notSentStepLabel,
  readChatMetadata,
  scrollBehavior,
  splitSuggestions,
  stepRole,
  stripControlTokens,
  trapTabTarget,
  wasNoted,
} from "@/lib/chat-ui";

describe("notSentCopy", () => {
  it("has a visitor sentence for every reason the sending tools return", () => {
    const reasons = Object.keys(NOT_SENT_COPY);
    expect(reasons).toContain("no-note");
    for (const reason of reasons) {
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

describe("readChatMetadata", () => {
  it("reads the email flag the route streams on start and nothing else", () => {
    expect(readChatMetadata({ emailEnabled: false })).toEqual({ emailEnabled: false });
    // Anything about cost or the model is dropped, so no card can render it.
    expect(readChatMetadata({ emailEnabled: true, costUsd: 0.01, model: "x" })).toEqual({ emailEnabled: true });
  });

  it("rejects metadata of the wrong shape instead of throwing", () => {
    expect(readChatMetadata({ emailEnabled: "yes" })).toBeUndefined();
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

describe("assistant naming", () => {
  it("never ships the old name, and calls the founder Dr. Memari inside the chat", () => {
    expect(ASSISTANT_NAME).toBe("AI Consultant");
    expect(FOUNDER_CHAT_NAME).toBe("Dr. Memari");
    expect(APPROVAL_WAITING).toContain(ASSISTANT_NAME);
    expect(APPROVAL_WAITING).not.toMatch(/Dr\.? ?MJ/);
    expect(TOOL_STEP_COPY.handOffToMajid.title).toContain(FOUNDER_CHAT_NAME);
    expect(TOOL_STEP_COPY.emailMajidNote.sending).not.toMatch(/\bMajid\b/);
  });

  it("labels every tool the route exposes, with no dash punctuation anywhere", () => {
    for (const name of CHAT_TOOL_NAMES) {
      const copy = TOOL_STEP_COPY[name];
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.running.length).toBeGreaterThan(0);
      expect(copy.done.length).toBeGreaterThan(0);
      for (const line of [copy.title, copy.running, copy.done, copy.sending]) {
        expect(line).not.toMatch(/[\u2014\u2013]/);
        expect(line).not.toMatch(/Dr\.? ?MJ/);
      }
    }
    for (const line of [...Object.values(NOT_SENT_COPY), APPROVAL_WAITING]) {
      expect(line).not.toMatch(/[\u2014\u2013]/);
    }
  });

  it("covers the ten tools the assistant can call", () => {
    expect(CHAT_TOOL_NAMES).toHaveLength(10);
    expect(CHAT_TOOL_NAMES).toContain("lookupSiteFacts");
    expect(CHAT_TOOL_NAMES).toContain("estimateProject");
    expect(CHAT_TOOL_NAMES).toContain("draftOutreachNote");
    expect(CHAT_TOOL_NAMES).toContain("emailMajidNote");
  });
});

describe("dom ids", () => {
  it("prefixes every id, so two mounted shells never collide", () => {
    expect(chatTitleId(":r1:")).toBe(":r1:-title");
    expect(chatTitleId(":r1:")).not.toBe(chatTitleId(":r2:"));
  });
});

describe("fit", () => {
  it("caps the floating panel against the dynamic viewport minus its insets", () => {
    expect(FLOATING_PANEL_HEIGHT).toContain("dvh");
    expect(FLOATING_PANEL_HEIGHT).not.toContain("100vh");
    // `p-4` at sm is 2rem of inset, `p-6` at md is 3rem: both are subtracted.
    expect(FLOATING_PANEL_HEIGHT).toContain("sm:h-[min(36rem,calc(100dvh-2rem))]");
    expect(FLOATING_PANEL_HEIGHT).toContain("md:h-[min(38rem,calc(100dvh-3rem))]");
  });

  it("gives the inline demo a fixed desktop height between 560 and 640 px", () => {
    const desktop = /sm:h-\[([\d.]+)rem\]/.exec(INLINE_DEMO_HEIGHT);
    expect(desktop).not.toBeNull();
    const px = Number(desktop![1]) * 16;
    expect(px).toBeGreaterThanOrEqual(560);
    expect(px).toBeLessThanOrEqual(640);
    expect(INLINE_DEMO_HEIGHT).toMatch(/max-h-\[calc\(100dvh-[\d.]+rem\)\]/);
  });

  it("floors the inline demo above the rows that cannot shrink", () => {
    // The floor must exceed the sum of the fixed rows. The frame is
    // overflow-hidden and the transcript is the only child that gives space
    // back, so once the dvh cap drops under header + composer the surplus is
    // clipped. Measured with the tab strip and toolbar that used to sit with
    // them: about 250 px at 640 px wide, about 290 px once the header subtitle
    // and the composer fine print wrap on a 360 px phone, so the floor is
    // conservative now. A 640x360 frame without the floor measured 216 px
    // against 274 px of content, which put the input 19 px past the edge and
    // hid the contact-form fallback link with no way to scroll to it.
    const floor = /min-h-\[([\d.]+)rem\]/.exec(INLINE_DEMO_HEIGHT);
    expect(floor).not.toBeNull();
    expect(Number(floor![1]) * 16).toBeGreaterThanOrEqual(300);
    // One min-height only: two of them tie on specificity and the winner is
    // whichever Tailwind emits last, not the one written last.
    expect(INLINE_DEMO_HEIGHT.match(/min-h-/g)).toHaveLength(1);
  });

  it("scrolls the transcript, never the page, and never squeezes the composer out", () => {
    expect(TRANSCRIPT_SCROLLER).toContain("min-h-0");
    expect(TRANSCRIPT_SCROLLER).toContain("flex-1");
    expect(TRANSCRIPT_SCROLLER).toContain("overflow-y-auto");
    expect(TRANSCRIPT_SCROLLER).toContain("overscroll-contain");
  });

  it("pins the composer above the home indicator", () => {
    expect(COMPOSER_ROW).toContain("shrink-0");
    expect(COMPOSER_ROW).toContain("env(safe-area-inset-bottom)");
  });

  it("holds every row but the transcript at its natural height", () => {
    // The scroller is the only child with a zero flex basis, so it carries no
    // weight when a short frame has space to take back. Any other row without
    // `shrink-0` absorbs the lot and the composer is clipped: a 640x360 phone
    // in landscape leaves the inline frame about 216 px.
    expect(CHAT_HEADER_ROW).toContain("shrink-0");
    expect(COMPOSER_ROW).toContain("shrink-0");
  });

  it("breaks a long email address instead of widening the approval card", () => {
    // `break-words` alone does not shrink a grid track: the wrap opportunities
    // it adds are excluded from min-content sizing, so `min-w-0` has to be
    // there too, and an address has no spaces to break at.
    expect(APPROVAL_VALUE_CELL).toContain("min-w-0");
    expect(APPROVAL_VALUE_CELL).toContain("break-words");
    expect(APPROVAL_VALUE_CELL_UNBROKEN).toContain("min-w-0");
    expect(APPROVAL_VALUE_CELL_UNBROKEN).toContain("break-all");
  });

  it("keeps every card inside its column", () => {
    expect(NO_SIDEWAYS_OVERFLOW).toContain("min-w-0");
    expect(NO_SIDEWAYS_OVERFLOW).toContain("max-w-full");
    expect(NO_SIDEWAYS_OVERFLOW).toContain("break-words");
  });
});

describe("isNearBottom", () => {
  const box = (scrollTop: number) => ({ scrollTop, scrollHeight: 1000, clientHeight: 400 });

  it("follows the conversation only from the bottom of it", () => {
    expect(isNearBottom(box(600))).toBe(true);
    expect(isNearBottom(box(540))).toBe(true);
    expect(isNearBottom(box(535))).toBe(false);
    expect(isNearBottom(box(0))).toBe(false);
  });

  it("counts a transcript shorter than its box as at the bottom", () => {
    expect(isNearBottom({ scrollTop: 0, scrollHeight: 200, clientHeight: 400 })).toBe(true);
  });

  it("takes a custom threshold and survives a box with no measurements", () => {
    expect(isNearBottom(box(500), 200)).toBe(true);
    expect(isNearBottom(box(500), 10)).toBe(false);
    expect(
      isNearBottom({ scrollTop: Number.NaN, scrollHeight: Number.NaN, clientHeight: 0 }),
    ).toBe(true);
  });
});

describe("liveRegionMode", () => {
  it("lets exactly one surface speak", () => {
    expect(liveRegionMode(true)).toBe("polite");
    expect(liveRegionMode(false)).toBe("off");
  });
});

describe("stepRole and errorRole", () => {
  it("gives a running step an implicit live region only on the speaking surface", () => {
    expect(stepRole(true, true)).toBe("status");
    expect(stepRole(true, false)).toBeUndefined();
    expect(stepRole(false, true)).toBeUndefined();
    expect(stepRole(false, false)).toBeUndefined();
  });

  it("silences the transcript's error line on the surface that is not speaking", () => {
    expect(errorRole(true)).toBe("alert");
    expect(errorRole(false)).toBeUndefined();
  });
});

describe("messageText", () => {
  it("joins the text parts in order and ignores everything else", () => {
    expect(
      messageText({
        parts: [
          { type: "step-start" },
          { type: "text", text: "Start with " },
          { type: "tool-draftConsultingBrief" },
          { type: "text", text: "a pilot." },
        ],
      }),
    ).toBe("Start with a pilot.");
    expect(messageText({ parts: [] })).toBe("");
  });
});

describe("splitSuggestions", () => {
  it("keeps the marker out of the transcript and turns the rest into at most two chips", () => {
    const { body, suggestions, none } = splitSuggestions(
      "Start with a two week pilot.\n\nSUGGESTIONS: Draft a brief | Rate our readiness | What should we fix first?",
    );
    expect(body).toBe("Start with a two week pilot.");
    expect(suggestions).toEqual(["Draft a brief", "Rate our readiness"]);
    expect(none).toBe(false);
  });

  it("reports the explicit none line, so a question to the visitor gets no chips", () => {
    for (const line of ["SUGGESTIONS: none", "SUGGESTIONS: None.", "SUGGESTIONS:none "]) {
      const { body, suggestions, none } = splitSuggestions(`What does your team build?\n\n${line}`);
      expect(body).toBe("What does your team build?");
      expect(suggestions).toEqual([]);
      expect(none).toBe(true);
    }
  });

  it("leaves a reply without the marker alone", () => {
    expect(splitSuggestions("No chips here.")).toEqual({ body: "No chips here.", suggestions: [], none: false });
  });

  it("drops an empty or absurdly long option while the line is still streaming", () => {
    const { suggestions } = splitSuggestions(`Body.\n\nSUGGESTIONS: a |  | ${"x".repeat(80)} | Fine one`);
    expect(suggestions).toEqual(["Fine one"]);
  });
});

describe("stripControlTokens", () => {
  it("keeps only the final channel of a harmony reply", () => {
    expect(
      stripControlTokens(
        "<|channel|>analysis<|message|>thinking out loud<|channel|>final<|message|>The answer.",
      ),
    ).toBe("The answer.");
  });

  it("removes stray control tokens from ordinary text", () => {
    expect(stripControlTokens("Hello <|end|>there")).toBe("Hello there");
    expect(stripControlTokens("Plain reply")).toBe("Plain reply");
  });
});

describe("displayAssistantText", () => {
  it("turns a gateway configuration error into the setup line", () => {
    const shown = displayAssistantText('{"error":"AI Gateway unauthorized"}');
    expect(shown).toContain("AI Gateway");
    expect(shown).toContain("contact form");
  });

  it("leaves ordinary JSON-looking prose alone", () => {
    expect(displayAssistantText('{"ok":true}')).toBe('{"ok":true}');
    expect(displayAssistantText("Just prose.")).toBe("Just prose.");
  });
});

describe("friendlyError", () => {
  it("points a long conversation at the New button", () => {
    expect(friendlyError("Conversation is getting long")).toContain("Tap New");
    expect(friendlyError("Please start a new chat")).toContain("Tap New");
  });

  it("always says something", () => {
    expect(friendlyError("")).toContain("contact form");
    expect(friendlyError("Rate limit reached. Try again in a minute.")).toBe(
      "Rate limit reached. Try again in a minute.",
    );
  });
});
