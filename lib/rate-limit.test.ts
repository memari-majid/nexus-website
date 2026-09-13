import { describe, expect, it, vi } from "vitest";
import {
  createMemoryStore,
  createRateLimiter,
  createUpstashStore,
  toMicroUsd,
  type CounterStore,
} from "@/lib/rate-limit";

function clock(start = Date.UTC(2026, 8, 12, 12, 0, 0)) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function limiter(overrides: Parameters<typeof createRateLimiter>[1] = {}) {
  const c = clock();
  const store = createMemoryStore(c.now);
  const rl = createRateLimiter(store, { now: c.now, ...overrides });
  return { rl, clock: c, store };
}

describe("checkRequestRate", () => {
  it("allows 20 requests a minute from one IP and refuses the 21st", async () => {
    const { rl } = limiter();
    for (let i = 0; i < 20; i++) expect((await rl.checkRequestRate("1.2.3.4")).allowed).toBe(true);
    expect((await rl.checkRequestRate("1.2.3.4")).allowed).toBe(false);
    expect((await rl.checkRequestRate("9.9.9.9")).allowed).toBe(true);
  });

  it("resets in the next minute bucket", async () => {
    const { rl, clock: c } = limiter();
    for (let i = 0; i < 21; i++) await rl.checkRequestRate("1.2.3.4");
    c.advance(61_000);
    expect((await rl.checkRequestRate("1.2.3.4")).allowed).toBe(true);
  });
});

describe("reserveBudget", () => {
  it("reserves the estimate up front and refuses once the per-IP allowance is spent", async () => {
    const { rl } = limiter({ limits: { perIpDailyUsd: 0.1 } });
    expect((await rl.reserveBudget("a", 0.05)).ok).toBe(true);
    expect((await rl.reserveBudget("a", 0.05)).ok).toBe(true);
    const third = await rl.reserveBudget("a", 0.05);
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.reason).toBe("ip");
    // Another IP is unaffected.
    expect((await rl.reserveBudget("b", 0.05)).ok).toBe(true);
  });

  it("refunds a refused reservation so the counters stay honest", async () => {
    const { rl } = limiter({ limits: { perIpDailyUsd: 0.1 } });
    await rl.reserveBudget("a", 0.08);
    const refused = await rl.reserveBudget("a", 0.05); // 0.13 > 0.10
    expect(refused.ok).toBe(false);
    // 0.08 + 0.02 = 0.10 fits exactly because the 0.05 was refunded.
    const small = await rl.reserveBudget("a", 0.02);
    expect(small.ok).toBe(true);
    if (small.ok) expect(small.ipSpentUsd).toBeCloseTo(0.1, 6);
  });

  it("stops parallel requests at the edge of the cap", async () => {
    const { rl } = limiter({ limits: { perIpDailyUsd: 0.5 } });
    const results = await Promise.all(Array.from({ length: 20 }, () => rl.reserveBudget("nat", 0.05)));
    const admitted = results.filter((r) => r.ok).length;
    expect(admitted).toBe(10);
  });

  it("routes to the fallback beyond the soft budget and refuses beyond the hard budget", async () => {
    const { rl } = limiter({ limits: { perIpDailyUsd: 100, softDailyUsd: 1, hardDailyUsd: 2 } });
    const first = await rl.reserveBudget("a", 0.9);
    expect(first.ok && first.fallback).toBe(false);
    const second = await rl.reserveBudget("b", 0.9); // 1.8 > 1.0 soft
    expect(second.ok && second.fallback).toBe(true);
    const third = await rl.reserveBudget("c", 0.9); // 2.7 > 2.0 hard
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.reason).toBe("global");
    // Refunded: a small request still fits under the hard cap.
    const fourth = await rl.reserveBudget("d", 0.1);
    expect(fourth.ok).toBe(true);
  });

  it("cannot overshoot the hard cap by more than one estimate", async () => {
    const { rl } = limiter({ limits: { perIpDailyUsd: 100, softDailyUsd: 100, hardDailyUsd: 1 } });
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) => rl.reserveBudget(`ip${i}`, 0.3)),
    );
    const admitted = results.filter((r) => r.ok);
    // 0.3 + 0.3 + 0.3 = 0.9 admitted; the fourth would reach 1.2 > 1.0.
    expect(admitted.length).toBe(3);
    // Once the refused reservations are refunded, the settled spend is exactly
    // the admitted estimates: the cap was never overshot by more than one.
    const probe = await rl.reserveBudget("probe", 0.01);
    expect(probe.ok).toBe(true);
    expect(probe.globalSpentUsd).toBeCloseTo(0.91, 6);
  });
});

