"use client";

import { useState } from "react";
import {
  COHORT_MAX,
  deriveRegistration,
  priceLine,
  type Delivery,
  type Registration,
} from "@/lib/registration";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The assisted "smart form". Nex opens it with whatever it already gathered, so
 * it arrives mostly filled; the visitor tweaks and sends. Filing is done by a
 * dedicated endpoint (not the model) so a request never gets lost. On success
 * we tell the chat via `onFiled` so Nex confirms in its own voice.
 *
 * Mobile-first: full-width controls, 44px tap targets, everything wraps.
 */
export function RegistrationCard({
  initial,
  onFiled,
}: {
  initial: Registration;
  onFiled: (note: string) => void;
}) {
  const [reg, setReg] = useState<Registration>(initial);
  const [status, setStatus] = useState<"editing" | "sending" | "done" | "error">("editing");
  const [error, setError] = useState<string | null>(null);

  const d = deriveRegistration(reg);
  const set = (patch: Partial<Registration>) => setReg((r) => ({ ...r, ...patch }));
  const n = reg.headcount ?? 0;
  const canSend = Boolean(reg.name?.trim() && reg.email && EMAIL_RE.test(reg.email));

  async function send() {
    if (!canSend || status === "sending") return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/workshop-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reg),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Could not send. Please try again.");
      }
      setStatus("done");
      onFiled(
        `Request filed for ${reg.name}${reg.organization ? ` at ${reg.organization}` : ""}.`,
      );
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not send. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-brand-300 bg-brand-50 px-3 py-3 text-sm text-zinc-800 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-zinc-200">
        <p className="font-medium">Sent to Dr. Memari.</p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          We&apos;ll follow up by email to scope it with you. Talk soon.
        </p>
      </div>
    );
  }

  const label = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";
  const inputCls =
    "min-h-[44px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-brand-600 focus:outline-none sm:text-sm dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100";

  return (
    <div className="space-y-3 rounded-xl border border-zinc-300 bg-white px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Get your training scoped</p>

      {/* Team size */}
      <div>
        <span className={label}>Team size (up to {COHORT_MAX} per cohort)</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Fewer people"
            onClick={() => set({ headcount: Math.max(1, n - 1) })}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-lg text-zinc-700 hover:border-brand-500 dark:border-zinc-700 dark:text-zinc-200"
          >
            −
          </button>
          <span className="min-w-[3ch] text-center text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {n || "—"}
          </span>
          <button
            type="button"
            aria-label="More people"
            onClick={() => set({ headcount: Math.min(COHORT_MAX + 20, (n || 0) + 1) })}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-lg text-zinc-700 hover:border-brand-500 dark:border-zinc-700 dark:text-zinc-200"
          >
            +
          </button>
          {[10, 20, 30].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => set({ headcount: q })}
              className="min-h-[44px] rounded-full border border-zinc-300 px-3 text-xs text-zinc-700 hover:border-brand-500 dark:border-zinc-700 dark:text-zinc-300"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery */}
      <div>
        <span className={label}>Format</span>
        <div className="flex flex-wrap gap-2">
          {(["in-person", "remote"] as Delivery[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => set({ delivery: opt })}
              className={`min-h-[44px] flex-1 rounded-lg border px-3 text-sm capitalize transition ${
                reg.delivery === opt
                  ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/50 dark:text-brand-200"
                  : "border-zinc-300 text-zinc-700 hover:border-brand-500 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              {opt === "in-person" ? "In person" : "Remote"}
            </button>
          ))}
        </div>
      </div>

      {/* Timing */}
      <div>
        <label className={label} htmlFor="reg-timing">
          Rough timing (about 6 weeks lead time)
        </label>
        <input
          id="reg-timing"
          value={reg.timing ?? ""}
          onChange={(e) => set({ timing: e.target.value })}
          placeholder="e.g. November, or this quarter"
          className={inputCls}
        />
      </div>

      {/* Contact */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="reg-name">
            Your name
          </label>
          <input
            id="reg-name"
            value={reg.name ?? ""}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Full name"
            className={inputCls}
          />
        </div>
        <div>
          <label className={label} htmlFor="reg-email">
            Work email
          </label>
          <input
            id="reg-email"
            type="email"
            inputMode="email"
            value={reg.email ?? ""}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="you@company.com"
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="reg-org">
          Organization (optional)
        </label>
        <input
          id="reg-org"
          value={reg.organization ?? ""}
          onChange={(e) => set({ organization: e.target.value })}
          placeholder="Company or team"
          className={inputCls}
        />
      </div>

      <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{priceLine(reg)}</p>

      {error && <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p>}

      <button
        type="button"
        onClick={send}
        disabled={!canSend || status === "sending"}
        className="btn-primary w-full disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send to Dr. Memari"}
      </button>
      <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-500">
        No payment now. We&apos;ll follow up by email to scope it.
      </p>
    </div>
  );
}
