/**
 * The live evaluation run behind the evaluations panel.
 *
 * A visitor picks a challenger to the production default, and this route puts
 * one real question to both models through the REAL system prompt, then has a
 * third model score the two replies blind against the published rubric. It is
 * the most expensive thing a visitor can trigger on this site, so every guard
 * the chat has applies here and two more on top:
 *
 * 1. `checkRequestRate`, the same per-IP per-minute bucket as the chat.
 * 2. A shared counter store is REQUIRED. On the in-memory fallback the daily
 *    cap could be bypassed by landing on another instance, so the run is
 *    refused before anything is spent rather than run unbounded.
 * 3. One run per visitor per UTC day, counted by `reserveEvalRun` before any
 *    model is called. A run that fails, times out, or is abandoned keeps its
 *    count: it consumed its prompts. The count is given back only on the two
 *    paths where nothing runs at all (a budget refusal below). The cached
 *    replay in front of it answers a repeat of the SAME pair with that pair's
 *    result and spends nothing, so the usual second visit gets a better answer
 *    than a refusal. The cache key carries the challenger, so a pair the
 *    visitor never ran falls through to the counter and is refused honestly
 *    rather than replayed as a comparison they did not ask for. The counter,
 *    not the cache, is the cap.
 * 4. `reserveBudget`, the ordinary chat reservation. That one call is the only
 *    global hard cap that exists: there is no middleware, no outer guard, and
 *    gateway tags are informational. Skipping it would bypass the $10 ceiling
 *    entirely, so it is never skipped, not even for a cached replay path that
 *    spends nothing (which returns before it).
 * 5. `reserveEvalBudget`, a sub-budget INSIDE the global soft budget, so a
 *    busy eval day cannot eat the chat's day.
 *
 * The run settles in two bounded legs, contestants then judge, whose timeouts
 * add up to well under `maxDuration`: the function must not be killed with
 * money reserved and unreconciled. A failed or abandoned run settles UPWARDS
 * only (`topUpBudget`, `topUpEvalBudget`): the prompts were already paid for,
 * so neither counter is ever handed money back for work that happened. The
 * settle runs once, whichever of the two paths gets there first, so a leg that
 * lands AFTER a cancellation would otherwise be free: those legs raise the
 * charge themselves through `chargeAtLeast` / `chargeEvalAtLeast`, which are
 * repeatable and only ever increase what a reservation has been charged.
 *
 * The response is NDJSON. `ai/rsc` does not exist in ai 6.0.282, so a Server
 * Action cannot stream this, and `readUIMessageStream` will not take a raw
 * fetch body. `lib/evals.ts` owns the frame shapes both sides use.
 */

