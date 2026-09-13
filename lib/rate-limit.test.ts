import { describe, expect, it, vi } from "vitest";
import {
  SENT_TTL_SECONDS,
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

/** A store whose every call throws. */
const failingStore: CounterStore = {
  incrBy: async () => {
    throw new Error("boom");
  },
  get: async () => {
    throw new Error("boom");
  },
  set: async () => {
    throw new Error("boom");
  },
};

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

describe("chargeAtLeast", () => {
  it("can be called again for a leg that lands after the settle, and only ever adds", async () => {
    // An eval run the visitor cancelled settles at whatever had landed, and the
    // contestants still in flight land afterwards. `settleBudget` and
    // `topUpBudget` both measure against the ORIGINAL estimate, so calling
    // either twice would refund or double-charge. This one remembers what the
    // reservation has been charged so far.
    const { rl } = limiter({ limits: { perIpDailyUsd: 1 } });
    const a = await rl.reserveBudget("a", 0.1);
    if (!a.ok) throw new Error("expected ok");
    await rl.topUpBudget(a.reservation, 0); // cancelled with nothing landed: 0.1 stands
    await rl.chargeAtLeast(a.reservation, 0.3); // first leg lands: +0.2
    await rl.chargeAtLeast(a.reservation, 0.5); // second leg lands: +0.2, not +0.5
    await rl.chargeAtLeast(a.reservation, 0.4); // a lower total changes nothing
    // Exactly 0.5 of the dollar is spoken for: 0.51 no longer fits, 0.5 still does.
    expect((await rl.reserveBudget("a", 0.51)).ok).toBe(false);
    expect((await rl.reserveBudget("a", 0.5)).ok).toBe(true);
  });

  it("charges a late leg from what a settle already wrote, not from the estimate", async () => {
    // The mixed order the eval route can produce: the run is abandoned, the
    // one-shot top-up moves the counters above the estimate, and a leg lands
    // afterwards with the true total for the whole run. The counters must end
    // at that total. Measuring the late leg against the ORIGINAL estimate
    // charged the gap between the estimate and the top-up a second time: on
    // this reservation, $0.15 for a run that cost $0.12.
    const { rl } = limiter({ limits: { perIpDailyUsd: 1 } });
    const a = await rl.reserveBudget("a", 0.05);
    if (!a.ok) throw new Error("expected ok");
    await rl.topUpBudget(a.reservation, 0.08); // abandoned with 0.08 landed
    await rl.chargeAtLeast(a.reservation, 0.12); // the last leg: 0.12 in total
    expect((await rl.reserveBudget("a", 0.88)).ok).toBe(true);
    // 0.12 exactly, so a dollar's worth of allowance is now used up.
    expect((await rl.reserveBudget("a", 0.0001)).ok).toBe(false);
  });

  it("keeps the same baseline on the eval sub-budget", async () => {
    const { rl } = limiter({ limits: { evalDailyUsd: 0.12 } });
    const a = await rl.reserveEvalBudget(0.05);
    if (!a.ok) throw new Error("expected ok");
    await rl.topUpEvalBudget(a.reservation, 0.08);
    await rl.chargeEvalAtLeast(a.reservation, 0.12);
    // The day's eval share is 0.12 and the run reported 0.12: nothing left,
    // and nothing double-charged either, or 0.15 of a 0.12 share would be gone.
    expect((await rl.reserveEvalBudget(0.0001)).ok).toBe(false);
    const b = await rl.reserveEvalBudget(0.05);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.spentUsd).toBeCloseTo(0.12, 6);
  });

  it("takes a settle's refund as the baseline for a leg that lands after it", async () => {
    // The other order: a finished run settles below its estimate, then a leg
    // nobody waited for lands and reports the real total. Charging it against
    // the estimate would have skipped the dollars the settle gave back.
    const { rl } = limiter({ limits: { perIpDailyUsd: 1 } });
    const a = await rl.reserveBudget("a", 0.5);
    if (!a.ok) throw new Error("expected ok");
    await rl.settleBudget(a.reservation, 0.1); // refund 0.4
    await rl.chargeAtLeast(a.reservation, 0.3); // late leg: 0.3 in total
    expect((await rl.reserveBudget("a", 0.7)).ok).toBe(true);
    expect((await rl.reserveBudget("a", 0.0001)).ok).toBe(false);
  });

  it("never lowers a reservation, whatever a late leg reports", async () => {
    const { rl } = limiter({ limits: { evalDailyUsd: 0.1 } });
    const a = await rl.reserveEvalBudget(0.09);
    if (!a.ok) throw new Error("expected ok");
    // The run was cancelled before anything landed, and the one leg that came
    // back was cheaper than the estimate. The estimate is still the floor.
    await rl.chargeEvalAtLeast(a.reservation, 0.01);
    expect((await rl.reserveEvalBudget(0.02)).ok).toBe(false);
    // And a late leg that costs more than the estimate is charged for.
    await rl.chargeEvalAtLeast(a.reservation, 0.1);
    expect((await rl.reserveEvalBudget(0.0001)).ok).toBe(false);
  });
});

