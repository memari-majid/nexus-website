/**
 * Client-side view of the chat tools: the typed UI message and tool parts
 * (derived from the route's tool set), the step labels for each tool, and the
 * small presentation helpers the widget needs (picker storage, stat
 * formatting, defensive readers for echoed data).
 *
 * Client-safe: type-only `ai` and `chat-tools` imports, no React, no
 * `process.env`. Never import a value from `lib/chat-tools.ts` here.
 */

import type { DeepPartial, ToolUIPart } from "ai";
import { SUGGESTION_MARKER } from "@/lib/assistant";
import type { ConsultingBrief } from "@/lib/brief-schema";
import { ASSISTANT_NAME, FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import { chatMessageMetadataSchema, type ChatMessageMetadata } from "@/lib/chat-metadata";
import { findModel, formatUsd } from "@/lib/chat-models";
import type { ChatUITools, NexusUIMessage, NotSentReason } from "@/lib/chat-tools";

/** The `reason` union of the three sending tools, re-exported so cards never import the server module. */
export type { NotSentReason } from "@/lib/chat-tools";
import { READINESS_DIMENSIONS, type ReadinessInput, type ReadinessKey } from "@/lib/readiness";

/**
 * Tool input and output types come straight from the route's `chatTools`
 * (`InferUITools`), through a type-only import that the bundler erases, so the
 * cards are checked against the real `execute` shapes and cannot drift.
 */
export type { ChatUITools } from "@/lib/chat-tools";

export type ChatToolName = keyof ChatUITools;

export type ChatUIMessage = NexusUIMessage;

export type ChatToolPart = ToolUIPart<ChatUITools>;

export type ChatToolPartOf<NAME extends ChatToolName> = Extract<ChatToolPart, { type: `tool-${NAME}` }>;

/** What the widget sees while the brief is still being typed out. */
export type PartialBrief = DeepPartial<ConsultingBrief>;

export const CHAT_TOOL_NAMES: readonly ChatToolName[] = [
  "lookupSiteFacts",
  "recommendWorkshop",
  "draftConsultingBrief",
  "assessReadiness",
  "estimateProject",
  "draftOutreachNote",
  "handOffToMajid",
  "emailMajidNote",
  "emailBriefToVisitor",
  "emailWorkshopInfo",
];

export function isChatToolName(name: string): name is ChatToolName {
  return (CHAT_TOOL_NAMES as readonly string[]).includes(name);
}

/** Visible step labels. Running rows get an ellipsis appended by the UI. */
export const TOOL_STEP_COPY: Record<
  ChatToolName,
  { title: string; running: string; done: string; sending: string }
> = {
  lookupSiteFacts: {
    title: "Checking the site",
    running: "Looking up what this site publishes",
    done: "Grounded in published facts",
    sending: "",
  },
  recommendWorkshop: {
    title: "Training match",
    running: "Checking the NVIDIA catalog",
    done: "Matched a workshop",
    sending: "",
  },
  draftConsultingBrief: {
    title: "Consulting brief",
    running: "Drafting your consulting brief",
    done: "Brief drafted",
    sending: "",
  },
  assessReadiness: {
    title: "Readiness snapshot",
    running: "Scoring AI readiness",
    done: "Readiness scored",
    sending: "",
  },
  estimateProject: {
    title: "Effort estimate",
    running: "Sizing the work",
    done: "Estimate ready",
    sending: "",
  },
  draftOutreachNote: {
    title: "Note to send",
    running: "Drafting your note",
    done: "Note drafted",
    sending: "",
  },
  handOffToMajid: {
    title: `Hand-off to ${FOUNDER_CHAT_NAME}`,
    running: "Preparing the hand-off",
    done: "Hand-off filed",
    sending: `Sending to ${FOUNDER_CHAT_NAME}`,
  },
  emailMajidNote: {
    title: `Note to ${FOUNDER_CHAT_NAME}`,
    running: "Preparing the note",
    done: "Note emailed",
    sending: "Sending the note",
  },
  emailBriefToVisitor: {
    title: "Your copy of the brief",
    running: "Preparing your copy",
    done: "Brief emailed",
    sending: "Sending your copy",
  },
  emailWorkshopInfo: {
    title: "Workshop details",
    running: "Preparing the workshop details",
    done: "Details emailed",
    sending: "Sending the details",
  },
};

/* ---------- Delivery outcomes ---------- */

/**
 * Visitor copy for each `reason` a sending tool returns with `delivered:
 * false`. Each line is a complete sentence so the cards can follow it with the
 * contact-form fallback.
 */
export const NOT_SENT_COPY: Record<NotSentReason, string> = {
  "invalid-email": "that email address did not look valid. Check it and ask me to try again.",
  "rate-limited": "this network has used today's email allowance.",
  "not-configured": "email delivery is not connected on this site yet.",
  "send-failed": "the email service rejected the message.",
  "no-brief": "no brief has been drafted yet. Ask me to draft one first.",
  "no-note": "no note has been drafted yet. Ask me to draft one first.",
};

const GENERIC_NOT_SENT = "it could not be sent.";

/** Echoed outputs are untrusted: an unknown or crafted reason gets the generic line. */
export function isNotSentReason(v: unknown): v is NotSentReason {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(NOT_SENT_COPY, v);
}

export function notSentCopy(reason: unknown): string {
  return isNotSentReason(reason) ? NOT_SENT_COPY[reason] : GENERIC_NOT_SENT;
}

/**
 * "Noted" is only true for `not-configured`: the tool reached the send step
 * and the server logged the message. Every other reason returned before
 * anything was recorded, so the step row and the card say "Not sent" there.
 */
export function wasNoted(reason: unknown): boolean {
  return reason === "not-configured";
}

/** Step-row label for a `delivered: false` outcome. */
export function notSentStepLabel(reason: unknown): string {
  return wasNoted(reason) ? "Noted, not emailed" : "Not sent";
}

/* ---------- Turn state (pure, so the widget rules are testable) ---------- */

/** The subset of a UI part the turn-state helpers read. */
export type PartLike = { type: string; state?: string };

function isToolPartLike(p: PartLike): boolean {
  return p.type.startsWith("tool-");
}

/** A tool call is waiting on the visitor's Send or Not now click. */
export function hasPendingApproval(parts: readonly PartLike[]): boolean {
  return parts.some((p) => isToolPartLike(p) && p.state === "approval-requested");
}

/**
 * A tool call is waiting on the visitor, or the visitor has answered and the
 * re-send that executes (or drops) the call has not produced its output yet.
 * While this is true the transcript must not gain a new user message: the
 * server throws on an unanswered request, and it runs an answered one only
 * when the answer is the last thing in the conversation.
 */
export function hasUnsettledApproval(parts: readonly PartLike[]): boolean {
  return parts.some(
    (p) =>
      isToolPartLike(p) && (p.state === "approval-requested" || p.state === "approval-responded"),
  );
}

/**
 * True when a streaming turn has nothing moving on screen: the last part is a
 * finished tool step or a step boundary, so the model is composing its next
 * step. The widget shows the thinking row then.
 */
export function betweenSteps(parts: readonly PartLike[]): boolean {
  const last = parts[parts.length - 1];
  if (!last) return false;
  if (last.type === "step-start") return true;
  return (
    isToolPartLike(last) &&
    (last.state === "output-available" ||
      last.state === "output-error" ||
      last.state === "output-denied")
  );
}

/**
 * A completed consulting brief exists in the transcript, which is what the
 * server's `findBrief` attaches to a hand-off whether or not the model passed
 * its id.
 */
export function hasDraftedBrief(
  messages: readonly { role: string; parts: readonly PartLike[] }[],
): boolean {
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      m.parts.some((p) => p.type === "tool-draftConsultingBrief" && p.state === "output-available"),
  );
}

