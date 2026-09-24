"use client";

import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { OPENING_CHIPS } from "@/lib/chat-chips";
import {
  ASSISTANT_NAME,
  ASSISTANT_THE,
  WIDGET_BADGE,
} from "@/lib/chat-persona";
import { resolveSuggestions } from "@/lib/chat-suggestions";
import {
  CHAT_HEADER_ROW,
  COMPOSER_ROW,
  NO_SIDEWAYS_OVERFLOW,
  TRANSCRIPT_SCROLLER,
  announcementFor,
  announcementText,
  betweenSteps,
  chatTitleId,
  displayAssistantText,
  errorRole,
  friendlyError,
  hasDraftedBrief,
  hasPendingApproval,
  hasUnsettledApproval,
  isNearBottom,
  messageText,
  nextAnnouncement,
  readChatMetadata,
  scrollBehavior,
  splitSuggestions,
  stripControlTokens,
  type Announcement,
  type ChatSurface,
  type ChatUIMessage,
} from "@/lib/chat-ui";
import { AssistantTurn, hasVisibleContent } from "./AssistantTurn";
import { sharedChat } from "./chatStore";
import { ToolStep, ToolStepLive, type ToolPartContext } from "./primitives";

/** Header line under the assistant name, per surface. */
const SUBTITLE: Record<ChatSurface, string> = {
  floating: "Tell me what you're working on. I'll give you straight AI guidance.",
  inline: "Tell me what your team does. I'll give you straight AI guidance.",
};

/** What the empty transcript says before the first message. */
const INTRO = `Hey, I'm the ${ASSISTANT_NAME} for Nexus. Tell me what you're working on. I can help you explore an idea, draft a brief or plan your team's training.`;

/** Shown once, in the empty inline frame: what the assistant can do for a visitor. */
const CAPABILITIES: readonly string[] = [
  "Answers grounded in this site",
  "Consulting brief",
  "Effort estimate in weeks",
  "AI readiness score",
  "A note you can send internally",
];

/**
 * How a finished reply reaches the visitor's screen reader. `undefined`
 * empties the region, which is what New does.
 */
export type Announce = (announcement: Announcement | undefined) => void;

/**
 * The live region is the frame's, not the conversation's. Each shell renders
 * one region as a sibling of this view, so the region is always in the
 * accessibility tree whatever this view is doing, and this view only hands it
 * lines.
 *
 * A shell that renders this view directly passes `onAnnounce`. The inline
 * frame is two components up, so it provides the same function through this
 * context instead of threading a prop through the shell in between. What the
 * view announces, and how often, is the same either way: `announcedRef` and
 * the `live` flag still decide, here, that a reply is spoken once.
 */
export const AnnouncerContext = createContext<Announce | undefined>(undefined);

export type ConversationViewProps = {
  surface: ChatSurface;
  /** `useId()` from the shell. Both shells can be mounted, so no id is hardcoded. */
  idPrefix: string;
  /** This surface owns the spoken live region right now. */
  live: boolean;
  /** The shell's outer element, used to decide whether focus is inside this surface. */
  containerRef: RefObject<HTMLElement | null>;
  /** The composer input, so the shell can move focus into it when it opens. */
  inputRef: RefObject<HTMLInputElement | null>;
  /** Renders the close button. Floating shell only. */
  onClose?: () => void;
  /** Where finished replies go. Falls back to `AnnouncerContext`. */
  onAnnounce?: Announce;
};

/**
 * The conversation itself: header, transcript, and composer. Both shells
 * render this, they share one `Chat` instance, and the only differences
 * between them are the copy above and the chrome around it. The live region
 * is the frame's, see `AnnouncerContext` above.
 *
 * Sizing is the shell's job. This view assumes a flex column with a bounded
 * height: the transcript is the only part that scrolls, and the composer
 * never leaves the screen.
 */
