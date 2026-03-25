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
        className="w-full min-h-[44px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder-zinc-500 outline-none transition focus:border-sky-600 sm:min-h-0 sm:text-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 dark:placeholder-zinc-600"
      />
      <button
        type="submit"
        className="min-h-[44px] shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 sm:min-h-0 sm:px-3 sm:text-xs"
      >
        Join
      </button>
    </form>
  );
}