describe("reserveEvalRun", () => {
  it("gives a visitor one live run for the UTC day and refuses the next", async () => {
    const { rl } = limiter({ limits: { evalRunsPerIpPerDay: 1 } });
    const first = await rl.reserveEvalRun("1.2.3.4");
    expect(first.ok).toBe(true);
    expect(first.runsToday).toBe(1);
    const second = await rl.reserveEvalRun("1.2.3.4");
    expect(second.ok).toBe(false);
    // The refusal gives its own increment back, so a refused visitor does not
    // climb away from the cap and block a later release.
    expect(second.runsToday).toBe(1);
  });

  it("lets exactly one of a burst of parallel taps through", async () => {
    // The whole reason the counter goes up before the check: a visitor tapping
    // the button three times must not start three runs, and a cache written
    // when the first one finishes is 20 to 40 seconds too late to stop them.
    const { rl } = limiter({ limits: { evalRunsPerIpPerDay: 1 } });
    const results = await Promise.all([
      rl.reserveEvalRun("1.2.3.4"),
      rl.reserveEvalRun("1.2.3.4"),
      rl.reserveEvalRun("1.2.3.4"),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("gives the run back only when nothing ran", async () => {
    const { rl } = limiter({ limits: { evalRunsPerIpPerDay: 1 } });
    const taken = await rl.reserveEvalRun("1.2.3.4");
    if (!taken.ok) throw new Error("expected ok");
    expect((await rl.reserveEvalRun("1.2.3.4")).ok).toBe(false);
    // A budget refusal before the first model call: the visitor keeps the run.
    await rl.releaseEvalRun(taken.reservation);
    expect((await rl.reserveEvalRun("1.2.3.4")).ok).toBe(true);
  });

  it("counts each visitor on its own key and resets at the UTC day", async () => {
    const { rl, clock: c } = limiter({ limits: { evalRunsPerIpPerDay: 1 } });
    expect((await rl.reserveEvalRun("1.2.3.4")).ok).toBe(true);
    expect((await rl.reserveEvalRun("5.6.7.8")).ok).toBe(true);
    expect((await rl.reserveEvalRun("1.2.3.4")).ok).toBe(false);
    c.advance(24 * 60 * 60 * 1000);
    expect((await rl.reserveEvalRun("1.2.3.4")).ok).toBe(true);
  });
});

describe("the eval sub-budget", () => {
  it("refuses over its share and hands the refused estimate straight back", async () => {
    const { rl } = limiter({ limits: { evalDailyUsd: 0.1 } });
    const a = await rl.reserveEvalBudget(0.08);
    expect(a.ok).toBe(true);
    const b = await rl.reserveEvalBudget(0.08); // 0.16 > 0.10
    expect(b.ok).toBe(false);
    // The refusal refunded itself, so the day still has its 0.02 left.
    const c = await rl.reserveEvalBudget(0.02);
    expect(c.ok).toBe(true);
  });

  it("settles a finished run down to what it actually cost", async () => {
    const { rl } = limiter({ limits: { evalDailyUsd: 0.1 } });
    const a = await rl.reserveEvalBudget(0.09);
    if (!a.ok) throw new Error("expected ok");
    await rl.settleEvalBudget(a.reservation, 0.01); // refund 0.08
    expect((await rl.reserveEvalBudget(0.09)).ok).toBe(true);
  });

  it("never lowers the reserved amount for a run that was abandoned or failed", async () => {
    // The documented contract for an abandoned run, on both counters: its
    // prompts were consumed, so the estimate is the floor. Real gateway spend
    // must not escape the eval share or the global hard cap just because the
    // visitor closed the tab.
    const { rl } = limiter({ limits: { evalDailyUsd: 0.1 } });
    const a = await rl.reserveEvalBudget(0.09);
    if (!a.ok) throw new Error("expected ok");
    await rl.topUpEvalBudget(a.reservation, 0); // abandoned: no usage reported
    // Still 0.09 of the 0.10 spoken for, so a second run does not fit.
    expect((await rl.reserveEvalBudget(0.02)).ok).toBe(false);
    const b = await rl.reserveEvalBudget(0.01);
    if (!b.ok) throw new Error("expected ok");
    await rl.topUpEvalBudget(b.reservation, 0.05); // more than the estimate: charged
    expect((await rl.reserveEvalBudget(0.0001)).ok).toBe(false);
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

describe("createMemoryStore records", () => {
  it("stores a string with a TTL, replaces it, and forgets it once expired", async () => {
    const c = clock();
    const store = createMemoryStore(c.now);
    expect(await store.get("chat:sent:t:1")).toBeNull();
    await store.set("chat:sent:t:1", '{"a":1}', 10);
    expect(await store.get("chat:sent:t:1")).toBe('{"a":1}');
    await store.set("chat:sent:t:1", '{"a":2}', 10);
    expect(await store.get("chat:sent:t:1")).toBe('{"a":2}');
    c.advance(10_001);
    expect(await store.get("chat:sent:t:1")).toBeNull();
    // Records and counters never share a namespace.
    await store.incrBy([{ key: "chat:sent:t:2", by: 1 }], 10);
    expect(await store.get("chat:sent:t:2")).toBeNull();
  });
});

describe("rememberSent and recallSent", () => {
  it("remembers a delivered output for 24 hours, per tool and call id", async () => {
    const { rl, clock: c } = limiter();
    const output = { name: "Ada", email: "ada@acme.com", briefAttached: true, delivered: true };
    expect(await rl.recallSent("handOffToMajid", "toolu_01")).toBeNull();
    await rl.rememberSent("handOffToMajid", "toolu_01", output);
    expect(await rl.recallSent("handOffToMajid", "toolu_01")).toEqual(output);
    expect(await rl.recallSent("emailBriefToVisitor", "toolu_01")).toBeNull();
    expect(await rl.recallSent("handOffToMajid", "toolu_02")).toBeNull();
    c.advance(SENT_TTL_SECONDS * 1000 - 1);
    expect(await rl.recallSent("handOffToMajid", "toolu_01")).toEqual(output);
    c.advance(2);
    expect(await rl.recallSent("handOffToMajid", "toolu_01")).toBeNull();
  });

  it("ignores an empty call id so unrelated sends can never collide", async () => {
    const { rl } = limiter();
    await rl.rememberSent("handOffToMajid", "", { delivered: true });
    expect(await rl.recallSent("handOffToMajid", "")).toBeNull();
  });

  it("keeps long or odd call ids apart", async () => {
    const { rl } = limiter();
    const a = "x".repeat(100) + "a";
    const b = "x".repeat(100) + "b";
    await rl.rememberSent("emailWorkshopInfo", a, { delivered: true, which: "a" });
    await rl.rememberSent("emailWorkshopInfo", "call/with:odd chars", { delivered: true, which: "odd" });
    expect(await rl.recallSent("emailWorkshopInfo", a)).toEqual({ delivered: true, which: "a" });
    expect(await rl.recallSent("emailWorkshopInfo", b)).toBeNull();
    expect(await rl.recallSent("emailWorkshopInfo", "call/with:odd chars")).toEqual({
      delivered: true,
      which: "odd",
    });
  });

  it("uses the memory fallback for the call when the primary throws, and never throws itself", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const c = clock();
    const rl = createRateLimiter(failingStore, { now: c.now, fallbackStore: createMemoryStore(c.now) });
    await expect(rl.rememberSent("handOffToMajid", "toolu_01", { delivered: true })).resolves.toBeUndefined();
    expect(await rl.recallSent("handOffToMajid", "toolu_01")).toEqual({ delivered: true });
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("fails open when a record cannot be read: null, so the caller sends normally", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const c = clock();
    const memory = createMemoryStore(c.now);
    const readBroken: CounterStore = { ...memory, get: failingStore.get };
    const rl = createRateLimiter(readBroken, { now: c.now, fallbackStore: createMemoryStore(c.now) });
    await rl.rememberSent("handOffToMajid", "toolu_01", { delivered: true });
    expect(await memory.get("chat:sent:handOffToMajid:toolu_01")).toBe('{"delivered":true}');
    expect(await rl.recallSent("handOffToMajid", "toolu_01")).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("fails open on a corrupt record", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { rl, store } = limiter();
    await store.set("chat:sent:handOffToMajid:toolu_01", "not json", 60);
    expect(await rl.recallSent("handOffToMajid", "toolu_01")).toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("shares the key prefix with the counters so two sites can share one database", async () => {
    const c = clock();
    const store = createMemoryStore(c.now);
    const rl = createRateLimiter(store, { now: c.now, prefix: "majid" });
    await rl.rememberSent("handOffToMajid", "toolu_01", { delivered: true });
    expect(await store.get("majid:sent:handOffToMajid:toolu_01")).toBe('{"delivered":true}');
    expect(await store.get("chat:sent:handOffToMajid:toolu_01")).toBeNull();
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
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const c = clock();
    const rl = createRateLimiter(failingStore, { now: c.now, fallbackStore: createMemoryStore(c.now) });
    for (let i = 0; i < 20; i++) expect((await rl.checkRequestRate("x")).allowed).toBe(true);
    expect((await rl.checkRequestRate("x")).allowed).toBe(false);
    error.mockRestore();
  });

  it("reads and writes sent records through the same body-form pipeline", async () => {
    const bodies: unknown[] = [];
    let stored: string | null = null;
    const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
      const commands = JSON.parse(String(init?.body)) as string[][];
      bodies.push(commands);
      const rows = commands.map((cmd) => {
        if (cmd[0] === "GET") return { result: stored };
        stored = cmd[2];
        return { result: "OK" };
      });
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    const store = createUpstashStore("https://example.upstash.io", "tok", fetchImpl);
    const key = "chat:sent:handOffToMajid:toolu_01";
    expect(await store.get(key)).toBeNull();
    await store.set(key, '{"delivered":true}', SENT_TTL_SECONDS);
    expect(await store.get(key)).toBe('{"delivered":true}');
    expect(bodies).toEqual([
      [["GET", key]],
      [["SET", key, '{"delivered":true}', "EX", String(SENT_TTL_SECONDS)]],
      [["GET", key]],
    ]);
  });

  it("throws on a pipeline error row for get and set so the limiter can fail open", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify([{ error: "WRONGTYPE" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const store = createUpstashStore("https://example.upstash.io", "tok", fetchImpl);
    await expect(store.get("chat:sent:t:1")).rejects.toThrow(/WRONGTYPE/);
    await expect(store.set("chat:sent:t:1", "x", 10)).rejects.toThrow(/WRONGTYPE/);
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