/* ---------- Model picker ---------- */

/** localStorage key for the visitor's picker choice. */
export const MODEL_STORAGE_KEY = "nexus:chat-model";

/** True only for ids in the allowlist, so a stale stored value cannot leak through. */
export function isChatModelId(id: unknown): id is string {
  return findModel(id) !== undefined;
}

/** Display name for a gateway id, or the raw id when it is not in the list. */
export function modelLabel(id: string | undefined): string {
  if (!id) return "";
  return findModel(id)?.label ?? id;
}

/* ---------- Per-reply stats ---------- */

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Metadata is whatever the stream carried; validate before rendering. */
export function readChatMetadata(raw: unknown): ChatMessageMetadata | undefined {
  const parsed = chatMessageMetadataSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
}

/** Compact one-liner: "Claude Opus 5 · first token 0.9s · 6.2s · 3.4k tokens · $0.0210" */
export function statSummary(meta: ChatMessageMetadata): string {
  const bits: string[] = [];
  const label = meta.modelLabel || modelLabel(meta.model);
  if (label) bits.push(label);
  if (meta.ttftMs != null) bits.push(`first token ${formatMs(meta.ttftMs)}`);
  if (meta.totalMs != null) bits.push(formatMs(meta.totalMs));
  if (meta.tokens) bits.push(`${formatTokens(meta.tokens.total)} tokens`);
  if (meta.costUsd != null) bits.push(formatUsd(meta.costUsd));
  return bits.join(" · ");
}

