"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

const CATEGORY_LABEL: Record<string, string> = {
  consulting: "AI consulting",
  workshop: "Workshops & team training",
  careers: "Careers",
  partnership: "Partnership",
  general: "General inquiry",
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600 sm:text-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [autoReply, setAutoReply] = useState<string | null>(null);
  /** The route says whether the mail provider accepted the message; without that it only reached the server log. */
  const [loggedOnly, setLoggedOnly] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    setCategory(null);
    setAutoReply(null);
    setLoggedOnly(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, source: "contact-form" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        category?: string;
        autoReply?: string;
        dev?: boolean;
        delivered?: boolean;
      };
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      setStatus("success");
      setLoggedOnly(data.delivered === false || data.dev === true);
      if (typeof data.category === "string") setCategory(data.category);
      if (typeof data.autoReply === "string") setAutoReply(data.autoReply);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMsg(`Network error. Please try again or call ${SITE.phoneDisplay}.`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@company.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputClass}
          placeholder="Tell us about your project or how we can help..."
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send message"}
        </button>
        {status === "success" && loggedOnly && (
          <div className="w-full space-y-2 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-3 text-left dark:border-amber-900/60 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
              Logged on the server, not emailed yet
            </p>
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Email delivery is not connected on this site yet, so your message was saved in the
              server log rather than sent to an inbox. For anything urgent, call {SITE.phoneDisplay}.
            </p>
          </div>
        )}
        {status === "success" && !loggedOnly && (
          <div className="w-full space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-left dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Message received</p>
            {category && (
              <p className="text-xs text-zinc-600 dark:text-zinc-500">
                Routed as:{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-300">
                  {CATEGORY_LABEL[category] ?? category}
                </span>
              </p>
            )}
            {autoReply && (
              <p className="border-t border-zinc-200 pt-3 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800/80 dark:text-zinc-300">
                {autoReply}
              </p>
            )}
          </div>
        )}
        {status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-600">
        Prefer to talk? Call{" "}
        <a href={`tel:${SITE.phone}`} className="text-sky-600 hover:underline dark:text-sky-400">
          {SITE.phoneDisplay}
        </a>
        .
      </p>
    </form>
  );
}
