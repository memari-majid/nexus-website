"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Announce } from "@/app/components/chat/ConversationView";
import { CHAT_MODELS, DEFAULT_MODEL_ID, findModel, formatUsd } from "@/lib/chat-models";
import { SIDEWAYS_SCROLL_REGION, formatMs, formatTokens } from "@/lib/chat-ui";
import {
  EVAL_RUBRIC,
  MAX_RUBRIC_SCORE,
  PUBLISHED_EVALS,
  hasPublishedScores,
  parseEvalFrame,
  rowLabel,
  rubricAverage,
  type LiveReply,
  type LiveVerdict,
  type RubricScores,
} from "@/lib/evals";

/**
 * The evaluations view.
 *
 * Two measurements, never mixed. The top block is the checked-in run in
 * `evals/results/bakeoff-latest.json`: it renders on the server, before any
 * script runs, and a live run can never write into one of its cells. The
 * bottom block is a run the visitor starts now, labelled with its own shape,
 * its own judge, and its own cost.
 *
 * Everything that costs money happens in `app/api/evals/run/route.ts`, which
 * owns the caps, the daily sub-budget, the judge choice and the reservation.
 * This component renders the frames that route streams and invents nothing:
 * a number it was not sent reads "not recorded".
 */

/** The incumbent is the production default. The visitor picks the challenger. */
const INCUMBENT = DEFAULT_MODEL_ID;
const CHALLENGERS = CHAT_MODELS.filter((m) => m.id !== INCUMBENT);

type Contestant = { modelId: string; label: string };

type LiveState = {
  contestants: Contestant[];
  judge: Contestant;
  shape: { turns: number; maxOutputTokens: number; scenario: string };
  cached: boolean;
  replies: LiveReply[];
  verdict: LiveVerdict | null;
  totalCostUsd: number | null;
  totalMs: number | null;
};

const NOT_RECORDED = "not recorded";

function labelOf(modelId: string, given?: string): string {
  return findModel(modelId)?.label ?? given ?? modelId;
}

function shapeLine(shape: { turns: number; maxOutputTokens: number }): string {
  const word = shape.turns === 1 ? "turn" : "turns";
  return `${shape.turns} ${word}, up to ${shape.maxOutputTokens.toLocaleString("en-US")} output tokens`;
}