/* ---------- Readiness ---------- */

function isReadinessKey(v: unknown): v is ReadinessKey {
  return typeof v === "string" && READINESS_DIMENSIONS.some((d) => d.key === v);
}

/**
 * Reads readiness data from the streaming partial input, the tool output, or
 * an echoed transcript (all three carry `dimensions`, `headline`, `nextStep`)
 * and returns a clean input for `summarizeReadiness`, so the card always shows
 * a verdict recomputed from the scores. Dimensions without a numeric score yet
 * are skipped, which is what hides them while the call streams.
 */
export function readReadinessInput(raw: unknown): ReadinessInput | undefined {
  const src = asRecord(raw);
  const items = Array.isArray(src.dimensions) ? src.dimensions : [];
  const dimensions: ReadinessInput["dimensions"] = [];
  for (const item of items) {
    const d = asRecord(item);
    if (!isReadinessKey(d.key) || typeof d.score !== "number" || !Number.isFinite(d.score)) continue;
    dimensions.push({ key: d.key, score: d.score, note: typeof d.note === "string" ? d.note : "" });
  }
  const headline = typeof src.headline === "string" ? src.headline : "";
  const nextStep = typeof src.nextStep === "string" ? src.nextStep : "";
  if (dimensions.length === 0 && !headline) return undefined;
  return { headline, dimensions, nextStep };
}

/* ---------- Dialog accessibility (pure, so the widget rules are testable) ---------- */

/** Elements a Tab press can land on inside the dialog. The container itself carries tabindex -1 and is skipped. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Mirrors Tailwind's `sm` breakpoint. Below it the chat is a full-screen sheet, above it a floating panel. */
export const SHEET_PANEL_QUERY = "(min-width: 40rem)";

/**
 * Where a trapped Tab should land, as an index into the dialog's focusable
 * elements, or undefined to let the browser move focus on its own. Focus
 * outside the list (index -1, for instance on the body after a backdrop
 * click) is pulled back to the first or last element.
 */
export function trapTabTarget(activeIndex: number, count: number, shift: boolean): number | undefined {
  if (count <= 0) return undefined;
  if (activeIndex < 0 || activeIndex >= count) return shift ? count - 1 : 0;
  if (shift) return activeIndex === 0 ? count - 1 : undefined;
  return activeIndex === count - 1 ? 0 : undefined;
}

/**
 * Escape closes the dialog unless focus sits on a native select: there the
 * key closes the open option list first, and the dialog must stay put.
 */
export function escapeClosesDialog(targetTagName: string | undefined | null): boolean {
  return (targetTagName ?? "").toUpperCase() !== "SELECT";
}

/**
 * What the live region last received, so a reply is announced once, not per
 * token. The widget keeps the whole object and renders the text in an element
 * keyed by `id`: two replies that happen to use the same words are two
 * different elements, so the second one is announced too.
 */
export type Announcement = { id: string; text: string };

/**
 * What a turn that ends with an approval card and no words says instead.
 * Silence there would leave a screen reader with a Send button and no reason
 * for it.
 */
export const APPROVAL_WAITING = `The ${ASSISTANT_NAME} needs your approval before sending. Choose Send or Not now.`;

/**
 * What the live region should carry for the last assistant turn: the reply's
 * prose, or, when the turn produced only an approval card, the line that says
 * a decision is waiting. Undefined when there is no assistant turn yet, or
 * when it has neither words nor a card.
 */
