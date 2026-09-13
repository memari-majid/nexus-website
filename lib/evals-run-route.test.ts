/**
 * The money fences on `app/api/evals/run/route.ts`.
 *
 * It lives in `lib/` because `vitest.config.ts` includes `lib/**\/*.test.ts`
 * only, and it is worth the awkward home: the two things asserted here are the
 * two ways this route can leak real gateway spend, and neither is visible from
 * a pure-function test.
 *
 * 1. The per-visitor daily run cap is a counter taken BEFORE any model call,
 *    so a visitor cannot start a second run by abandoning the first, and three
 *    parallel taps cannot all run. The count is given back only on the paths
 *    where nothing ran.
 * 2. A run the visitor abandons settles UPWARDS on both counters. Its prompts
 *    were already billed by the gateway, so refunding the reservation would
 *    let that spend escape the eval sub-budget and the global hard cap. The
 *    settle runs once, so a leg that lands after the cancellation has to raise
 *    the charge itself rather than ride for free.
 * 3. The replay cache answers the pair the visitor asked for and no other, so
 *    a second tap on a different challenger meets the run counter instead of
 *    being handed back a comparison that was never run.
 *
 * The gateway is mocked: this test never calls a model and never spends.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseEvalFrame, type EvalFrame } from "@/lib/evals";

const h = vi.hoisted(() => ({
  limiter: null as unknown as Record<string, unknown>,
  generateText: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({ getRateLimiter: () => h.limiter }));

// Partial: `lib/chat-tools.ts` is pulled in through the request helpers and
// needs the real `tool()`. Only the two calls that would cost money are faked.
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    gateway: (id: string) => ({ id }),
    generateText: (...args: unknown[]) => h.generateText(...args),
  };
});

const { POST } = await import("@/app/api/evals/run/route");

type Fake = ReturnType<typeof fakeLimiter>;

function fakeLimiter(overrides: Record<string, unknown> = {}) {
  return {
    backend: "upstash" as const,
    checkRequestRate: vi.fn(async () => ({ allowed: true, count: 1 })),
    recallRun: vi.fn(async (_bucket: string): Promise<unknown> => null),
    rememberRun: vi.fn(async (_bucket: string, _run: unknown) => {}),
    reserveEvalRun: vi.fn(async () => ({ ok: true, reservation: { key: "runs" }, runsToday: 1 })),
    releaseEvalRun: vi.fn(async () => {}),
    reserveBudget: vi.fn(async () => ({
      ok: true,
      reservation: { ipKey: "ip", globalKey: "all", estimateMicro: 75_500 },
      fallback: false,
      ipSpentUsd: 0.0755,
      globalSpentUsd: 0.0755,
    })),
    settleBudget: vi.fn(async (_reservation: unknown, _usd: number) => {}),
    topUpBudget: vi.fn(async (_reservation: unknown, _usd: number) => {}),
    chargeAtLeast: vi.fn(async (_reservation: unknown, _usd: number) => {}),
    reserveEvalBudget: vi.fn(async () => ({
      ok: true,
      reservation: { key: "evals", estimateMicro: 75_500 },
      spentUsd: 0.0755,
    })),
    settleEvalBudget: vi.fn(async (_reservation: unknown, _usd: number) => {}),
    topUpEvalBudget: vi.fn(async (_reservation: unknown, _usd: number) => {}),
    chargeEvalAtLeast: vi.fn(async (_reservation: unknown, _usd: number) => {}),
    ...overrides,
  };
}

function post(challenger = "anthropic/claude-sonnet-5"): Promise<Response> {
  return POST(
    new Request("https://nexusaisolution.net/api/evals/run", {
      method: "POST",
      headers: { "x-real-ip": "1.2.3.4", "Content-Type": "application/json" },
      body: JSON.stringify({ challenger }),
    }),
  );
}

/** Waits for the pending microtasks the route's settle and charge paths queue. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function frames(res: Response): Promise<EvalFrame[]> {
  const body = await res.text();
  return body
    .split("\n")
    .map(parseEvalFrame)
    .filter((f): f is EvalFrame => f !== null);
}

const usage = { inputTokens: 6_000, outputTokens: 400, totalTokens: 6_400 };

/** One contestant reply, then a judge verdict, both instant. */
function mockGateway(): void {
  h.generateText.mockImplementation(async (args: { output?: unknown }) => {
    if (args.output) {
      return {
        usage,
        output: {
          scores: [
            { model: "A", consults: 5, specific: 4, human: 4, grounded: 5, forward: 4 },
            { model: "B", consults: 4, specific: 4, human: 4, grounded: 5, forward: 4 },
          ],
          winner: "A",
          rationale: "It asked one question before it recommended anything.",
        },
      };
    }
    return { text: "Start with retrieval over the SOPs.", usage };
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  h.generateText.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.limiter = fakeLimiter();
});

describe("the per-visitor daily run cap", () => {
  it("refuses the second run of the day before a model is called or a dollar is reserved", async () => {
    const limiter = fakeLimiter({
      reserveEvalRun: vi.fn(async () => ({ ok: false, runsToday: 1 })),
    });
    h.limiter = limiter;
    mockGateway();

    const res = await post();

    expect(res.status).toBe(429);
    const sent = await frames(res);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe("error");
    // Nothing downstream of the cap happened: no reservation, no model call.
    expect(limiter.reserveBudget).not.toHaveBeenCalled();
    expect(limiter.reserveEvalBudget).not.toHaveBeenCalled();
    expect(h.generateText).not.toHaveBeenCalled();
  });

  it("answers a visitor who already ran today from the cache, without taking a second run", async () => {
    const limiter = fakeLimiter({
      recallRun: vi.fn(async () => ({
        contestants: [{ modelId: "anthropic/claude-opus-5", label: "Claude Opus 5" }],
        judge: { modelId: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
        replies: [],
        verdict: null,
        totalCostUsd: 0.031,
        totalMs: 8_000,
      })),
    });
    h.limiter = limiter;
    mockGateway();

    const res = await post();

    expect(res.status).toBe(200);
    const sent = await frames(res);
    expect(sent[0]).toMatchObject({ type: "start", cached: true });
    expect(limiter.reserveEvalRun).not.toHaveBeenCalled();
    expect(h.generateText).not.toHaveBeenCalled();
  });

  it("gives the run back when a budget refuses, because nothing ran", async () => {
    const limiter = fakeLimiter({
      reserveBudget: vi.fn(async () => ({ ok: false, reason: "ip", ipSpentUsd: 1, globalSpentUsd: 1 })),
    });
    h.limiter = limiter;
    mockGateway();

    const res = await post();

    expect(res.status).toBe(429);
    expect(limiter.releaseEvalRun).toHaveBeenCalledTimes(1);
    expect(h.generateText).not.toHaveBeenCalled();
  });

  it("gives the run back and refunds the chat reservation when the eval share is gone", async () => {
    const limiter = fakeLimiter({
      reserveEvalBudget: vi.fn(async () => ({ ok: false, spentUsd: 1 })),
    });
    h.limiter = limiter;
    mockGateway();

    const res = await post();

    expect(res.status).toBe(503);
    expect(limiter.settleBudget).toHaveBeenCalledWith(expect.anything(), 0);
    expect(limiter.releaseEvalRun).toHaveBeenCalledTimes(1);
    expect(h.generateText).not.toHaveBeenCalled();
  });
});

describe("settling a run", () => {
  it("settles a finished run down to what it cost and remembers it for the replay", async () => {
    const limiter = h.limiter as Fake;
    mockGateway();

    const sent = await frames(await post());

    expect(sent.map((f) => f.type)).toEqual(["start", "reply", "reply", "verdict", "done"]);
    expect(limiter.settleBudget).toHaveBeenCalledTimes(1);
    expect(limiter.settleEvalBudget).toHaveBeenCalledTimes(1);
    const [, billed] = limiter.settleBudget.mock.calls[0] as [unknown, number];
    expect(billed).toBeGreaterThan(0);
    expect(limiter.topUpBudget).not.toHaveBeenCalled();
    expect(limiter.topUpEvalBudget).not.toHaveBeenCalled();
    expect(limiter.rememberRun).toHaveBeenCalledTimes(1);
    // A finished run is the visitor's run for the day: never given back.
    expect(limiter.releaseEvalRun).not.toHaveBeenCalled();
  });

  it("tops both counters up and never refunds when the visitor abandons the stream", async () => {
    const limiter = h.limiter as Fake;
    // The contestants never come back: the visitor closes the tab mid-run.
    h.generateText.mockImplementation(() => new Promise(() => {}));

    const res = await post();
    await res.body!.cancel();
    await tick();

    // Settled upwards only. `settleBudget` would hand back the reservation,
    // and the prompts this run consumed are already billed.
    expect(limiter.topUpBudget).toHaveBeenCalledTimes(1);
    expect(limiter.topUpEvalBudget).toHaveBeenCalledTimes(1);
    expect(limiter.settleBudget).not.toHaveBeenCalled();
    expect(limiter.settleEvalBudget).not.toHaveBeenCalled();
    // And the abandoned run still counts against the visitor's day.
    expect(limiter.releaseEvalRun).not.toHaveBeenCalled();
    expect(limiter.rememberRun).not.toHaveBeenCalled();
  });

  it("charges a contestant leg that lands after the visitor cancelled", async () => {
    const limiter = h.limiter as Fake;
    // The first settle wins, and on a cancellation it fires with nothing spent
    // yet. The legs still in flight are real gateway spend: if they only added
    // to a local total, that money would never reach either counter.
    let land = (): void => {};
    const landed = new Promise<void>((resolve) => {
      land = resolve;
    });
    h.generateText.mockImplementation(async () => {
      await landed;
      return { text: "Start with retrieval over the SOPs.", usage };
    });

    const res = await post();
    await res.body!.cancel();
    await tick();

    // Cancelled with nothing landed: the reservation stands and nothing extra
    // has been charged yet.
    expect(limiter.topUpBudget).toHaveBeenCalledTimes(1);
    expect(limiter.chargeAtLeast).not.toHaveBeenCalled();

    land();
    await tick();

    expect(limiter.chargeAtLeast).toHaveBeenCalled();
    expect(limiter.chargeEvalAtLeast).toHaveBeenCalled();
    // Repeatable and monotonic: the highest total reported is what the legs
    // that landed actually cost, and it is more than the zero the cancellation
    // settled at.
    const billed = Math.max(...limiter.chargeAtLeast.mock.calls.map(([, usd]) => usd));
    const billedEvals = Math.max(...limiter.chargeEvalAtLeast.mock.calls.map(([, usd]) => usd));
    expect(billed).toBeGreaterThan(0);
    expect(billedEvals).toBeGreaterThan(0);
    // Still never refunded, and the judge leg never starts on a run nobody is
    // reading, so the cancelled run spends only what was already in flight.
    expect(limiter.settleBudget).not.toHaveBeenCalled();
    expect(limiter.settleEvalBudget).not.toHaveBeenCalled();
    expect(h.generateText).toHaveBeenCalledTimes(2);
  });
});

describe("the replay cache", () => {
  it("keys the replay on the challenger, not on the visitor and the day alone", async () => {
    const limiter = h.limiter as Fake;
    mockGateway();

    // Read to the end, so the finished run has been filed before we look.
    await frames(await post("google/gemini-3.8-flash"));

    const [bucket] = limiter.recallRun.mock.calls[0] as [string];
    expect(bucket).toContain("google/gemini-3.8-flash");
    // The run that is remembered is filed under the same pair it ran.
    const [remembered] = limiter.rememberRun.mock.calls[0] as [string];
    expect(remembered).toBe(bucket);
  });

  it("refuses a pair the visitor never ran instead of replaying the one they did", async () => {
    // The visitor ran Opus vs Sonnet earlier, then picked Gemini. There is no
    // cached run for THAT pair, so the request falls through to the run
    // counter, which has already been spent, and the visitor gets an honest
    // refusal rather than a comparison they did not ask for.
    const limiter = fakeLimiter({
      recallRun: vi.fn(async (bucket: string) =>
        bucket.includes("anthropic/claude-sonnet-5")
          ? {
              contestants: [{ modelId: "anthropic/claude-opus-5", label: "Claude Opus 5" }],
              judge: { modelId: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash" },
              replies: [],
              verdict: null,
              totalCostUsd: 0.031,
              totalMs: 8_000,
            }
          : null,
      ),
      reserveEvalRun: vi.fn(async () => ({ ok: false, runsToday: 1 })),
    });
    h.limiter = limiter;
    mockGateway();

    const res = await post("google/gemini-3.8-flash");

    expect(res.status).toBe(429);
    const sent = await frames(res);
    expect(sent).toHaveLength(1);
    expect(sent[0].type).toBe("error");
    expect(limiter.reserveEvalRun).toHaveBeenCalledTimes(1);
    expect(h.generateText).not.toHaveBeenCalled();

    // The pair they did run still replays, and still takes no second run.
    h.limiter = limiter;
    const replay = await post("anthropic/claude-sonnet-5");
    expect(replay.status).toBe(200);
    expect((await frames(replay))[0]).toMatchObject({ type: "start", cached: true });
    expect(limiter.reserveEvalRun).toHaveBeenCalledTimes(1);
  });
});
