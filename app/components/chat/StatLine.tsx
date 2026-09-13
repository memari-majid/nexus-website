"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/chat-models";
import { formatMs, formatTokens, modelLabel, readChatMetadata, statSummary } from "@/lib/chat-ui";

/**
 * Per-reply stats from the message metadata the route attaches: model, time to
 * first token, total time, tokens, and list-price cost. Compact by default,
 * the full breakdown on click. Renders nothing until the reply has finished.
 */
export function StatLine({ metadata }: { metadata: unknown }) {
  const [full, setFull] = useState(false);
  const meta = readChatMetadata(metadata);
  if (!meta || meta.totalMs == null) return null;

  const rows: [string, string][] = [];
  if (meta.model) rows.push(["Model", meta.model]);
  if (meta.ttftMs != null) rows.push(["First token", formatMs(meta.ttftMs)]);
  rows.push(["Total time", formatMs(meta.totalMs)]);
  if (meta.tokens) {
    const t = meta.tokens;
    rows.push(["Input (uncached)", formatTokens(t.input)]);
    if (t.cacheRead) rows.push(["Cache read", formatTokens(t.cacheRead)]);
    if (t.cacheWrite) rows.push(["Cache write", formatTokens(t.cacheWrite)]);
    rows.push(["Output", formatTokens(t.output)]);
    if (t.reasoning) rows.push(["Reasoning (in output)", formatTokens(t.reasoning)]);
    rows.push(["Total tokens", formatTokens(t.total)]);
  }
  if (meta.costUsd != null) rows.push(["Cost at list price", formatUsd(meta.costUsd)]);
  if (meta.steps != null) rows.push(["Model steps", String(meta.steps)]);
  if (meta.toolCalls != null) rows.push(["Tool calls", String(meta.toolCalls)]);
  if (meta.finishReason) rows.push(["Finish", meta.finishReason]);

  return (
    <div className="mr-4 px-1 text-xs text-zinc-600 dark:text-zinc-400">
      <button
        type="button"
        onClick={() => setFull((v) => !v)}
        aria-expanded={full}
        className="text-left tabular-nums hover:text-zinc-900 hover:underline dark:hover:text-zinc-200"
      >
        {statSummary(meta)}
      </button>
      {meta.budgetFallback && (
        <p className="mt-0.5">
          The daily budget for the default model is spent, so this reply ran on{" "}
          {meta.modelLabel || modelLabel(meta.model)}.
        </p>
      )}
      {full && (
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-zinc-500 dark:text-zinc-400">{k}</dt>
              <dd className="break-all text-zinc-700 dark:text-zinc-300">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