export function announcementFor(
  message: { id: string; text: string; parts: readonly PartLike[] } | undefined,
): Announcement | undefined {
  if (!message) return undefined;
  const text = message.text.trim();
  if (text) return { id: message.id, text };
  if (hasPendingApproval(message.parts)) return { id: message.id, text: APPROVAL_WAITING };
  return undefined;
}

/**
 * The next thing the visually hidden live region should announce: the last
 * assistant message's announcement once the turn has finished, or undefined
 * while a reply is still streaming, when there is nothing to say, or when
 * that exact text for that message was already announced. A message that
 * grows after an approval re-send (same id, more text) is announced again in
 * full.
 */
export function nextAnnouncement(
  current: Announcement | undefined,
  busy: boolean,
  previous: Announcement | undefined,
): Announcement | undefined {
  if (busy || !current) return undefined;
  const text = current.text.trim();
  if (!text) return undefined;
  if (previous && previous.id === current.id && previous.text === text) return undefined;
  return { id: current.id, text };
}

/**
 * Plain text for a screen reader from the markdown the assistant writes:
 * links keep their label, emphasis and code markers go, headings and bullets
 * lose their prefix, and line breaks collapse to spaces.
 */
export function announcementText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ""))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1$2")
    .replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Inline styles that freeze the page behind the full-screen sheet, including
 * on iOS Safari, which scrolls through `overflow: hidden`. The negative top
 * keeps the page where it was; the widget restores the scroll offset on
 * release.
 */
export function lockedBodyStyle(scrollY: number): Record<string, string> {
  const top = Number.isFinite(scrollY) && scrollY > 0 ? Math.round(scrollY) : 0;
  return {
    position: "fixed",
    top: `-${top}px`,
    left: "0",
    right: "0",
    width: "100%",
    overflow: "hidden",
  };
}

/** Smooth scrolling only for visitors who have not asked for reduced motion. */
export function scrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}

/* ---------- Surfaces, ids, and fit ---------- */

/**
 * The two places the same conversation is rendered: the floating panel that
 * follows the visitor around the site, and the inline demo that sits in the
 * page flow on the homepage. Both read one store, so a conversation started
 * in one continues in the other.
 */
export type ChatSurface = "floating" | "inline";

/**
 * Both shells can be mounted at once, so every id is prefixed with the
 * shell's own `useId()` value. Hardcoded ids would give the model picker two
 * labels and leave `aria-labelledby` pointing at the wrong heading.
 */
export function chatTitleId(prefix: string): string {
  return `${prefix}-title`;
}

export function chatModelId(prefix: string): string {
  return `${prefix}-model`;
}

/**
 * Height of the floating panel. Full screen below `sm` (a sheet), and above
 * it a panel capped against the dynamic viewport minus its own insets: `p-4`
 * at `sm` is 2rem of inset, `p-6` at `md` is 3rem. `dvh` units, not `vh`, so
 * the browser chrome and the on-screen keyboard shrink the panel instead of
 * pushing the composer out of sight.
 */
export const FLOATING_PANEL_HEIGHT =
  "h-full sm:h-[min(36rem,calc(100dvh-2rem))] md:h-[min(38rem,calc(100dvh-3rem))]";

/**
 * Height of the inline demo frame: fixed and predictable, 512 px on a phone
 * and 600 px from `sm`, so the section never grows as the conversation does.
 * The `dvh` cap shrinks the frame on a short laptop, and the floor is what
 * stops the cap from shrinking it into nothing.
 *
 * The floor is the load bearing half. The frame is `overflow-hidden` and its
 * rows are fixed: tab strip, header, toolbar and composer measure about
 * 250 px at 640 px wide, and about 290 px once the header subtitle and the
 * composer's fine print wrap on a 360 px phone. Only the transcript can give
 * space back, so under a viewport of roughly 420 px the cap alone took the
 * rest out of the composer: the input sat past the frame edge and the fine
 * print, with its contact-form fallback link, was clipped out of reach with
 * no way to scroll to it. 20rem keeps the composer and its fine print inside
 * the frame at every size measured; what it does not buy is a roomy
 * transcript, which is left 67.9 px at 640x360 and 30 px at 360x400 against
 * 491 px of content, and scrolls hard. Below the floor the page scrolls
 * instead of the frame clipping, which is what majidmemari.com does with the
 * same 320 px value. With JavaScript off the no-JS line takes the fine
 * print's place rather than stacking above it, for the same reason: two of
 * them do not fit here.
 *
 * Whatever owns the inline box applies this and nothing inside it sets a
 * second height, or the composer is pushed past the frame. Nothing may put a
 * second min-height on that element either: two `min-h` utilities tie on
 * specificity, so the winner would be whichever one Tailwind happens to emit
 * last, not the one written last in the class list.
 */