import { createHash } from "node:crypto";
import {
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  gateway,
  generateText,
} from "ai";
import { z } from "zod";
import { nexusChatSystem } from "@/lib/assistant";
import {
  EVAL_CONTESTANT_TIMEOUT_MS,
  EVAL_JUDGE_MAX_OUTPUT_TOKENS,
  EVAL_JUDGE_TIMEOUT_MS,
  EVAL_MAX_BODY_CHARS,
  EVAL_MAX_OUTPUT_TOKENS,
  evalPrechargeUsd,
} from "@/lib/chat-limits";
import { costUsd, tokenBreakdown } from "@/lib/chat-metadata";
import { defaultModel } from "@/lib/chat-models";
import { clientIp, settleOnce } from "@/lib/chat-request";
import { splitSuggestions } from "@/lib/chat-ui";
import {
  LIVE_EVAL_TURN,
  MAX_RUBRIC_SCORE,
  challengerFor,
  clampRubricScores,
  evalFrameLine,
  judgeFor,
  judgeVerdictSchema,
  rubricPrompt,
  type EvalFrame,
  type LiveReply,
  type LiveVerdict,
} from "@/lib/evals";
import { getRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
/**
 * Literal on purpose: Next reads segment config statically. Mirrors
 * `EVAL_MAX_DURATION_SECONDS` in lib/chat-limits.ts and `vercel.json`. The two
 * legs (40 s + 30 s) plus their overhead sit well inside it, so the function
 * is never killed while a reservation is open.
 */
export const maxDuration = 120;

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

const bodySchema = z.object({ challenger: z.string().max(64).optional() });

/** Logs never carry a raw visitor IP. */
function ipHash(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

const day = () => new Date().toISOString().slice(0, 10);

/** One terminal error frame, as the whole body. Nothing has been spent. */
function refuse(status: number, message: string): Response {
  return new Response(evalFrameLine({ type: "error", message }), {
    status,
    headers: NDJSON_HEADERS,
  });
}

/** Everything the run cache keeps. No visitor text: only what the panel renders. */
type CachedRun = {
  contestants: { modelId: string; label: string }[];
  judge: { modelId: string; label: string };
  replies: LiveReply[];
  verdict: LiveVerdict | null;
  totalCostUsd: number;
  totalMs: number;
};

function readCachedRun(value: unknown): CachedRun | null {
  if (!value || typeof value !== "object") return null;
  const run = value as Partial<CachedRun>;
  if (!Array.isArray(run.contestants) || !Array.isArray(run.replies)) return null;
  if (!run.judge || typeof run.judge !== "object") return null;
  return {
    contestants: run.contestants,
    judge: run.judge,
    replies: run.replies,
    verdict: run.verdict ?? null,
    totalCostUsd: typeof run.totalCostUsd === "number" ? run.totalCostUsd : 0,
    totalMs: typeof run.totalMs === "number" ? run.totalMs : 0,
  };
}

const SHAPE = {
  turns: 1,
  maxOutputTokens: EVAL_MAX_OUTPUT_TOKENS,
  scenario: LIVE_EVAL_TURN,
} as const;

/** Blind labels, so the judge scores the writing and not the brand. */
const HANDLES: readonly string[] = ["A", "B"];

export async function POST(req: Request) {
  const startedAt = Date.now();
  const ip = clientIp(req.headers);
  const limiter = getRateLimiter();

  const rate = await limiter.checkRequestRate(ip);
  if (!rate.allowed) {
    return refuse(429, "That is a lot of runs at once. Give it a few seconds and try again.");
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return refuse(400, "That request could not be read.");
  }
  if (rawText.length > EVAL_MAX_BODY_CHARS) return refuse(413, "That request was too large.");
  let parsed: z.infer<typeof bodySchema>;
  try {
    const result = bodySchema.safeParse(JSON.parse(rawText || "{}"));
    if (!result.success) return refuse(400, "That request could not be read.");
    parsed = result.data;
  } catch {
    return refuse(400, "That request could not be read.");
  }

  const incumbent = defaultModel();
  const challenger = challengerFor(parsed.challenger, incumbent);
  const contestants = [incumbent, challenger];
  const judge = judgeFor(contestants);

  // A per-instance memory store cannot hold a daily cap: another instance
  // would not see the run. Refusing costs nothing, which is the point.
  if (limiter.backend !== "upstash") {
    return refuse(
      503,
      "Live runs need the shared counter store, which is not configured here, so this one was not started and nothing was spent. The published table above is the real measurement.",
    );
  }

  // The challenger is part of the key, not just the visitor and the day. A
  // replay has to be the pair the visitor asked for: keyed on the visitor
  // alone, a second tap after switching the challenger would hand back the
  // first pair's result as though it were the new comparison. With the
  // challenger in the key, a pair that was never run misses the cache and
  // meets the run counter, which refuses it honestly.
  const bucket = `${ipHash(ip)}-${day()}-${challenger.id}`;
  const cached = readCachedRun(await limiter.recallRun(bucket));
  if (cached) {
    const frames: EvalFrame[] = [
      {
        type: "start",
        contestants: cached.contestants,
        judge: cached.judge,
        shape: SHAPE,
        cached: true,
      },
      ...cached.replies.map((reply): EvalFrame => ({ type: "reply", reply })),
      ...(cached.verdict ? [{ type: "verdict" as const, verdict: cached.verdict }] : []),
      { type: "done", totalCostUsd: cached.totalCostUsd, totalMs: cached.totalMs },
    ];
    console.log(
      JSON.stringify({
        event: "evals.usage",
        site: "nexus",
        outcome: "cached",
        ip: ipHash(ip),
        backend: limiter.backend,
        billedUsd: 0,
        totalMs: Date.now() - startedAt,
      }),
    );
    return new Response(frames.map(evalFrameLine).join(""), { headers: NDJSON_HEADERS });
  }

  // The cap, taken before anything is spent. There is no cached run for this
  // visitor and this pair today (that path returned above), so this is a real
  // new run, and a visitor who already ran a different pair is refused here.
  const runSlot = await limiter.reserveEvalRun(ip);
  if (!runSlot.ok) {
    return refuse(
      429,
      "This network already started a live run today, so that one is today's run. The published table above is a different measurement against the same rubric.",
    );
  }

  const precharge = evalPrechargeUsd(contestants, judge);
  const budget = await limiter.reserveBudget(ip, precharge);
  if (!budget.ok) {
    // Nothing will run, so the visitor keeps the run they had.
    await limiter.releaseEvalRun(runSlot.reservation);
    return refuse(
      budget.reason === "ip" ? 429 : 503,
      budget.reason === "ip"
        ? "This network has used today's allowance on this site. The published table above is unaffected."
        : "The site has reached today's usage limit, so no run was started. The published table above is unaffected.",
    );
  }
  const evalBudget = await limiter.reserveEvalBudget(precharge);
  if (!evalBudget.ok) {
    // Refund the reservation we just made and give the run back: nothing will run.
    await limiter.settleBudget(budget.reservation, 0);
    await limiter.releaseEvalRun(runSlot.reservation);
    return refuse(
      503,
      "Live runs have used today's evaluation budget. Come back tomorrow, or read the published run above, which is the same rubric.",
    );
  }

  const encoder = new TextEncoder();
  let spentUsd = 0;
  /** True once the one settle has run: anything landing after it is a late leg. */
  let settled = false;
  /** True once the visitor stopped the run: the stream is gone, the legs are not. */
  let cancelled = false;

  const settle = settleOnce(async (outcome: "finished" | "failed", fields: Record<string, unknown>) => {
    settled = true;
    if (outcome === "finished") {
      await limiter.settleBudget(budget.reservation, spentUsd);
      await limiter.settleEvalBudget(evalBudget.reservation, spentUsd);
    } else {
      // A failed or abandoned run consumed its prompts. Never refund below the
      // estimate on either counter: top up only. The visitor's run count is
      // NOT given back either, for the same reason.
      await limiter.topUpBudget(budget.reservation, spentUsd);
      await limiter.topUpEvalBudget(evalBudget.reservation, spentUsd);
    }
    console.log(
      JSON.stringify({
        event: "evals.usage",
        site: "nexus",
        outcome,
        ip: ipHash(ip),
        backend: limiter.backend,
        incumbent: incumbent.id,
        challenger: challenger.id,
        judge: judge.id,
        prechargeUsd: round6(precharge),
        billedUsd: round6(spentUsd),
        globalSpentUsd: round6(budget.globalSpentUsd),
        evalSpentUsd: round6(evalBudget.spentUsd),
        runsToday: runSlot.runsToday,
        totalMs: Date.now() - startedAt,
        ...fields,
      }),
    );
  });

  /**
   * Adds one leg's actual cost to the running total, and charges it straight
   * away when the run has already settled.
   *
   * `settleOnce` means the first settle wins, and on a cancellation that settle
   * fires while the contestants are still in flight, with `spentUsd` at zero.
   * Every leg that lands afterwards is real gateway spend that the one-shot
   * `settleBudget` / `topUpBudget` pair can no longer report: each of those
   * compares an actual against the ORIGINAL estimate, so calling them again
   * would either refund or double-charge. `chargeAtLeast` is the repeatable
   * form: it raises a reservation to the highest total ever reported and never
   * lowers it, so the second and third late leg each add only their own cost.
   */
  const spend = async (costOfLeg: number): Promise<void> => {
    spentUsd += costOfLeg;
    if (!settled) return;
    await limiter.chargeAtLeast(budget.reservation, spentUsd);
    await limiter.chargeEvalAtLeast(evalBudget.reservation, spentUsd);
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Once the visitor has cancelled there is no stream left to write to,
      // and enqueueing on a cancelled controller throws. This guard is not
      // what keeps the late legs billed: every leg awaits `spend` before its
      // frame is sent, so the charge has already happened by the time a send
      // could throw. It is here so that throw cannot escape `start`, where the
      // catch clause would only try to send again and the second throw would
      // leave the stream erroring instead of closing quietly.
      const send = (frame: EvalFrame) => {
        if (cancelled) return;
        controller.enqueue(encoder.encode(evalFrameLine(frame)));
      };
      const replies: LiveReply[] = [];
      let verdict: LiveVerdict | null = null;
      try {
        send({
          type: "start",
          contestants: contestants.map((m) => ({ modelId: m.id, label: m.label })),
          judge: { modelId: judge.id, label: judge.label },
          shape: SHAPE,
          cached: false,
        });

        // Leg one: both contestants in parallel, on the real prompt, with no
        // tools attached. Email off, which is how production renders it.
        const system = nexusChatSystem({ emailEnabled: false });
        const runs = await Promise.all(
          contestants.map(async (model): Promise<LiveReply> => {
            const began = Date.now();
            const result = await generateText({
              model: gateway(model.id),
              system,
              prompt: LIVE_EVAL_TURN,
              maxOutputTokens: EVAL_MAX_OUTPUT_TOKENS,
              timeout: { totalMs: EVAL_CONTESTANT_TIMEOUT_MS },
              providerOptions: {
                gateway: {
                  tags: ["site:nexus", "feature:evals", `env:${process.env.VERCEL_ENV ?? "dev"}`],
                },
              },
            });
            const tokens = tokenBreakdown(result.usage);
            const cost = costUsd(model, tokens);
            // Charged the moment it lands, so a leg that comes back after the
            // visitor cancelled is still billed to both counters.
            await spend(cost);
            // The prompt asks for a hidden SUGGESTIONS line on every reply.
            // The panel shows the answer, not the chip line.
            return {
              modelId: model.id,
              label: model.label,
              text: splitSuggestions(result.text).body.trim(),
              totalMs: Date.now() - began,
              tokens: { input: tokens.input, output: tokens.output, total: tokens.total },
              costUsd: round6(cost),
            };
          }),
        );
        for (const reply of runs) {
          replies.push(reply);
          send({ type: "reply", reply });
        }
        // The visitor walked away while leg one was in flight. Those calls are
        // charged above; the judge leg is money nobody will ever read, so it
        // never starts.
        if (cancelled) return;

        // Leg two: the judge, blind. It never sees a model name, so it scores
        // the writing rather than the brand, and it is never one of the two
        // models it is scoring.
        const labelled = replies.map((reply, i) => ({ handle: HANDLES[i] ?? `R${i}`, reply }));
        const judgePrompt = [
          "You are scoring two replies from an AI consulting agent to the same prospect message.",
          "",
          `PROSPECT MESSAGE\n${LIVE_EVAL_TURN}`,
          "",
          `RUBRIC, score each reply 1 to ${MAX_RUBRIC_SCORE} on every line\n${rubricPrompt()}`,
          "",
          ...labelled.map(({ handle, reply }) => `REPLY ${handle}\n${reply.text || "(no reply)"}`),
          "",
          "Score both replies, name the better one by its label, and give one sentence of rationale. Do not guess which model wrote which reply and do not mention model names.",
        ].join("\n");

        const judgeBegan = Date.now();
        const judgeResult = await generateText({
          model: gateway(judge.id),
          prompt: judgePrompt,
          maxOutputTokens: EVAL_JUDGE_MAX_OUTPUT_TOKENS,
          timeout: { totalMs: EVAL_JUDGE_TIMEOUT_MS },
          // No tools, ever: `result.output` throws when a step ends in a tool
          // call, and a judge has nothing to call.
          output: Output.object({ schema: judgeVerdictSchema }),
          providerOptions: {
            gateway: {
              tags: ["site:nexus", "feature:evals-judge", `env:${process.env.VERCEL_ENV ?? "dev"}`],
            },
          },
        });
        const judgeTokens = tokenBreakdown(judgeResult.usage);
        await spend(costUsd(judge, judgeTokens));

        try {
          const output = judgeResult.output;
          const byHandle = new Map(labelled.map(({ handle, reply }) => [handle, reply.modelId]));
          const scores = output.scores
            .map((row) => {
              const modelId = byHandle.get(row.model.trim().toUpperCase());
              return modelId ? { modelId, scores: clampRubricScores(row) } : null;
            })
            .filter((row): row is { modelId: string; scores: ReturnType<typeof clampRubricScores> } => row !== null);
          const winnerModelId =
            byHandle.get(output.winner.trim().toUpperCase()) ?? replies[0]?.modelId ?? incumbent.id;
          verdict = {
            judgeModelId: judge.id,
            judgeLabel: judge.label,
            scores,
            winnerModelId,
            rationale: output.rationale.trim(),
          };
          send({ type: "verdict", verdict });
        } catch (err) {
          // `NoOutputGeneratedError` is the expected failure here: the judge
          // produced no parseable object. The replies still stand, so the run
          // reports what it measured and says the scoring did not land.
          // A truncated verdict arrives as `NoObjectGeneratedError`, not
          // `NoOutputGeneratedError`: the judge wrote text that did not fit
          // the schema because its reasoning ate the output cap. Both mean
          // the same thing to a visitor, so both leave the replies standing
          // and say the scoring did not land.
          if (
            !NoOutputGeneratedError.isInstance(err) &&
            !NoObjectGeneratedError.isInstance(err)
          ) {
            throw err;
          }
          console.warn("[evals] judge produced no object:", err);
          send({
            type: "error",
            message: "Both replies came back, but the judge did not return a score this time.",
          });
        }
        console.info(`[evals] judge leg ${Date.now() - judgeBegan}ms`);

        const totalMs = Date.now() - startedAt;
        send({ type: "done", totalCostUsd: round6(spentUsd), totalMs });
        await limiter.rememberRun(bucket, {
          contestants: contestants.map((m) => ({ modelId: m.id, label: m.label })),
          judge: { modelId: judge.id, label: judge.label },
          replies,
          verdict,
          totalCostUsd: round6(spentUsd),
          totalMs,
        } satisfies CachedRun);
        await settle("finished", { replies: replies.length, judged: verdict !== null });
      } catch (err) {
        console.error("[evals] run failed:", err);
        send({
          type: "error",
          message:
            "The run did not finish. Nothing was published, and the table above is unchanged.",
        });
        await settle("failed", { replies: replies.length, judged: verdict !== null });
      } finally {
        // A cancelled stream is already closed; closing it again throws.
        if (!cancelled) controller.close();
      }
    },
    async cancel() {
      // The visitor navigated away or pressed stop. The prompts were already
      // consumed, so the reservation is topped up, never refunded, and any leg
      // still in flight raises the charge itself when it lands (`spend`).
      cancelled = true;
      await settle("failed", { cancelled: true });
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}
