"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const QUICK_PROMPTS = [
  "What services do you offer?",
  "Tell me about NVIDIA workshops",
  "How do I get a consultation?",
];

function textFromMessage(m: { parts: { type: string; text?: string }[] }) {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

/** Some error paths surface JSON in assistant text; normalize for display. */
function displayAssistantText(raw: string) {
  const t = raw.trim();
  if (!t.startsWith("{") || !t.includes('"error"')) return raw;
  try {
    const j = JSON.parse(t) as { error?: string };
    if (typeof j.error === "string") return formatChatConfigMessage(j.error);
  } catch {
    /* ignore */
  }
  return raw;
}

function formatChatConfigMessage(error: string) {
  if (error.includes("missing OPENAI_API_KEY")) {
    return "Chat isn’t configured: add OPENAI_API_KEY to your environment (e.g. Vercel → Project → Settings → Environment Variables), save, then redeploy. You can still reach us via the contact form below.";
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
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadNote, setLeadNote] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "sent" | "err">("idle");
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    await sendMessage({ text: input.trim() });
    setInput("");
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    setLeadStatus("idle");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          message: `[Chat lead] ${leadNote || "Interested in follow-up from Nexus AI chat."}`,
          source: "chat-widget",
        }),
      });
      if (res.ok) {
        setLeadStatus("sent");
        setLeadName("");
        setLeadEmail("");
        setLeadNote("");
      } else setLeadStatus("err");
    } catch {
      setLeadStatus("err");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-[60] flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-zinc-50 dark:focus:ring-offset-zinc-950 ${open ? "hidden" : ""}`}
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
          className="fixed inset-0 z-[70] flex items-stretch justify-end bg-black/50 p-0 sm:items-end sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
        >
          <div className="flex h-full w-full max-w-none flex-col rounded-none border-0 border-zinc-200 bg-white shadow-2xl sm:h-[min(560px,85vh)] sm:max-w-md sm:rounded-2xl sm:border sm:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="chat-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Nexus AI Assistant
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-400">
                    Powered by AI
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-500">Ask about our services, workshops, or careers</p>
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
                    Hi — I can answer questions about Nexus AI Solutions, Dr. Memari&apos;s work, NVIDIA workshops,
                    government AI projects, and open roles. How can I help?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={busy}
                        onClick={() => void sendMessage({ text: q })}
                        className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-800 transition hover:border-sky-500 hover:text-sky-800 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-sky-700 dark:hover:text-sky-200"
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
                      ? "ml-6 border border-sky-200 bg-sky-50 text-zinc-900 dark:border-sky-900/40 dark:bg-sky-950/50 dark:text-zinc-100"
                      : "mr-4 border border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-zinc-300"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="max-w-none text-sm leading-relaxed [&_a]:text-sky-600 [&_a]:underline dark:[&_a]:text-sky-400 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 dark:[&_code]:bg-zinc-800">
                      <ReactMarkdown
                        components={{
                          a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                        }}
                      >
                        {displayAssistantText(textFromMessage(m))}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    textFromMessage(m)
                  )}
                </div>
              ))}
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
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-sky-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  Send
                </button>
              </form>

              <details className="rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800/80 dark:bg-zinc-900/30">
                <summary className="cursor-pointer px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Leave your contact info for follow-up
                </summary>
                <form onSubmit={submitLead} className="space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <textarea
                    placeholder="Brief note (optional)"
                    value={leadNote}
                    onChange={(e) => setLeadNote(e.target.value)}
                    rows={2}
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <button
                    type="submit"
                    className="w-full rounded bg-zinc-200 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Submit
                  </button>
                  {leadStatus === "sent" && <p className="text-xs text-emerald-600 dark:text-emerald-400">Sent — we&apos;ll be in touch.</p>}
                  {leadStatus === "err" && <p className="text-xs text-red-600 dark:text-red-400">Could not send. Use the contact form below.</p>}
                </form>
              </details>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
