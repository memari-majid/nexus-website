"use client";

import { useState } from "react";

const CATEGORY_LABEL: Record<string, string> = {
  consulting: "IT & AI consulting",
  workshop: "Workshops & training",
  careers: "Careers",
  partnership: "Partnership",
  general: "General inquiry",
};

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [autoReply, setAutoReply] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    setCategory(null);
    setAutoReply(null);
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
      };
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      setStatus("success");
      if (typeof data.category === "string") setCategory(data.category);
      if (typeof data.autoReply === "string") setAutoReply(data.autoReply);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again or email us directly.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-400 mb-1.5">
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
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-xs font-medium text-zinc-400 mb-1.5">
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
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
            placeholder="you@company.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-xs font-medium text-zinc-400 mb-1.5">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none focus:ring-1 focus:ring-sky-600"
          placeholder="Tell us about your project or how we can help..."
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send message"}
        </button>
        {status === "success" && (
          <div className="w-full space-y-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-left">
            <p className="text-sm font-medium text-emerald-400">Message received</p>
            {category && (
              <p className="text-xs text-zinc-500">
                Routed as:{" "}
                <span className="font-medium text-zinc-300">
                  {CATEGORY_LABEL[category] ?? category}
                </span>
              </p>
            )}
            {autoReply && (
              <p className="text-sm leading-relaxed text-zinc-300 border-t border-zinc-800/80 pt-3">
                {autoReply}
              </p>
            )}
          </div>
        )}
        {status === "error" && <p className="text-sm text-red-400">{errorMsg}</p>}
      </div>
      <p className="text-xs text-zinc-600">
        Prefer email? Reach us at{" "}
        <a href="mailto:memari.majid@hotmail.com" className="text-sky-400 hover:underline">
          memari.majid@hotmail.com
        </a>
        .
      </p>
    </form>
  );
}
