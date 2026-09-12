"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { SUGGESTION_MARKER } from "@/lib/assistant";
import { OPEN_CHAT_EVENT } from "@/lib/chat-events";

const QUICK_PROMPTS = [
  "Schedule the NVIDIA workshop",
  "Is it free for academia?",
  "Can you host it for my team?",
];

function textFromMessage(m: { parts: { type: string; text?: string }[] }) {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

/**
 * The assistant ends replies with `SUGGESTIONS: a | b | c`. Split that off so
 * the chips render as buttons and the marker never reaches the visitor —
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
 * answer — e.g. `...enroll.<|channel|>final<|message|>Here's what I need`.
 * Keep only the final channel and strip any stray control tokens so raw markup
 * and duplicated drafts never reach the visitor, even mid-stream.
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

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", fetch: chatFetch }),
    [],
  );
  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
  });

  const busy = status === "streaming" || status === "submitted";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Open the panel when any CTA dispatches the open-chat event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    await sendMessage({ text: input.trim() });
    setInput("");
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const suggestions =
    !busy && lastAssistant
      ? splitSuggestions(stripControlTokens(textFromMessage(lastAssistant))).suggestions
      : [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-[60] flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-brand-500 text-zinc-950 shadow-lg shadow-brand-900/30 transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-950 ${open ? "hidden" : ""} bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))]`}
        aria-label="Open chat"
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
          className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/50 p-0 pt-[env(safe-area-inset-top)] sm:items-end sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
        >
          <div className="flex h-full w-full min-w-0 max-w-[100vw] flex-col rounded-none border-0 border-zinc-200 bg-white shadow-2xl sm:h-[min(560px,85vh)] sm:max-w-md sm:rounded-2xl sm:border sm:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="chat-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Nexus AI Assistant
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-400">
                    Powered by AI
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-500">
                  Ask anything, or book a call right here
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

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-500">
                    Hi — I can help with AI consulting, NVIDIA DLI workshops, and custom training. Want
                    to set up a call? Tell me what you need and I&apos;ll get it booked.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={busy}
                        onClick={() => void sendMessage({ text: q })}
                        className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-800 transition hover:border-brand-500 hover:text-brand-800 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:text-brand-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-6 border border-brand-200 bg-brand-50 text-zinc-900 dark:border-brand-900/40 dark:bg-brand-950/50 dark:text-zinc-100"
                      : "mr-4 border border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-zinc-300"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="max-w-none text-sm leading-relaxed [&_a]:text-brand-600 [&_a]:underline dark:[&_a]:text-brand-400 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 dark:[&_code]:bg-zinc-800">
                      <ReactMarkdown
                        components={{
                          a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                        }}
                      >
                        {splitSuggestions(displayAssistantText(textFromMessage(m))).body}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    textFromMessage(m)
                  )}
                </div>
              ))}
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
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {formatChatConfigMessage(error.message) ||
                    "Something went wrong. Try again or use the contact form."}
                </p>
              )}
              <div ref={endRef} />
            </div>

            <div className="space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-800">
              <form onSubmit={onSubmit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-brand-600 focus:outline-none sm:min-h-0 sm:text-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="btn-primary btn-compact shrink-0 disabled:opacity-50"
                >
                  Send
                </button>
              </form>

              <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-600">
                Trouble with chat? Email{" "}
                <a href="mailto:info@nexusaisolution.net" className="underline hover:text-zinc-800 dark:hover:text-zinc-300">
                  info@nexusaisolution.net
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