export const INLINE_DEMO_HEIGHT =
  "h-[32rem] sm:h-[37.5rem] min-h-[20rem] max-h-[calc(100dvh-9rem)]";

/**
 * A box whose content really is wider than the column it sits in and scrolls
 * sideways, such as the published evaluations table. Measure before reaching
 * for it: a table that fits its box wants a plain wrapper, because this one
 * announces a region called "scroll sideways" and takes a tab stop, and both
 * are a lie when nothing scrolls. A scroll container is operable by mouse and
 * by touch for free, and by nobody else unless it can take focus, so the
 * element that carries this must also carry
 * `tabIndex={0}`, `role="region"` and an `aria-label` naming what scrolls.
 * Without them a keyboard-only visitor on a phone never reaches the columns
 * past the right edge. The ring is `focus-visible` so a mouse click inside
 * the box does not light it up, and it sits on the box edge rather than an
 * offset, so it reads the same on white and on the page's tinted background.
 */
export const SIDEWAYS_SCROLL_REGION =
  "min-w-0 overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

/**
 * The transcript scroller. `min-h-0` is what keeps the composer pinned: a
 * flex child defaults to `min-height: auto` and would otherwise grow with its
 * content and push the composer past the bottom edge.
 */
export const TRANSCRIPT_SCROLLER = "min-h-0 flex-1 overflow-y-auto overscroll-contain";

/**
 * The header row. `shrink-0` is not decoration: the transcript is the only
 * child with `flex-basis: 0`, so it carries no weight when the box has to give
 * space back, and every pixel of a short frame would come out of the other
 * rows. The header is itself a flex container, so its automatic minimum size
 * is content-based and it refuses to shrink; the surplus would then overflow
 * the frame, which is `overflow-hidden`, and clip the bottom of the composer.
 * A 640x360 phone in landscape is the case this covers.
 */
export const CHAT_HEADER_ROW =
  "flex shrink-0 min-w-0 items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800";

/** The toolbar row, under the header. Fixed height for the same reason. */
export const CHAT_TOOLBAR_ROW =
  "flex shrink-0 items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800";

/** The composer row: never scrolls away, and clears the home indicator on iOS. */
export const COMPOSER_ROW =
  "shrink-0 space-y-3 border-t border-zinc-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-zinc-800";

/**
 * The value cell of the approval card's field list. `min-w-0` is the load
 * bearing half: per CSS Text 3 the soft wrap opportunities `break-words`
 * introduces are excluded from min-content sizing, so the `1fr` track's
 * automatic minimum is the longest unbroken word. The card always renders an
 * email address, and a 45-character address is wider than the ~244 px that
 * column gets inside the floating panel on a 360 px phone, so without this the
 * card pushes past its own border and the transcript grows a sideways
 * scrollbar.
 */
export const APPROVAL_VALUE_CELL = "min-w-0 break-words";

/**
 * The same cell for a value with no spaces to wrap at. `break-words` only
 * breaks between words; an email address is one word, so it needs a hard
 * break or it stays one unbreakable run.
 */
export const APPROVAL_VALUE_CELL_UNBROKEN = "min-w-0 break-all";

/**
 * Nothing may overflow its column sideways. Cards, bubbles and step rows all
 * carry this, and wide children (code, tables) scroll inside themselves.
 */
export const NO_SIDEWAYS_OVERFLOW = "min-w-0 max-w-full break-words";

/** How close to the bottom still counts as "following the conversation", in px. */
export const STICK_TO_BOTTOM_PX = 64;

/**
 * True when the scroller is at or near its bottom. Measured in the scroll
 * handler, before new content lands, so a visitor who scrolled up to read is
 * not yanked back down by the next token.
 */
