"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isStaticToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { SUGGESTION_MARKER } from "@/lib/assistant";
import { OPENING_CHIPS } from "@/lib/chat-chips";
import { OPEN_CHAT_EVENT } from "@/lib/chat-events";
import { DEFAULT_MODEL_ID } from "@/lib/chat-models";
import { resolveSuggestions } from "@/lib/chat-suggestions";
import {
  FOCUSABLE_SELECTOR,
  MODEL_STORAGE_KEY,
  SHEET_PANEL_QUERY,
  announcementFor,
  announcementText,
  betweenSteps,
  escapeClosesDialog,
  hasDraftedBrief,
  hasPendingApproval,
  hasUnsettledApproval,
  isChatModelId,
  lockedBodyStyle,
  nextAnnouncement,
  readChatMetadata,
  scrollBehavior,
  trapTabTarget,
  type Announcement,
  type ChatUIMessage,
} from "@/lib/chat-ui";
import { ModelPicker } from "@/app/components/chat/ModelPicker";
import { ToolStep, type ToolPartContext } from "@/app/components/chat/primitives";
import { StatLine } from "@/app/components/chat/StatLine";
import { ToolPartView } from "@/app/components/chat/ToolPartView";

function textFromMessage(m: { parts: { type: string; text?: string }[] }) {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

/**
 * The assistant ends replies with `SUGGESTIONS: a | b | c`. Split that off so
 * the chips render as buttons and the marker never reaches the visitor,
 * including mid-stream, while the line is still being typed out.
 */
function splitSuggestions(raw: string): { body: string; suggestions: string[] } {
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
 * tokens and spill their hidden analysis/draft channels before the final
 * answer. Keep only the final channel and strip any stray control tokens so raw
 * markup and duplicated drafts never reach the visitor, even mid-stream.
 */
function stripControlTokens(raw: string): string {
  let t = raw;
  const i = t.lastIndexOf(HARMONY_FINAL);
  if (i !== -1) t = t.slice(i + HARMONY_FINAL.length);
  return t
    .replace(/<\|channel\|>\s*\w+\s*<\|message\|>/g, "") // channel headers incl. name
    .replace(/<\|[^|]*\|>/g, "") // any remaining control tokens
    .trimStart();
}

/** Strip control tokens, then normalize the JSON some error paths surface. */
function displayAssistantText(raw: string) {
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

function formatChatConfigMessage(error: string) {
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

/** Visitor-facing error line. The 413 from the route points at the New button. */
function friendlyError(message: string): string {
  const m = formatChatConfigMessage(message);
  if (/start a new chat|getting long/i.test(m)) {
    return "This conversation is getting long. Tap New above to start a fresh one.";
  }
  return m || "Something went wrong. Try again or use the contact form.";
}

async function chatFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await globalThis.fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: string };
      if (typeof j.error === "string") throw new Error(j.error);
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e;
    }
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res;
}

const ASSISTANT_BUBBLE =
  "mr-4 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-zinc-300";

const MARKDOWN_CLASSES =
  "max-w-none text-sm leading-relaxed [&_a]:text-brand-600 [&_a]:underline dark:[&_a]:text-brand-400 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 dark:[&_code]:bg-zinc-800";

/** True when the message has something to show: visible text or a tool step. */
function hasVisibleContent(m: ChatUIMessage): boolean {
  return m.parts.some(
    (p) =>
      (p.type === "text" && splitSuggestions(displayAssistantText(p.text)).body.trim().length > 0) ||
      isStaticToolUIPart(p),
  );
}

/**
 * One assistant turn, rendered part by part in message order: text before a
 * tool call appears above its card, text after it appears below. The
 * SUGGESTIONS marker is split from the last text segment only.
 */
function AssistantTurn({ m, tools }: { m: ChatUIMessage; tools: ToolPartContext }) {
  let lastText = -1;
  m.parts.forEach((p, i) => {
    if (p.type === "text") lastText = i;
  });

  const nodes: ReactNode[] = [];
  m.parts.forEach((p, i) => {
    if (p.type === "text") {
      const cleaned = displayAssistantText(p.text);
      const body = i === lastText ? splitSuggestions(cleaned).body : cleaned;
      if (body.trim().length === 0) return;
      nodes.push(
        <div key={`text-${i}`} className={ASSISTANT_BUBBLE}>
          <div className={MARKDOWN_CLASSES}>
            <ReactMarkdown
              components={{
                a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>,
      );
    } else if (isStaticToolUIPart(p)) {
      nodes.push(<ToolPartView key={p.toolCallId} part={p} tools={tools} />);
    }
  });

  if (nodes.length === 0) return null;
  return (
    <div className="space-y-2">
      {nodes}
      <StatLine metadata={m.metadata} />
    </div>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const modelRef = useRef<string>(DEFAULT_MODEL_ID);
  const endRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Whatever had focus when the dialog opened (a CTA, or the launcher).
  // Focus goes back there on close, or to the launcher when it is gone.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  // The visually hidden live region gets each finished reply once. It holds
  // the whole announcement, not just the text: the region renders it in an
  // element keyed by the message id, so two replies with identical words are
  // two elements and the second one is announced too.
  const [announcement, setAnnouncement] = useState<Announcement | undefined>(undefined);
  const announcedRef = useRef<Announcement | undefined>(undefined);

  const openDialog = useCallback(() => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setAnnouncement(undefined);
    setOpen(true);
  }, []);

  // The transport reads the ref on every send, so the automatic re-send after
  // an approval carries the same model as the visitor's picker.
  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: "/api/chat",
        fetch: chatFetch,
        body: () => ({ model: modelRef.current }),
      }),
    [],
  );
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    setMessages,
    clearError,
    addToolApprovalResponse,
  } = useChat<ChatUIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

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

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: scrollBehavior(reduced) });
  }, [messages, open]);

  // Open the panel when any CTA dispatches the open-chat event.
  useEffect(() => {
    const onOpen = () => openDialog();
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, [openDialog]);

  // Focus moves into the dialog when it opens (the input, or the first
  // control while the input is locked) and back out when it closes.
  useEffect(() => {
    if (open) {
      const input = inputRef.current;
      const target =
        input && !input.disabled
          ? input
          : (dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialogRef.current);
      target?.focus({ preventScroll: true });
    } else if (wasOpenRef.current) {
      const opener = openerRef.current;
      const usable = !!opener && opener.isConnected && opener.getClientRects().length > 0;
      (usable ? opener : launcherRef.current)?.focus({ preventScroll: true });
      openerRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open]);

  // Escape closes the dialog (not from a native select, where it closes the
  // option list), and Tab cycles inside it, pulling focus back in when it
  // has drifted to the page behind.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (e.key === "Escape") {
        if (!escapeClosesDialog(e.target instanceof Element ? e.target.tagName : undefined)) return;
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.getClientRects().length > 0,
      );
      const active = document.activeElement;
      const index = active instanceof HTMLElement ? focusable.indexOf(active) : -1;
      const target = trapTabTarget(index, focusable.length, e.shiftKey);
      if (target === undefined) return;
      e.preventDefault();
      focusable[target]?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Below `sm` the dialog is a full-screen sheet, so the page behind it is
  // pinned while it is open (iOS Safari scrolls through overflow: hidden, so
  // the body is fixed in place at its current offset) and put back on close.
  // The floating panel on wider screens leaves the page alone.
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia(SHEET_PANEL_QUERY);
    const body = document.body;
    let lock: { scrollY: number; previous: [string, string][] } | undefined;
    const release = () => {
      if (!lock) return;
      for (const [name, value] of lock.previous) {
        if (value) body.style.setProperty(name, value);
        else body.style.removeProperty(name);
      }
      window.scrollTo({ top: lock.scrollY, behavior: "instant" });
      lock = undefined;
    };
    const sync = () => {
      if (media.matches) {
        release();
        return;
      }
      if (lock) return;
      const scrollY = window.scrollY;
      const style = lockedBodyStyle(scrollY);
      lock = {
        scrollY,
        previous: Object.keys(style).map((name): [string, string] => [name, body.style.getPropertyValue(name)]),
      };
      for (const [name, value] of Object.entries(style)) body.style.setProperty(name, value);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      release();
    };
  }, [open]);

  // Announce each finished reply once. The transcript itself is not a live
  // region, or every streamed token would be read out.
  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    const current = announcementFor(
      last && {
        id: last.id,
        text: announcementText(splitSuggestions(displayAssistantText(textFromMessage(last))).body),
        parts: last.parts,
      },
    );
    const next = nextAnnouncement(current, busy, announcedRef.current);
    if (!next) return;
    announcedRef.current = next;
    setAnnouncement(next);
  }, [messages, busy]);

  // Disabling the input while a reply streams drops focus to the page. Once
  // the input is usable again and nothing in the dialog holds focus, bring
  // it back so the next message can be typed straight away.
  useEffect(() => {
    if (!open || locked) return;
    const active = document.activeElement;
    const dialog = dialogRef.current;
    if (active && active !== document.body && active !== dialog && dialog?.contains(active)) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [open, locked]);

  // Hydration-safe: render the default on the server and first paint, then
  // read the saved pick once mounted. Storage can be blocked, so never throw.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
      if (isChatModelId(stored)) {
        modelRef.current = stored;
        setModelId(stored);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  function chooseModel(id: string) {
    modelRef.current = id;
    setModelId(id);
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, id);
    } catch {
      /* storage unavailable */
    }
  }

  function newChat() {
    if (busy) void stop();
    setMessages([]);
    clearError();
    setInput("");
    announcedRef.current = undefined;
    setAnnouncement(undefined);
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
    void sendMessage();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || locked) return;
    await sendMessage({ text: input.trim() });
    setInput("");
  }

  const last = messages[messages.length - 1];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const usedChips = messages
    .filter((m) => m.role === "user")
    .map((m) => textFromMessage(m))
    .filter(Boolean);
  // The running row covers the gaps a multi-step turn leaves: before the
  // first part arrives, and after a tool step finishes while the model
  // composes the next one (often several seconds on Opus).
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
  // off, no chip may invite an email that would only end in "not sent".
  const emailEnabled = lastAssistant ? readChatMetadata(lastAssistant.metadata)?.emailEnabled : undefined;
  const suggestions =
    !locked && lastAssistant
      ? resolveSuggestions(
          splitSuggestions(stripControlTokens(textFromMessage(lastAssistant))).suggestions,
          {
            lastAssistant: splitSuggestions(
              displayAssistantText(textFromMessage(lastAssistant)),
            ).body,
            lastUser: lastUser ? textFromMessage(lastUser) : undefined,
            used: usedChips,
            emailEnabled,
          },
        )
      : [];

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={openDialog}
        className={`fixed z-[60] flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-brand-500 text-zinc-950 shadow-lg shadow-brand-900/30 transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-zinc-50 motion-reduce:transition-none dark:focus:ring-offset-zinc-950 ${open ? "hidden" : ""} bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))]`}
        aria-label="Open chat"
        aria-haspopup="dialog"
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m9.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H15m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/50 p-0 pt-[env(safe-area-inset-top)] outline-none sm:items-end sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
        >
          <div className="flex h-full w-full min-w-0 max-w-[100vw] flex-col rounded-none border-0 border-zinc-200 bg-white shadow-2xl sm:h-[min(600px,85vh)] sm:max-w-md sm:rounded-2xl sm:border sm:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="chat-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Dr. MJ
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-400">
                    Nexus AI consultant
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Tell me what you&apos;re working on. I&apos;ll give you straight AI guidance.
                </p>
              </div>
              <div className="flex gap-2">
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
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Close chat"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <ModelPicker value={modelId} onChange={chooseModel} disabled={busy} />
              <Link
                href="/how-it-works"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[11px] text-zinc-600 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-200"
              >
                How this works
              </Link>
              <button
                type="button"
                onClick={newChat}
                disabled={messages.length === 0 && !error}
                className="shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                aria-label="Start a new chat"
              >
                New
              </button>
            </div>

            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {announcement && <p key={announcement.id}>{announcement.text}</p>}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-busy={busy}>
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Hey, I&apos;m Dr. MJ, the AI consultant for Nexus. Tell me what your team does and
                    where you want to go with AI. I&apos;ll give you straight, useful guidance first,
                    and when it helps I can draft a brief, score your readiness, and hand you off to
                    Majid. What are you working on?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {OPENING_CHIPS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={locked}
                        onClick={() => void sendMessage({ text: q })}
                        className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-800 transition hover:border-brand-500 hover:text-brand-800 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:text-brand-200"
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
                    className="ml-6 whitespace-pre-wrap rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-zinc-900 dark:border-brand-900/40 dark:bg-brand-950/50 dark:text-zinc-100"
                  >
                    {textFromMessage(m)}
                  </div>
                ),
              )}
              {thinking && <ToolStep label="Dr. MJ is thinking" state="running" />}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void sendMessage({ text: s })}
                      className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 transition hover:border-brand-500 hover:text-brand-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:text-brand-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {error && (
                <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
                  {friendlyError(error.message)}
                </p>
              )}
              <div ref={endRef} />
            </div>

            <div className="space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
              <form onSubmit={onSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={placeholder}
                  aria-label="Message Dr. MJ"
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

              <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                Dr. MJ is an AI. Trouble with chat? Use the{" "}
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
          </div>
        </div>
      )}
    </>
  );
}