function scoresFor(verdict: LiveVerdict | null, modelId: string): RubricScores | null {
  return verdict?.scores.find((s) => s.modelId === modelId)?.scores ?? null;
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap py-2 font-medium ${right ? "pr-0" : "pr-4"}`}
    >
      {children}
    </th>
  );
}

function PublishedBlock({ headingId }: { headingId: string }) {
  const evals = PUBLISHED_EVALS;
  const scored = hasPublishedScores(evals);
  return (
    <section className="min-w-0" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500"
      >
        Published run
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {evals.shape.scenario}. Measured {evals.measuredAt} on the real system prompt:{" "}
        {shapeLine(evals.shape)}. These cells are checked into the repo. A live run below never
        writes into one of them.
      </p>

      {/* This table is wider than a phone column everywhere it renders: 368 px
          of content against 248 px at 280, 288 px at 320, 328 px at 360, and
          278 px inside the inline demo frame at 360. Cost, First token and
          Read sit past the right edge, so the box that scrolls them takes
          focus and names itself, or they are mouse-only. */}
      <div
        className={`mt-5 ${SIDEWAYS_SCROLL_REGION}`}
        role="region"
        aria-label="Published bake-off results, scroll sideways"
        tabIndex={0}
      >
        <table className="min-w-full text-left text-sm">
          <caption className="sr-only">
            Published bake-off, measured {evals.measuredAt}
          </caption>
          <thead>
            <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-[0.14em] text-zinc-500 dark:border-zinc-800">
              <Th>Model</Th>
              <Th>Cost</Th>
              <Th>First token</Th>
              {scored && <Th>Score</Th>}
              <Th right>Read</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {evals.rows.map((row) => {
              const average = rubricAverage(row.rubricScores);
              return (
                <tr key={row.modelId}>
                  <td className="py-3 pr-4 align-top">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {rowLabel(row)}
                    </span>
                    <span className="block font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
                      {row.modelId}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 align-top tabular-nums text-zinc-600 dark:text-zinc-400">
                    {row.costUsd === null ? NOT_RECORDED : formatUsd(row.costUsd)}
                    {row.costUsd !== null && row.approximate && (
                      <span className="sr-only">
                        , summed from per-turn figures the script rounded
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 align-top tabular-nums text-zinc-600 dark:text-zinc-400">
                    {row.ttftMs === null ? NOT_RECORDED : formatMs(row.ttftMs)}
                  </td>
                  {scored && (
                    <td className="whitespace-nowrap py-3 pr-4 align-top tabular-nums text-zinc-600 dark:text-zinc-400">
                      {average === null ? NOT_RECORDED : `${average} of ${MAX_RUBRIC_SCORE}`}
                    </td>
                  )}
                  <td className="py-3 align-top text-zinc-600 dark:text-zinc-400">{row.read}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <dl className="mt-5 grid gap-x-8 gap-y-2 text-[11px] text-zinc-500 sm:grid-cols-2">
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 font-medium">Commit</dt>
          <dd className="min-w-0 break-all font-mono">{evals.gitSha.slice(0, 12)}</dd>
        </div>
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 font-medium">Prompt hash</dt>
          <dd className="min-w-0 break-all font-mono">{evals.promptHash ?? NOT_RECORDED}</dd>
        </div>
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 font-medium">Prompt call</dt>
          <dd className="min-w-0 break-all font-mono">{evals.shape.promptCall}</dd>
        </div>
        <div className="flex min-w-0 gap-2">
          <dt className="shrink-0 font-medium">Scored by</dt>
          <dd className="min-w-0">{hasPublishedScores(evals) ? "a judge model" : "a person"}</dd>
        </div>
      </dl>

      <ul className="mt-4 space-y-1.5">
        {evals.notes.map((note) => (
          <li key={note} className="flex gap-2 text-[11px] leading-relaxed text-zinc-500">
            <span aria-hidden className="text-zinc-400 dark:text-zinc-600">
              &bull;
            </span>
            <span className="min-w-0">{note}</span>
          </li>
        ))}
        {evals.unscored.map((u) => (
          <li key={u.modelId} className="flex gap-2 text-[11px] leading-relaxed text-zinc-500">
            <span aria-hidden className="text-zinc-400 dark:text-zinc-600">
              &bull;
            </span>
            <span className="min-w-0">
              {labelOf(u.modelId)}: {u.why}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LiveBlock({ live }: { live: LiveState }) {
  const winner = live.verdict ? labelOf(live.verdict.winnerModelId) : "";
  return (
    <div className="mt-5 min-w-0 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-400">
        {live.cached ? "Live run, cached from earlier today" : "Live run"}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        {shapeLine(live.shape)} · scored by {live.judge.label} · a model never scores itself
        {live.totalCostUsd === null ? "" : ` · ${formatUsd(live.totalCostUsd)}`}
        {live.totalMs === null ? "" : ` · ${formatMs(live.totalMs)}`}
      </p>

      <div className="mt-4 min-w-0 space-y-4">
        {live.contestants.map((c) => {
          const reply = live.replies.find((r) => r.modelId === c.modelId);
          const scores = scoresFor(live.verdict, c.modelId);
          const average = rubricAverage(scores);
          return (
            <div key={c.modelId} className="min-w-0 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.label}</p>
                <p className="text-[11px] tabular-nums text-zinc-500">
                  {reply ? formatMs(reply.totalMs) : "running"}
                  {reply ? ` · ${formatTokens(reply.tokens.output)} out` : ""}
                  {reply ? ` · ${formatUsd(reply.costUsd)}` : ""}
                  {average === null ? "" : ` · ${average} of ${MAX_RUBRIC_SCORE}`}
                </p>
              </div>
              {scores && (
                <ul className="mt-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1">
                  {EVAL_RUBRIC.map((r) => (
                    <li key={r.key} className="text-[11px] tabular-nums text-zinc-500">
                      {r.label} {scores[r.key]}
                    </li>
                  ))}
                </ul>
              )}
              {reply && reply.text.trim().length > 0 && (
                <details className="mt-2 min-w-0">
                  <summary className="cursor-pointer text-[11px] text-zinc-600 dark:text-zinc-400">
                    Read the reply
                  </summary>
                  <p className="mt-2 min-w-0 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {reply.text.trim()}
                  </p>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {live.verdict && (
        <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="text-sm text-zinc-900 dark:text-zinc-100">
            Winner: <span className="font-medium">{winner}</span>
          </p>
          {live.verdict.rationale.trim().length > 0 && (
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {live.verdict.rationale.trim()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export type EvalPanelProps = {
  /**
   * Where this panel's progress line and notices go to be spoken. The inline
   * demo frame passes its own always-rendered region here, because the
   * tabpanel this panel sits in is hidden with `display: none` whenever the
   * visitor is on Chat, and a hidden subtree is not in the accessibility tree.
   * Left out (on /how-it-works, where nothing hides the panel) the copy below
   * carries its own region, exactly as it did before.
   */
  onAnnounce?: Announce;
};

export function EvalPanel({ onAnnounce }: EvalPanelProps) {
  const uid = useId();
  const publishedHeadingId = `${uid}-published`;
  const liveHeadingId = `${uid}-live`;
  const challengerId = `${uid}-challenger`;
  const [challenger, setChallenger] = useState<string>(
    CHALLENGERS[CHALLENGERS.length - 1]?.id ?? INCUMBENT,
  );
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [live, setLive] = useState<LiveState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async () => {
    if (running) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setLive(null);
    setNotice("");

    const apply = (line: string) => {
      const frame = parseEvalFrame(line);
      if (!frame) return;
      if (frame.type === "error") {
        setNotice(frame.message);
        return;
      }
      if (frame.type === "start") {
        setLive({
          contestants: frame.contestants.map((c) => ({
            modelId: c.modelId,
            label: labelOf(c.modelId, c.label),
          })),
          judge: { modelId: frame.judge.modelId, label: labelOf(frame.judge.modelId, frame.judge.label) },
          shape: frame.shape,
          cached: frame.cached,
          replies: [],
          verdict: null,
          totalCostUsd: null,
          totalMs: null,
        });
        return;
      }
      if (frame.type === "reply") {
        setLive((prev) =>
          prev
            ? { ...prev, replies: [...prev.replies.filter((r) => r.modelId !== frame.reply.modelId), frame.reply] }
            : prev,
        );
        return;
      }
      if (frame.type === "verdict") {
        setLive((prev) => (prev ? { ...prev, verdict: frame.verdict } : prev));
        return;
      }
      setLive((prev) =>
        prev ? { ...prev, totalCostUsd: frame.totalCostUsd, totalMs: frame.totalMs } : prev,
      );
    };

    try {
      const res = await fetch("/api/evals/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenger }),
        signal: controller.signal,
      });
      if (!res.body) {
        const text = await res.text();
        apply(text);
        if (!text.trim()) setNotice(`The run could not be reached (${res.status}).`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) apply(line);
      }
      if (buffer.trim()) apply(buffer);
    } catch (err) {
      if (controller.signal.aborted) return;
      setNotice(
        err instanceof Error && err.message
          ? err.message
          : "The run could not be reached. The published table above is unchanged.",
      );
    } finally {
      if (!controller.signal.aborted) setRunning(false);
      // Only clear the slot this run owns. A visitor who stops and starts again
      // must not have the finished run null out the new controller, or the
      // unmount cleanup would have nothing left to abort.
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [challenger, running]);

  /**
   * Stopping ends the stream and the accounting, and never returns the money.
   * The models already called were already paid for, so the notice says so
   * rather than implying a refund. The panel goes back to idle here rather than
   * waiting on the aborted fetch to reject, so a stop can never leave the
   * button stuck reading "Stop".
   */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
    setNotice("You stopped the run. The models already called are still counted.");
  }, []);

  const progress = running
    ? live
      ? `Running ${live.contestants.map((c) => c.label).join(" and ")}, then ${live.judge.label} scores them`
      : "Starting the run"
    : "";
  /** A notice outranks the progress line: a refusal or a stop is the answer. */
  const spoken = notice || progress;

  // What the frame's region was last handed, so an unrelated re-render does
  // not read the same line out again. A new id every time the words change is
  // what makes two runs with the same progress line two announcements.
  const spokenRef = useRef("");
  const seqRef = useRef(0);
  useEffect(() => {
    if (!onAnnounce || spoken === spokenRef.current) return;
    spokenRef.current = spoken;
    seqRef.current += 1;
    onAnnounce(spoken ? { id: `${uid}-live-${seqRef.current}`, text: spoken } : undefined);
  }, [onAnnounce, spoken, uid]);

  return (
    <div className="min-w-0 space-y-8">
      <PublishedBlock headingId={publishedHeadingId} />

      <section
        className="min-w-0 border-t border-zinc-200 pt-8 dark:border-zinc-800"
        aria-labelledby={liveHeadingId}
      >
        <h3
          id={liveHeadingId}
          className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500"
        >
          Run one now
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          One shorter prompt, two models, then a third model scores both replies against the same
          rubric. It is a different measurement from the table above, so it gets its own block and
          its own labels. One run per visitor per day, inside the site budget.
        </p>

        <div className="mt-5 flex min-w-0 flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <label
              htmlFor={challengerId}
              className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
            >
              Challenger to {labelOf(INCUMBENT)}
            </label>
            <select
              id={challengerId}
              value={challenger}
              disabled={running}
              onChange={(e) => setChallenger(e.target.value)}
              className="min-w-0 max-w-full truncate rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-800 focus:border-brand-600 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              {CHALLENGERS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {/*
            One control, two states. While a run is in flight the same button
            stops it, so the visitor is never left watching a disabled button
            spend money it cannot be told to stop spending. It sits directly
            above the line that reports what happened, and that line is spoken
            too, from whichever region this panel was given.
          */}
          <button
            type="button"
            onClick={() => (running ? stop() : void start())}
            className="btn-primary btn-compact shrink-0 disabled:opacity-50"
          >
            {running ? "Stop" : "Run it live"}
          </button>
        </div>

        {/*
          One place for the whole outcome of a live run. A refusal (no shared
          store, the per-visitor cap, the daily budget) is the honest answer
          this section exists for, so it is announced with the progress line
          rather than rendered as silent prose beside it. Two regions here
          would talk over each other.

          Where it is announced depends on who rendered this panel. Inside the
          inline demo the run outlives the tab: a visitor presses Run it live,
          waits out the 20 to 40 seconds on the Chat tab, and this subtree is
          `display: none` by then, pruned out of the accessibility tree with
          every word in it. So the frame passes `onAnnounce` and the speaking
          happens in its region, outside both tabpanels. The copy below still
          renders for the eye either way.
        */}
        <div
          role={onAnnounce ? undefined : "status"}
          aria-live={onAnnounce ? undefined : "polite"}
          className="mt-3 min-w-0 space-y-1"
        >
          <p className="min-h-[1.25rem] text-[11px] text-zinc-500">{progress}</p>
          {notice && (
            <p className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">{notice}</p>
          )}
        </div>

        {live && <LiveBlock live={live} />}

        <p className="mt-5 text-[11px] leading-relaxed text-zinc-500">
          Rubric: {EVAL_RUBRIC.map((r) => r.label).join(" · ")}
        </p>
      </section>
    </div>
  );
}
