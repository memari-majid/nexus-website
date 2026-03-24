"use client";

import { useState } from "react";

export function AiTryDemos() {
  const [sumIn, setSumIn] = useState("");
  const [sumOut, setSumOut] = useState("");
  const [sumLoading, setSumLoading] = useState(false);
  const [sumErr, setSumErr] = useState("");

  const [sentIn, setSentIn] = useState("");
  const [sentOut, setSentOut] = useState<{ label: string; confidence: number; brief: string } | null>(null);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentErr, setSentErr] = useState("");

  async function runSummarize(e: React.FormEvent) {
    e.preventDefault();
    setSumErr("");
    setSumOut("");
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
      if (typeof data.summary === "string") setSumOut(data.summary);
    } catch {
      setSumErr("Network error.");
    } finally {
      setSumLoading(false);
    }
  }

  async function runSentiment(e: React.FormEvent) {
    e.preventDefault();
    setSentErr("");
    setSentOut(null);
    setSentLoading(true);
    try {
      const res = await fetch("/api/demo/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentIn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSentErr(typeof data.error === "string" ? data.error : "Something went wrong.");
        return;
      }
      if (typeof data.label === "string" && typeof data.confidence === "number" && typeof data.brief === "string") {
        setSentOut({ label: data.label, confidence: data.confidence, brief: data.brief });
      }
    } catch {
      setSentErr("Network error.");
    } finally {
      setSentLoading(false);
    }
  }

  return (
    <div className="mt-14 grid gap-8 lg:grid-cols-2">
      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <h3 className="text-lg font-semibold text-zinc-100">Text summarizer</h3>
        <p className="mt-1 text-sm text-zinc-500">Paste a paragraph or short brief — we return a tight executive summary.</p>
        <form onSubmit={runSummarize} className="mt-4 space-y-3">
          <textarea
            value={sumIn}
            onChange={(e) => setSumIn(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
            placeholder="Paste text to summarize (10+ characters)…"
          />
          <button
            type="submit"
            disabled={sumLoading || sumIn.trim().length < 10}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {sumLoading ? "Summarizing…" : "Summarize"}
          </button>
        </form>
        {sumErr && <p className="mt-3 text-xs text-amber-400">{sumErr}</p>}
        {sumOut && (
          <div className="mt-4 rounded-lg border border-sky-900/40 bg-sky-950/20 px-3 py-2 text-sm text-zinc-300">
            {sumOut}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
        <h3 className="text-lg font-semibold text-zinc-100">Sentiment analysis</h3>
        <p className="mt-1 text-sm text-zinc-500">One sentence — we surface tone, confidence, and a one-line read.</p>
        <form onSubmit={runSentiment} className="mt-4 space-y-3">
          <textarea
            value={sentIn}
            onChange={(e) => setSentIn(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-600 focus:outline-none"
            placeholder="e.g. We're excited to launch our new AI pilot next quarter."
          />
          <button
            type="submit"
            disabled={sentLoading || sentIn.trim().length < 3}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {sentLoading ? "Analyzing…" : "Analyze"}
          </button>
        </form>
        {sentErr && <p className="mt-3 text-xs text-amber-400">{sentErr}</p>}
        {sentOut && (
          <div className="mt-4 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3 text-sm">
            <p className="font-medium text-zinc-200">Label: {sentOut.label}</p>
            <p className="text-zinc-500">Confidence: {(sentOut.confidence * 100).toFixed(0)}%</p>
            <p className="text-zinc-400">{sentOut.brief}</p>
          </div>
        )}
      </div>
    </div>
  );
}