export function isNearBottom(
  box: { scrollTop: number; scrollHeight: number; clientHeight: number },
  threshold: number = STICK_TO_BOTTOM_PX,
): boolean {
  const distance = box.scrollHeight - box.scrollTop - box.clientHeight;
  return !Number.isFinite(distance) || distance <= threshold;
}

/**
 * Politeness for a live region. Both shells render the same transcript, so
 * the inline region goes quiet while the floating panel is open: one finished
 * reply must be announced once, not twice. The region stays mounted either
 * way, because several screen readers re-announce the last reply when a
 * region is removed and put back with content in it.
 */
export function liveRegionMode(active: boolean): "polite" | "off" {
  return active ? "polite" : "off";
}

/**
 * Role for a running tool step. `role="status"` carries an implicit
 * `aria-live="polite"`, and both shells render the same transcript, so a
 * running step is in the DOM twice whenever the floating panel is open over
 * the inline demo. Only the surface that owns the live region may speak, so
 * the silent one drops the role entirely rather than trusting `aria-modal` on
 * the dialog to prune the copy behind it.
 */
export function stepRole(running: boolean, live: boolean): "status" | undefined {
  return running && live ? "status" : undefined;
}

/** The same rule for the transcript's error line, which is an alert. */
export function errorRole(live: boolean): "alert" | undefined {
  return live ? "alert" : undefined;
}

/* ---------- Reading what the model streamed ---------- */

/** The visible text of a message, in part order. */
export function messageText(message: { parts: readonly { type: string; text?: string }[] }): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

/**
 * The assistant ends replies with `SUGGESTIONS: a | b | c`. Split that off so
 * the chips render as buttons and the marker never reaches the visitor,
 * including mid-stream, while the line is still being typed out.
 */
export function splitSuggestions(raw: string): { body: string; suggestions: string[] } {
  const i = raw.lastIndexOf(SUGGESTION_MARKER);
  if (i === -1) return { body: raw, suggestions: [] };
  const body = raw.slice(0, i).trimEnd();
  const suggestions = raw
    .slice(i + SUGGESTION_MARKER.length)
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 60);
  return { body, suggestions };
}

const HARMONY_FINAL = "<|channel|>final<|message|>";

/**
 * Some gateway models (notably gpt-oss "harmony" format) leak channel control
 * tokens and spill their hidden analysis and draft channels before the final
 * answer. Keep only the final channel and strip any stray control tokens so
 * raw markup and duplicated drafts never reach the visitor, even mid-stream.
 */
export function stripControlTokens(raw: string): string {
  let t = raw;
  const i = t.lastIndexOf(HARMONY_FINAL);
  if (i !== -1) t = t.slice(i + HARMONY_FINAL.length);
  return t
    .replace(/<\|channel\|>\s*\w+\s*<\|message\|>/g, "") // channel headers incl. name
    .replace(/<\|[^|]*\|>/g, "") // any remaining control tokens
    .trimStart();
}

/** The setup line a misconfigured gateway should show, or the error as it came. */
export function formatChatConfigMessage(error: string): string {
  if (
    error.includes("OIDC") ||
    error.includes("AI_GATEWAY_API_KEY") ||
    error.includes("AI Gateway") ||
    error.toLowerCase().includes("unauthorized")
  ) {
    return "Chat isn’t configured: enable AI Gateway in Vercel → Project → AI Gateway, then run `vercel env pull .env.local` (or redeploy). You can still reach us via the contact form below.";
  }
  return error;
}

/** Strip control tokens, then normalize the JSON some error paths surface. */
export function displayAssistantText(raw: string): string {
  const cleaned = stripControlTokens(raw);
  const t = cleaned.trim();
  if (!t.startsWith("{") || !t.includes('"error"')) return cleaned;
  try {
    const j = JSON.parse(t) as { error?: string };
    if (typeof j.error === "string") return formatChatConfigMessage(j.error);
  } catch {
    /* ignore */
  }
  return cleaned;
}

/** Visitor-facing error line. The 413 from the route points at the New button. */
export function friendlyError(message: string): string {
  const m = formatChatConfigMessage(message);
  if (/start a new chat|getting long/i.test(m)) {
    return "This conversation is getting long. Tap New above to start a fresh one.";
  }
  return m || "Something went wrong. Try again or use the contact form.";
}
