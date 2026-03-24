"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "done">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("done");
    setEmail("");
  }

  if (status === "done") {
    return (
      <p className="text-xs text-sky-700 dark:text-sky-400">Thanks for subscribing! We&apos;ll be in touch.</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-500 outline-none transition focus:border-sky-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 dark:placeholder-zinc-600"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
      >
        Join
      </button>
    </form>
  );
}