export function ConversationView({
  surface,
  idPrefix,
  live,
  containerRef,
  inputRef,
  onClose,
  onAnnounce,
}: ConversationViewProps) {
  const [input, setInput] = useState("");
  const announce = useContext(AnnouncerContext);
  const say = onAnnounce ?? announce;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const mountedRef = useRef(false);
  const focusInsideRef = useRef(false);
  const hadFocusRef = useRef(false);

  const [chat] = useState(sharedChat);
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    setMessages,
    clearError,
    addToolApprovalResponse,
  } = useChat<ChatUIMessage>({ chat });

  const busy = status === "streaming" || status === "submitted";

  // Only the last assistant turn can hold an open approval. No new user
  // message may join the transcript while one is open: the server throws on
  // an unanswered request and skips an answered one that is not the last
  // thing it receives, so typing, chips, and Send wait for the card (or for
  // the retry). New clears the whole conversation and is always available.
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const awaitingApproval = !!lastAssistant && hasPendingApproval(lastAssistant.parts);
  const approvalUnsettled = !!lastAssistant && hasUnsettledApproval(lastAssistant.parts);
  const locked = busy || approvalUnsettled;

  // What this surface has already announced. Seeded on the first render with
  // whatever is already on screen, so opening the panel onto an existing
  // conversation does not read the last reply out again.
  const announcedRef = useRef<Announcement | undefined | null>(null);
  if (announcedRef.current === null) {
    announcedRef.current = announcementFor(
      lastAssistant && {
        id: lastAssistant.id,
        text: announcementText(
          splitSuggestions(displayAssistantText(messageText(lastAssistant))).body,
        ),
        parts: lastAssistant.parts,
      },
    );
  }

  // Land at the bottom of whatever is already there, without touching the
  // page scroll. `scrollIntoView` would walk every scrollable ancestor and
  // yank the page down to the inline frame on mount.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // Follow the conversation only while the visitor is at the bottom of it.
  // `stickRef` is measured in the scroll handler, before new content lands.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (messages.length === 0 || !stickRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: scrollBehavior(reduced) });
  }, [messages]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (el) stickRef.current = isNearBottom(el);
  }, []);

  // Whether the last thing focused was inside this surface. `focusin` is the
  // only reliable signal: when a control is disabled mid-stream the browser
  // drops focus to the body without firing anything useful.
  useEffect(() => {
    const onFocusIn = () => {
      const container = containerRef.current;
      focusInsideRef.current = !!container && container.contains(document.activeElement);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [containerRef]);

  // Disabling the input while a reply streams drops focus to the page. Once
  // the input is usable again, and only if this surface had focus, bring it
  // back so the next message can be typed straight away. Never scrolls.
  useEffect(() => {
    if (locked) {
      hadFocusRef.current = focusInsideRef.current;
      return;
    }
    if (!hadFocusRef.current) return;
    const container = containerRef.current;
    const active = document.activeElement;
    if (active && active !== document.body && container?.contains(active)) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [locked, containerRef, inputRef]);

  // Announce each finished reply once, through the frame's region. The
  // transcript carries role="log" with aria-live="off", so it never speaks for
  // itself, or every streamed token would be read out. While the other surface
  // owns the announcement, this one only tracks what it would have said, so
  // nothing is read twice and nothing is read late.
  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    const current = announcementFor(
      last && {
        id: last.id,
        text: announcementText(splitSuggestions(displayAssistantText(messageText(last))).body),
        parts: last.parts,
      },
    );
    if (!live) {
      announcedRef.current = current;
      say?.(undefined);
      return;
    }
    const next = nextAnnouncement(current, busy, announcedRef.current ?? undefined);
    if (!next) return;
    announcedRef.current = next;
    say?.(next);
  }, [messages, busy, live, say]);

  function newChat() {
    if (busy) void stop();
    setMessages([]);
    clearError();
    setInput("");
    stickRef.current = true;
    announcedRef.current = undefined;
    say?.(undefined);
  }

  function onApproval(id: string, approved: boolean) {
    void addToolApprovalResponse({ id, approved });
  }

  /**
   * Re-sends the transcript as it stands. The SDK re-sends on its own after
   * an approval click; if that request fails (rate limit, budget, network) or
   * is stopped, the part stays approval-responded, and the server runs the
   * approved call only when that answer is the last thing it receives, so a
   * plain re-send is what completes it.
   */
  function retrySend() {
    stickRef.current = true;
    void sendMessage();
  }

  function send(text: string) {
    stickRef.current = true;
    void sendMessage({ text });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || locked) return;
    stickRef.current = true;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  }

  const last = messages[messages.length - 1];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const usedChips = messages
    .filter((m) => m.role === "user")
    .map((m) => messageText(m))
    .filter(Boolean);
  // The running row covers the gaps a multi-step turn leaves: before the
  // first part arrives, and after a tool step finishes while the model
  // composes the next one.
  const thinking =
    busy && (!last || last.role !== "assistant" || !hasVisibleContent(last) || betweenSteps(last.parts));
  const tools: ToolPartContext = {
    busy,
    briefDrafted: hasDraftedBrief(messages),
    onApproval,
    onRetry: retrySend,
  };
  const placeholder = awaitingApproval
    ? "Answer the card above first"
    : approvalUnsettled && !busy
      ? "Retry the send above, or tap New"
      : "Type a message…";

  // The route says on `start` whether outgoing email is configured; with it
  // off, no chip may invite an email that would only end in "not sent". A
  // reply that ends with the explicit `none` line gets no chips at all: the
  // assistant asked the visitor something and wants them to answer it.
  const emailEnabled = lastAssistant ? readChatMetadata(lastAssistant.metadata)?.emailEnabled : undefined;
  const modelChips = lastAssistant
    ? splitSuggestions(stripControlTokens(messageText(lastAssistant)))
    : undefined;
  const suggestions =
    !locked && lastAssistant && modelChips && !modelChips.none
      ? resolveSuggestions(modelChips.suggestions, {
          lastAssistant: splitSuggestions(displayAssistantText(messageText(lastAssistant))).body,
          lastUser: lastUser ? messageText(lastUser) : undefined,
          used: usedChips,
          emailEnabled,
        })
      : [];

  return (
    <ToolStepLive live={live}>
      <div className={CHAT_HEADER_ROW}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id={chatTitleId(idPrefix)}
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {ASSISTANT_NAME}
            </h2>
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-400">
              {WIDGET_BADGE}
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{SUBTITLE[surface]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {busy && (
            <button
              type="button"
              onClick={() => void stop()}
              className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={newChat}
            disabled={messages.length === 0 && !error}
            className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
            aria-label="Start a new chat"
          >
            New
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Close chat"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mirrored from the personal site's ConversationView so the two files
          still diff by eye. The transcript scrolls but holds no focusable
          descendant, so without `tabIndex` a keyboard or switch-access visitor
          can send a message and then never scroll back to read the reply.
          tabIndex 0 makes it a tab stop the arrow keys and PageUp can scroll,
          and the inset ring says where focus went. `role="log"` gives it a name
          and a role; `aria-live="off"` is deliberate, because the role carries
          an implicit polite live region and the frame already announces each
          finished reply (ChatWidget and TryOurAi each mount one), so without it
          a streamed reply would be read out twice. The ring is appended at this
          call site rather than folded into TRANSCRIPT_SCROLLER, because not
          every consumer of that constant is meant to become a tab stop. */}
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="log"
        aria-live="off"
        aria-label={`Conversation with the ${ASSISTANT_NAME}`}
        onScroll={onScroll}
        className={`${TRANSCRIPT_SCROLLER} space-y-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500`}
        aria-busy={busy}
      >
        {messages.length === 0 && (
          <div className={`space-y-3 ${NO_SIDEWAYS_OVERFLOW}`}>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{INTRO}</p>
            {surface === "inline" && (
              <ul className="flex flex-wrap gap-1.5">
                {CAPABILITIES.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              {OPENING_CHIPS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={locked}
                  onClick={() => send(q)}
                  className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-800 transition hover:border-brand-500 hover:text-brand-800 disabled:opacity-50 motion-reduce:transition-none dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:text-brand-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "assistant" ? (
            <AssistantTurn key={m.id} m={m} tools={tools} />
          ) : (
            <div
              key={m.id}
              className={`ml-6 whitespace-pre-wrap rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-zinc-900 dark:border-brand-900/40 dark:bg-brand-950/50 dark:text-zinc-100 ${NO_SIDEWAYS_OVERFLOW}`}
            >
              {messageText(m)}
            </div>
          ),
        )}
        {thinking && <ToolStep label={`${ASSISTANT_NAME} is thinking`} state="running" />}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 transition hover:border-brand-500 hover:text-brand-700 motion-reduce:transition-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:text-brand-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {error && (
          <div className="space-y-2 text-xs text-amber-700 dark:text-amber-400">
            <p role={errorRole(live)}>{friendlyError(error.message)}</p>
            {!busy && !approvalUnsettled && (
              <button type="button" onClick={retrySend} className="min-h-[44px] underline underline-offset-4">
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <div className={COMPOSER_ROW}>
        {/* Without JavaScript the composer below still renders, and it can
            neither send nor explain itself. This line is the whole no-JS
            affordance: it says so and carries a working link to the contact
            form. The `action="/contact"` on the form is belt and braces and
            nothing more. The server HTML renders Send disabled, because the
            input starts empty, so implicit submission fires at a disabled
            default button and Enter is a silent no-op with the script off:
            the URL does not change. Only a browser that submits past a
            disabled default button ever reaches the action. With the script
            running `onSubmit` calls `preventDefault`, so the action is
            unreachable there too and the interactive path is untouched.

            The style rule takes the composer's fine print away while this is
            showing. Both lines say the same thing, and stacking them pushed
            the fine print out of the `overflow-hidden` frame on a short phone
            (measured clipped at 360x400, 360x430 and 360x460), which is the
            exact defect `INLINE_DEMO_HEIGHT`'s floor exists to prevent.
            `style` is flow content, so it is valid inside `noscript` in the
            body. React hydrates `noscript` children badly, so the markup goes
            in as one static string. */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<style>.chat-fine-print{display:none}</style><p class="rounded-lg border border-zinc-200 px-3 py-2 text-center text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">This chat needs JavaScript to reply. Use the <a class="underline" href="/contact">contact form</a> instead.</p>`,
          }}
        />
        <form onSubmit={onSubmit} action="/contact" className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            aria-label={`Message ${ASSISTANT_THE}`}
            className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-brand-600 focus:outline-none sm:min-h-0 sm:text-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            disabled={locked}
          />
          <button
            type="submit"
            disabled={locked || !input.trim()}
            className="btn-primary btn-compact shrink-0 disabled:opacity-50"
          >
            Send
          </button>
        </form>

        {/* `chat-fine-print` is the hook the noscript block above hides this
            row by. It is a plain class, not a utility, so nothing purges it. */}
        <p className="chat-fine-print text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          {ASSISTANT_NAME} is an AI. Trouble with chat? Use the{" "}
          <Link
            href="/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            contact form
          </Link>
          .
        </p>
      </div>
    </ToolStepLive>
  );
}
