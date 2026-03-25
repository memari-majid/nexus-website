"use client";

import { useEffect, useState } from "react";

const INSIGHTS = [
  "We ship production LLM & RAG systems with evaluation and guardrails—not just demos.",
  "NVIDIA DLI–aligned workshops: hands-on PyTorch, Jetson, and GenAI for universities.",
  "Agentic automation: multi-agent workflows across documents, onboarding, and compliance.",
  "Public-sector AI: Utah agencies, privacy-preserving data foundations, responsible AI.",
  "From strategy to MLOps: roadmaps, governance, and measurable ROI on AI investments.",
];

export function AiInsightsTicker() {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [mode, setMode] = useState<"type" | "hold" | "erase">("type");

  const full = INSIGHTS[index % INSIGHTS.length];

  useEffect(() => {
    if (mode === "type") {
      if (display.length < full.length) {
        const t = setTimeout(() => setDisplay(full.slice(0, display.length + 1)), 26);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setMode("hold"), 2100);
      return () => clearTimeout(t);
    }
    if (mode === "hold") {
      const t = setTimeout(() => setMode("erase"), 600);
      return () => clearTimeout(t);
    }
    if (mode === "erase") {
      if (display.length > 0) {
        const t = setTimeout(() => setDisplay((d) => d.slice(0, -1)), 14);
        return () => clearTimeout(t);
      }
      setIndex((i) => (i + 1) % INSIGHTS.length);
      setMode("type");
    }
  }, [display, full, mode]);

  return (
    <section className="border-b border-zinc-200/80 bg-white/90 px-4 py-4 dark:border-zinc-800/40 dark:bg-zinc-950/80 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
        <span className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-400">
          AI insight
        </span>
        <p className="min-h-[3rem] w-full min-w-0 max-w-full break-words text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:min-h-0 sm:text-left">
          <span className="text-zinc-800 dark:text-zinc-200">{display}</span>
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-sky-500 align-middle" aria-hidden />
        </p>
      </div>
    </section>
  );
}
