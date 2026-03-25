"use client";

import { useState } from "react";

const area =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-sky-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-100 dark:placeholder:text-zinc-500";

type Brief = {
  headline: string;
  situation: string;
  whatMatters: string[];
  recommendation: string;
};

type Signal = {
  intent: string;
  register: string;
  subtext: string;
  suggestedOpening: string;
};

function isBrief(data: unknown): data is Brief {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.headline === "string" &&
    typeof o.situation === "string" &&
    Array.isArray(o.whatMatters) &&
    o.whatMatters.every((x) => typeof x === "string") &&
    typeof o.recommendation === "string"
  );
}

function isSignal(data: unknown): data is Signal {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.intent === "string" &&
    typeof o.register === "string" &&
    typeof o.subtext === "string" &&
    typeof o.suggestedOpening === "string"
  );
}

export function AiTryDemos() {
  const [sumIn, setSumIn] = useState("");
  const [sumOut, setSumOut] = useState<Brief | null>(null);
  const [sumLoading, setSumLoading] = useState(false);
  const [sumErr, setSumErr] = useState("");

  const [sigIn, setSigIn] = useState("");
  const [sigOut, setSigOut] = useState<Signal | null>(null);
  const [sigLoading, setSigLoading] = useState(false);
  const [sigErr, setSigErr] = useState("");

  async function runBrief(e: React.FormEvent) {
    e.preventDefault();
    setSumErr("");
    setSumOut(null);
    setSumLoading(true);
    try {
      const res = await fetch("/api/demo/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sumIn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSumErr(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      if (isBrief(data)) setSumOut(data);
    } catch {
      setSumErr("Network error.");
    } finally {
      setSumLoading(false);
    }
  }

  async function runSignal(e: React.FormEvent) {
    e.preventDefault();
    setSigErr("");
    setSigOut(null);
    setSigLoading(true);
    try {
      const res = await fetch("/api/demo/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sigIn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSigErr(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      if (isSignal(data)) setSigOut(data);
    } catch {
      setSigErr("Network error.");
    } finally {
      setSigLoading(false);
    }
  }

  return (
    <div className="mt-14 grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/80 p-6 dark:bg-zinc-900/40">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Executive brief</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">
          Drop rough notes, a thread, or a wall of text — get a structured pre-read: headline, situation,
          what matters, and a concrete recommendation.
        </p>
        <form onSubmit={runBrief} className="mt-4 space-y-3">
          <textarea
            value={sumIn}
            onChange={(e) => setSumIn(e.target.value)}
            rows={5}
            className={area}
            placeholder="Paste context (meeting notes, email, requirements) — 10+ characters…"
          />
          <button
            type="submit"
            disabled={sumLoading || sumIn.trim().length < 10}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {sumLoading ? "Building brief…" : "Build brief"}
          </button>
        </form>
        {sumErr && <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">{sumErr}</p>}
        {sumOut && (
          <div className="mt-4 space-y-3 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-3 text-sm text-zinc-800 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-zinc-300">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{sumOut.headline}</p>
            <p className="leading-relaxed text-zinc-700 dark:text-zinc-400">{sumOut.situation}</p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                What matters
              </p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-zinc-700 dark:text-zinc-400">
                {sumOut.whatMatters.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
            <p>
              <span className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                Recommendation
              </span>
              <span className="mt-1 block text-zinc-800 dark:text-zinc-200">{sumOut.recommendation}</span>
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/60 bg-zinc-50/80 p-6 dark:bg-zinc-900/40">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Stakeholder signal</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-500">
          One message — we surface intent, emotional register, subtext, and a suggested reply opening (not
          generic positive/negative labels).
        </p>
        <form onSubmit={runSignal} className="mt-4 space-y-3">
          <textarea
            value={sigIn}
            onChange={(e) => setSigIn(e.target.value)}
            rows={3}
            className={area}
            placeholder={`e.g. "We need alignment by Friday — loop in legal only if we're past the draft stage."`}
          />
          <button
            type="submit"
            disabled={sigLoading || sigIn.trim().length < 3}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {sigLoading ? "Reading signal…" : "Read signal"}
          </button>
        </form>
        {sigErr && <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">{sigErr}</p>}
        {sigOut && (
          <div className="mt-4 space-y-2 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/50">
            <p className="text-zinc-700 dark:text-zinc-300">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Intent:</span> {sigOut.intent}
            </p>
            <p className="text-zinc-700 dark:text-zinc-300">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Register:</span> {sigOut.register}
            </p>
            <p className="text-zinc-700 dark:text-zinc-400">{sigOut.subtext}</p>
            <p className="border-t border-zinc-200 pt-2 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                Suggested opening
              </span>
              <span className="mt-1 block italic">&ldquo;{sigOut.suggestedOpening}&rdquo;</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