describe("settleBudget and topUpBudget", () => {
  it("settles down to actual usage (refund) and up (top-up)", async () => {
    const { rl } = limiter({ limits: { perIpDailyUsd: 1 } });
    const a = await rl.reserveBudget("a", 0.5);
    if (!a.ok) throw new Error("expected ok");
    await rl.settleBudget(a.reservation, 0.1); // refund 0.4
    const b = await rl.reserveBudget("a", 0.85); // 0.1 + 0.85 = 0.95 fits
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("expected ok");
    await rl.settleBudget(b.reservation, 0.9); // top up 0.05 -> 1.00
    const c = await rl.reserveBudget("a", 0.01);
    expect(c.ok).toBe(false);
  });

  it("only tops up on abort, never refunds", async () => {
    const { rl } = limiter({ limits: { perIpDailyUsd: 1 } });
    const a = await rl.reserveBudget("a", 0.5);
    if (!a.ok) throw new Error("expected ok");
    await rl.topUpBudget(a.reservation, 0.1); // less than estimate: no change
    const b = await rl.reserveBudget("a", 0.5);
    expect(b.ok).toBe(true);
    if (!b.ok) throw new Error("expected ok");
    await rl.topUpBudget(b.reservation, 0.6); // more than estimate: +0.1
    const c = await rl.reserveBudget("a", 0.01);
    expect(c.ok).toBe(false);
  });
});

describe("reserveEmail", () => {
  it("caps visitor-addressed sends per IP and per site, separately from hand-offs", async () => {
    const { rl } = limiter({
      limits: { perIpEmailsPerDay: 2, globalEmailsPerDay: 3, perIpHandoffsPerDay: 1, globalHandoffsPerDay: 10 },
    });
    expect(await rl.reserveEmail("a", "visitor")).toBe(true);
    expect(await rl.reserveEmail("a", "visitor")).toBe(true);
    expect(await rl.reserveEmail("a", "visitor")).toBe(false); // per-IP
    expect(await rl.reserveEmail("b", "visitor")).toBe(true);
    expect(await rl.reserveEmail("c", "visitor")).toBe(false); // site-wide (3 used)
    // Hand-offs count on their own keys.
    expect(await rl.reserveEmail("a", "handoff")).toBe(true);
    expect(await rl.reserveEmail("a", "handoff")).toBe(false);
  });
});

describe("createUpstashStore", () => {
  it("uses the body-form pipeline with keys in the body, never the URL", async () => {
    const calls: { url: string; body: unknown }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return new Response(
        JSON.stringify([{ result: 7 }, { result: 1 }, { result: 42 }, { result: 1 }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;
    const store = createUpstashStore("https://example.upstash.io/", "tok", fetchImpl);
    const values = await store.incrBy(
      [
        { key: "chat:usd:ip:1.2.3.4:2026-09-12", by: 5 },
        { key: "chat:usd:all:2026-09-12", by: 5 },
      ],
      100,
    );
    expect(values).toEqual([7, 42]);
    expect(calls[0].url).toBe("https://example.upstash.io/pipeline");
    expect(calls[0].body).toEqual([
      ["INCRBY", "chat:usd:ip:1.2.3.4:2026-09-12", "5"],
      ["EXPIRE", "chat:usd:ip:1.2.3.4:2026-09-12", "100"],
      ["INCRBY", "chat:usd:all:2026-09-12", "5"],
      ["EXPIRE", "chat:usd:all:2026-09-12", "100"],
    ]);
  });

  it("passes an abort signal so a hung endpoint throws instead of stalling the chat", async () => {
    let seenSignal: AbortSignal | null | undefined;
    const hung = ((_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        seenSignal = init?.signal;
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason ?? new Error("aborted")));
      })) as typeof fetch;
    const store = createUpstashStore("https://example.upstash.io", "tok", hung, 20);
    const started = Date.now();
    await expect(store.incrBy([{ key: "chat:rpm:x:1", by: 1 }], 10)).rejects.toThrow();
    expect(seenSignal).toBeInstanceOf(AbortSignal);
    expect(Date.now() - started).toBeLessThan(1_000);

    // The limiter then answers from its memory fallback for that call.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const c = clock();
    const rl = createRateLimiter(store, { now: c.now, fallbackStore: createMemoryStore(c.now) });
    expect((await rl.checkRequestRate("x")).allowed).toBe(true);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("falls back to the in-memory store for a call when the primary throws", async () => {
    const failing: CounterStore = {
      incrBy: async () => {
        throw new Error("boom");
      },
    };
    const c = clock();
    const rl = createRateLimiter(failing, { now: c.now, fallbackStore: createMemoryStore(c.now) });
    for (let i = 0; i < 20; i++) expect((await rl.checkRequestRate("x")).allowed).toBe(true);
    expect((await rl.checkRequestRate("x")).allowed).toBe(false);
  });
});

describe("toMicroUsd", () => {
  it("rounds up so a positive charge is never zero", () => {
    expect(toMicroUsd(0.0000001)).toBe(1);
    expect(toMicroUsd(0)).toBe(0);
    expect(toMicroUsd(-1)).toBe(0);
    expect(toMicroUsd(1.5)).toBe(1_500_000);
  });
});
