/**
 * Request rate, daily spend, and email counters for the chat route.
 *
 * Reservation instead of read-before-write: `reserveBudget` increments both
 * day counters first and refunds on refusal, so twenty parallel requests from
 * one IP cannot all slip past the edge of the cap, and the global hard cap
 * cannot be overshot by more than one request's estimate. `settleBudget`
 * (onFinish) refunds or tops up against actual usage; `topUpBudget` (onAbort)
 * only ever adds. Both are one-shot, because both measure against the original
 * estimate. `chargeAtLeast` is the repeatable form for work that lands after a
 * request has already settled: it raises the reservation to the highest total
 * ever reported and never lowers it, so a late leg is charged once and only
 * for itself. That holds whatever a settle did first, because a settle records
 * the total it wrote and the repeatable form charges the difference from
 * there, not from the estimate.
 *
 * Storage is Upstash Redis over REST when `KV_REST_API_*` (Vercel
 * Marketplace) or `UPSTASH_REDIS_REST_*` are set, else a per-instance memory
 * map. Upstash is called through the body-form pipeline only: keys contain
 * `:` and must never go in the URL path. `/pipeline` is not atomic, which is
 * fine for counters whose keys embed the time bucket; a refund is a second
 * pipeline call and can race by at most one request. Every call carries a
 * `STORE_TIMEOUT_MS` abort signal: a store that hangs (rather than errors)
 * would otherwise stall the chat past the function ceiling, so past the
 * timeout the call throws and the limiter uses its memory fallback for it.
 *
 * The same store also remembers the output of every delivered approval-gated
 * send for a day, keyed by tool and toolCallId (`rememberSent`,
 * `recallSent`). A retry after a dropped connection re-sends the approved
 * call and the SDK executes it again; the tool returns the remembered output
 * instead of sending twice. Both calls fail open: a store error never blocks
 * a send, it only loses the memory of it.
 *
 * The live evaluation run adds three more uses of the same store: a per-visitor
 * day counter that is the run cap (`reserveEvalRun`, `releaseEvalRun`, taken
 * before a model is called and given back only when the run never starts), a
 * day counter for its own spend sub-budget (`reserveEvalBudget`,
 * `settleEvalBudget`, `topUpEvalBudget`, which narrows the share of the soft
 * budget evals may take and never replaces `reserveBudget`), and a per-visitor
 * per-pair record of the finished run (`rememberRun`, `recallRun`) so asking
 * for the same comparison again in a day replays it instead of spending again.
 * A pair the visitor never ran misses that record and meets the run counter.
 *
 * Server-only: reads env lazily on first use. Never import from a client
 * component.
 */

import {
  EVAL_RUNS_PER_IP_PER_DAY,
  GLOBAL_EMAILS_PER_DAY,
  GLOBAL_EVAL_USD_PER_DAY,
  GLOBAL_HANDOFFS_PER_DAY,
  GLOBAL_HARD_DAILY_USD,
  GLOBAL_SOFT_DAILY_USD,
  PER_IP_DAILY_USD,
  PER_IP_EMAILS_PER_DAY,
  PER_IP_HANDOFFS_PER_DAY,
  PER_IP_REQUESTS_PER_MINUTE,
  STORE_TIMEOUT_MS,
} from "@/lib/chat-limits";

/** "visitor": a send to a visitor-supplied address. "handoff": a send to the founder inbox. */
export type EmailKind = "visitor" | "handoff";

export type CounterEntry = { key: string; by: number };

/** Counters plus small string records, each with a TTL. */
export interface CounterStore {
  /**
   * Adds `by` to each key (negative values refund), refreshes each key's TTL,
   * and returns the new values in the same order.
   */
  incrBy(entries: readonly CounterEntry[], ttlSeconds: number): Promise<number[]>;
  /** The string stored under `key`, or null when absent or expired. */
  get(key: string): Promise<string | null>;
  /** Stores `value` under `key` for `ttlSeconds`, replacing any previous value. */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

const MINUTE_TTL_SECONDS = 120;
const DAY_TTL_SECONDS = 2 * 24 * 60 * 60;
/** How long a delivered approval-gated send is remembered per toolCallId. */
export const SENT_TTL_SECONDS = 24 * 60 * 60;
/** How long a finished evaluation run is replayed to the same visitor. */
export const RUN_TTL_SECONDS = 24 * 60 * 60;
const MICRO = 1_000_000;

/** Dollars to integer micro-dollars, rounded up so a charge is never zero. */
export function toMicroUsd(usd: number): number {
  if (!Number.isFinite(usd) || usd <= 0) return 0;
  return Math.ceil(usd * MICRO);
}

export function fromMicroUsd(micro: number): number {
  return micro / MICRO;
}

export function createMemoryStore(now: () => number = Date.now): CounterStore {
  const values = new Map<string, { value: number; expiresAt: number }>();
  const records = new Map<string, { value: string; expiresAt: number }>();
  let lastSweep = 0;
  const sweep = () => {
    const t = now();
    if (t - lastSweep < 60_000 && values.size + records.size < 5_000) return;
    lastSweep = t;
    for (const [key, entry] of values) if (entry.expiresAt <= t) values.delete(key);
    for (const [key, entry] of records) if (entry.expiresAt <= t) records.delete(key);
  };
  return {
    async incrBy(entries, ttlSeconds) {
      sweep();
      const t = now();
      return entries.map(({ key, by }) => {
        const current = values.get(key);
        const base = current && current.expiresAt > t ? current.value : 0;
        const value = base + by;
        values.set(key, { value, expiresAt: t + ttlSeconds * 1000 });
        return value;
      });
    },
    async get(key) {
      sweep();
      const current = records.get(key);
      return current && current.expiresAt > now() ? current.value : null;
    },
    async set(key, value, ttlSeconds) {
      sweep();
      records.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
    },
  };
}

type PipelineRow = { result?: unknown; error?: string };

export function createUpstashStore(
  url: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = STORE_TIMEOUT_MS,
): CounterStore {
  const endpoint = `${url.replace(/\/+$/, "")}/pipeline`;

  /** One body-form pipeline call; throws on HTTP, short, or per-row errors. */
  async function pipeline(commands: string[][]): Promise<PipelineRow[]> {
    // Covers the headers and the body read; a hung endpoint throws here.
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Upstash pipeline HTTP ${res.status}`);
    const rows = (await res.json()) as PipelineRow[];
    if (!Array.isArray(rows) || rows.length < commands.length) {
      throw new Error("Upstash pipeline returned a short response");
    }
    for (const row of rows) if (row?.error) throw new Error(`Upstash: ${row.error}`);
    return rows;
  }

  return {
    async incrBy(entries, ttlSeconds) {
      const rows = await pipeline(
        entries.flatMap(({ key, by }) => [
          ["INCRBY", key, String(by)],
          ["EXPIRE", key, String(ttlSeconds)],
        ]),
      );
      return entries.map((_, i) => {
        const n = Number(rows[i * 2].result);
        if (!Number.isFinite(n)) throw new Error("Upstash: non-numeric INCRBY result");
        return n;
      });
    },
    async get(key) {
      const [row] = await pipeline([["GET", key]]);
      return typeof row.result === "string" ? row.result : null;
    },
    async set(key, value, ttlSeconds) {
      await pipeline([["SET", key, value, "EX", String(ttlSeconds)]]);
    },
  };
}

export type BudgetReservation = {
  ipKey: string;
  globalKey: string;
  estimateMicro: number;
};

export type BudgetDecision =
  | {
      ok: true;
      reservation: BudgetReservation;
      /** Global soft budget is spent: route to the fallback model. */
      fallback: boolean;
      ipSpentUsd: number;
      globalSpentUsd: number;
    }
  | { ok: false; reason: "ip" | "global"; ipSpentUsd: number; globalSpentUsd: number };

/**
 * A reservation against the live-evaluation sub-budget. One key, not two: the
 * per-IP side of an eval run is counted in runs rather than in dollars, by
 * `reserveEvalRun` below.
 */
export type EvalReservation = { key: string; estimateMicro: number };

export type EvalBudgetDecision =
  | { ok: true; reservation: EvalReservation; spentUsd: number }
  | { ok: false; spentUsd: number };

/** One live evaluation run, counted against a visitor's day. */
export type EvalRunReservation = { key: string };

export type EvalRunDecision =
  | { ok: true; reservation: EvalRunReservation; runsToday: number }
  | { ok: false; runsToday: number };

export type RateLimiter = {
  readonly backend: "upstash" | "memory";
  checkRequestRate(ip: string): Promise<{ allowed: boolean; count: number }>;
  reserveBudget(ip: string, estimateUsd: number): Promise<BudgetDecision>;
  settleBudget(reservation: BudgetReservation, actualUsd: number): Promise<void>;
  topUpBudget(reservation: BudgetReservation, actualUsd: number): Promise<void>;
  /**
   * Raises a reservation to `actualUsd` and never lowers it, as many times as
   * it is called.
   *
   * `settleBudget` and `topUpBudget` are one-shot: each compares the actual
   * against the ORIGINAL estimate, so a second call would refund or
   * double-charge. A run whose settle already fired (a cancelled eval run, say)
   * can still have legs land afterwards, and that spend is real. This keeps
   * the running total on the reservation and adds only the difference, so the
   * counters end at the highest total ever reported. The one-shot pair writes
   * that same running total when it moves the counters, so a settle that came
   * first is the baseline here and its dollars are never charged twice.
   */
  chargeAtLeast(reservation: BudgetReservation, actualUsd: number): Promise<void>;
  /**
   * Reserves against the day's live-evaluation sub-budget, which sits INSIDE
   * the global soft budget. Refuses without spending when the day's eval share
   * is gone. This narrows what evals may cost; it never replaces
   * `reserveBudget`, which is the only global hard cap there is.
   */
  reserveEvalBudget(estimateUsd: number): Promise<EvalBudgetDecision>;
  /** Settles an eval reservation against actual spend. Refunds or tops up. */
  settleEvalBudget(reservation: EvalReservation, actualUsd: number): Promise<void>;
  /**
   * Settles an eval reservation upwards only, for a run that failed or was
   * abandoned: its prompts were consumed, so the estimate is the floor and the
   * sub-budget is never handed money back for work that happened.
   */
  topUpEvalBudget(reservation: EvalReservation, actualUsd: number): Promise<void>;
  /** `chargeAtLeast` for the eval sub-budget: repeatable, and only ever up. */
  chargeEvalAtLeast(reservation: EvalReservation, actualUsd: number): Promise<void>;
  /**
   * Takes one of this visitor's live evaluation runs for the UTC day. The
   * counter goes up FIRST and is given back on refusal, so parallel taps at the
   * edge of the allowance cannot all slip through, and a run that fails or is
   * abandoned still counts: it spent real money. `releaseEvalRun` is for the
   * paths where nothing ran at all.
   */
  reserveEvalRun(ip: string): Promise<EvalRunDecision>;
  /** Gives a reserved run back. Only ever called before a model is asked for anything. */
  releaseEvalRun(reservation: EvalRunReservation): Promise<void>;
  /**
   * Remembers a finished evaluation run for `RUN_TTL_SECONDS`, keyed by the
   * caller's bucket (an IP hash, the UTC day, and the challenger that was run).
   * A repeat of the SAME pair that day replays this instead of spending again;
   * a pair the visitor never ran has no record here, which is what keeps the
   * replay from answering a comparison nobody asked for. Never throws.
   */
  rememberRun(bucket: string, run: unknown): Promise<void>;
  /** The run remembered by `rememberRun`, or null when there is none. */
  recallRun(bucket: string): Promise<unknown>;
  /** One email of the given kind; false when the IP or the site is over its daily cap for that kind. */
  reserveEmail(ip: string, kind?: EmailKind): Promise<boolean>;
  /**
   * Remembers the output of a delivered approval-gated send for
   * `SENT_TTL_SECONDS`, keyed by tool and toolCallId. Never throws.
   */
  rememberSent(tool: string, toolCallId: string, output: unknown): Promise<void>;
  /**
   * The output remembered by `rememberSent`, or null when there is none, the
   * id is empty, or the store failed (fail open: the caller sends normally).
   */
  recallSent(tool: string, toolCallId: string): Promise<unknown>;
};

export type RateLimiterOptions = {
  now?: () => number;
  /** Key prefix, so two sites can share one database. */
  prefix?: string;
  backend?: "upstash" | "memory";
  /** Used for the call when the primary store throws. */
  fallbackStore?: CounterStore;
  limits?: Partial<{
    requestsPerMinute: number;
    perIpDailyUsd: number;
    softDailyUsd: number;
    hardDailyUsd: number;
    perIpEmailsPerDay: number;
    globalEmailsPerDay: number;
    perIpHandoffsPerDay: number;
    globalHandoffsPerDay: number;
    evalDailyUsd: number;
    evalRunsPerIpPerDay: number;
  }>;
};

function dayBucket(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function minuteBucket(now: number): number {
  return Math.floor(now / 60_000);
}

/** Keys never carry raw visitor text; IPs and tool call ids are the only variable segments. */
function safeSegment(s: string): string {
  return s.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 64) || "unknown";
}

/** Tool call ids are provider-generated and bounded at 128 chars by the request schema. */
function idSegment(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 128);
}

export function createRateLimiter(store: CounterStore, options: RateLimiterOptions = {}): RateLimiter {
  const now = options.now ?? Date.now;
  const prefix = options.prefix ?? "chat";
  const fallbackStore = options.fallbackStore ?? createMemoryStore(now);
  const limits = {
    requestsPerMinute: PER_IP_REQUESTS_PER_MINUTE,
    perIpDailyUsd: PER_IP_DAILY_USD,
    softDailyUsd: GLOBAL_SOFT_DAILY_USD,
    hardDailyUsd: GLOBAL_HARD_DAILY_USD,
    perIpEmailsPerDay: PER_IP_EMAILS_PER_DAY,
    globalEmailsPerDay: GLOBAL_EMAILS_PER_DAY,
    perIpHandoffsPerDay: PER_IP_HANDOFFS_PER_DAY,
    globalHandoffsPerDay: GLOBAL_HANDOFFS_PER_DAY,
    evalDailyUsd: GLOBAL_EVAL_USD_PER_DAY,
    evalRunsPerIpPerDay: EVAL_RUNS_PER_IP_PER_DAY,
    ...options.limits,
  };
  let lastErrorLog = 0;

  function logStoreError(what: string, err: unknown): void {
    const t = now();
    if (t - lastErrorLog > 60_000) {
      lastErrorLog = t;
      console.error(`[rate-limit] store error, ${what}:`, err);
    }
  }

  /** Runs `op` on the primary store, and on the memory fallback when it throws. */
  async function withFallback<T>(op: (s: CounterStore) => Promise<T>): Promise<T> {
    try {
      return await op(store);
    } catch (err) {
      logStoreError("using in-memory fallback for this call", err);
      return op(fallbackStore);
    }
  }

  const incr = (entries: readonly CounterEntry[], ttl: number) =>
    withFallback((s) => s.incrBy(entries, ttl));

  const sentKey = (tool: string, toolCallId: string) =>
    `${prefix}:sent:${safeSegment(tool)}:${idSegment(toolCallId)}`;

  /**
   * The caller's bucket carries the visitor, the UTC day, and the pair that was
   * run, so a replay is only ever the comparison that was actually asked for.
   * `safeSegment` bounds it at 64 characters, which those three fit inside.
   */
  const runKey = (bucket: string) => `${prefix}:run:${safeSegment(bucket)}`;

  /**
   * Micro-dollars a reservation's counters currently hold, for the repeatable
   * `chargeAtLeast` pair. Keyed on the reservation object itself, so nothing
   * outside this module has to carry the running total, and it disappears with
   * the request that made it.
   *
   * Every one-shot settle records what it wrote here, which is what keeps the
   * two families on one baseline. Without that, `chargeUpTo` measured from the
   * original estimate even after a settle had moved the counters, and the gap
   * was charged twice: on a $0.05 estimate, `topUpBudget` to $0.08 followed by
   * `chargeAtLeast` $0.12 ended at $0.15 for a run that cost $0.12. It erred
   * toward over-charging our own budget, and the promise in this file's header
   * is the highest total ever reported, not more than it.
   */
  const chargedMicro = new WeakMap<object, number>();

  /**
   * Raises `keys` so the reservation has been charged `actualUsd` in total.
   * Safe to call repeatedly and in any order: the highest total wins, and a
   * call that asks for less than has already been charged does nothing.
   */
  async function chargeUpTo(
    reservation: object,
    keys: readonly string[],
    estimateMicro: number,
    actualUsd: number,
  ): Promise<void> {
    const target = toMicroUsd(actualUsd);
    const already = chargedMicro.get(reservation) ?? estimateMicro;
    if (target <= already) return;
    // Recorded before the await, so two legs landing together cannot both read
    // the old total and charge the same dollars twice.
    chargedMicro.set(reservation, target);
    const delta = target - already;
    await incr(
      keys.map((key) => ({ key, by: delta })),
      DAY_TTL_SECONDS,
    );
  }

  /** Per-visitor live-evaluation runs for one UTC day. Same IP segment as every other per-IP key. */
  const evalRunKey = (ip: string, day: string) => `${prefix}:evals:runs:${safeSegment(ip)}:${day}`;

  return {
    backend: options.backend ?? "memory",

    async checkRequestRate(ip) {
      const key = `${prefix}:rpm:${safeSegment(ip)}:${minuteBucket(now())}`;
      const [count] = await incr([{ key, by: 1 }], MINUTE_TTL_SECONDS);
      return { allowed: count <= limits.requestsPerMinute, count };
    },

    async reserveBudget(ip, estimateUsd) {
      const day = dayBucket(now());
      const ipKey = `${prefix}:usd:ip:${safeSegment(ip)}:${day}`;
      const globalKey = `${prefix}:usd:all:${day}`;
      const estimateMicro = toMicroUsd(estimateUsd);
      const [ipTotal, globalTotal] = await incr(
        [
          { key: ipKey, by: estimateMicro },
          { key: globalKey, by: estimateMicro },
        ],
        DAY_TTL_SECONDS,
      );
      const refuse = async (reason: "ip" | "global"): Promise<BudgetDecision> => {
        await incr(
          [
            { key: ipKey, by: -estimateMicro },
            { key: globalKey, by: -estimateMicro },
          ],
          DAY_TTL_SECONDS,
        );
        return {
          ok: false,
          reason,
          ipSpentUsd: fromMicroUsd(ipTotal - estimateMicro),
          globalSpentUsd: fromMicroUsd(globalTotal - estimateMicro),
        };
      };
      if (ipTotal > toMicroUsd(limits.perIpDailyUsd)) return refuse("ip");
      if (globalTotal > toMicroUsd(limits.hardDailyUsd)) return refuse("global");
      return {
        ok: true,
        reservation: { ipKey, globalKey, estimateMicro },
        fallback: globalTotal > toMicroUsd(limits.softDailyUsd),
        ipSpentUsd: fromMicroUsd(ipTotal),
        globalSpentUsd: fromMicroUsd(globalTotal),
      };
    },

    async settleBudget(reservation, actualUsd) {
      const target = toMicroUsd(actualUsd);
      const delta = target - reservation.estimateMicro;
      if (delta === 0) return;
      chargedMicro.set(reservation, target);
      await incr(
        [
          { key: reservation.ipKey, by: delta },
          { key: reservation.globalKey, by: delta },
        ],
        DAY_TTL_SECONDS,
      );
    },

    async topUpBudget(reservation, actualUsd) {
      const target = toMicroUsd(actualUsd);
      const delta = target - reservation.estimateMicro;
      // Below the estimate nothing moves, so the estimate is still the total.
      if (delta <= 0) return;
      chargedMicro.set(reservation, target);
      await incr(
        [
          { key: reservation.ipKey, by: delta },
          { key: reservation.globalKey, by: delta },
        ],
        DAY_TTL_SECONDS,
      );
    },

    async chargeAtLeast(reservation, actualUsd) {
      await chargeUpTo(
        reservation,
        [reservation.ipKey, reservation.globalKey],
        reservation.estimateMicro,
        actualUsd,
      );
    },

    async reserveEvalBudget(estimateUsd) {
      const key = `${prefix}:usd:evals:${dayBucket(now())}`;
      const estimateMicro = toMicroUsd(estimateUsd);
      const [total] = await incr([{ key, by: estimateMicro }], DAY_TTL_SECONDS);
      if (total > toMicroUsd(limits.evalDailyUsd)) {
        await incr([{ key, by: -estimateMicro }], DAY_TTL_SECONDS);
        return { ok: false, spentUsd: fromMicroUsd(total - estimateMicro) };
      }
      return { ok: true, reservation: { key, estimateMicro }, spentUsd: fromMicroUsd(total) };
    },

    async settleEvalBudget(reservation, actualUsd) {
      const target = toMicroUsd(actualUsd);
      const delta = target - reservation.estimateMicro;
      if (delta === 0) return;
      chargedMicro.set(reservation, target);
      await incr([{ key: reservation.key, by: delta }], DAY_TTL_SECONDS);
    },

    async topUpEvalBudget(reservation, actualUsd) {
      const target = toMicroUsd(actualUsd);
      const delta = target - reservation.estimateMicro;
      // Below the estimate nothing moves, so the estimate is still the total.
      if (delta <= 0) return;
      chargedMicro.set(reservation, target);
      await incr([{ key: reservation.key, by: delta }], DAY_TTL_SECONDS);
    },

    async chargeEvalAtLeast(reservation, actualUsd) {
      await chargeUpTo(reservation, [reservation.key], reservation.estimateMicro, actualUsd);
    },

    async reserveEvalRun(ip) {
      const key = evalRunKey(ip, dayBucket(now()));
      const [count] = await incr([{ key, by: 1 }], DAY_TTL_SECONDS);
      if (count > limits.evalRunsPerIpPerDay) {
        await incr([{ key, by: -1 }], DAY_TTL_SECONDS);
        return { ok: false, runsToday: count - 1 };
      }
      return { ok: true, reservation: { key }, runsToday: count };
    },

    async releaseEvalRun(reservation) {
      await incr([{ key: reservation.key, by: -1 }], DAY_TTL_SECONDS);
    },

    async rememberRun(bucket, run) {
      if (!bucket) return;
      try {
        await withFallback((s) => s.set(runKey(bucket), JSON.stringify(run), RUN_TTL_SECONDS));
      } catch (err) {
        logStoreError("a finished eval run was not remembered", err);
      }
    },

    async recallRun(bucket) {
      if (!bucket) return null;
      try {
        const raw = await withFallback((s) => s.get(runKey(bucket)));
        return raw === null ? null : (JSON.parse(raw) as unknown);
      } catch (err) {
        logStoreError("treating the eval run as not yet made", err);
        return null;
      }
    },

    async reserveEmail(ip, kind = "visitor") {
      const day = dayBucket(now());
      const ipKey = `${prefix}:mail:${kind}:ip:${safeSegment(ip)}:${day}`;
      const allKey = `${prefix}:mail:${kind}:all:${day}`;
      const perIpCap = kind === "handoff" ? limits.perIpHandoffsPerDay : limits.perIpEmailsPerDay;
      const globalCap = kind === "handoff" ? limits.globalHandoffsPerDay : limits.globalEmailsPerDay;
      const [ipCount, allCount] = await incr(
        [
          { key: ipKey, by: 1 },
          { key: allKey, by: 1 },
        ],
        DAY_TTL_SECONDS,
      );
      if (ipCount > perIpCap || allCount > globalCap) {
        await incr(
          [
            { key: ipKey, by: -1 },
            { key: allKey, by: -1 },
          ],
          DAY_TTL_SECONDS,
        );
        return false;
      }
      return true;
    },

    async rememberSent(tool, toolCallId, output) {
      if (!toolCallId) return;
      try {
        await withFallback((s) => s.set(sentKey(tool, toolCallId), JSON.stringify(output), SENT_TTL_SECONDS));
      } catch (err) {
        logStoreError("a delivered send was not remembered", err);
      }
    },

    async recallSent(tool, toolCallId) {
      if (!toolCallId) return null;
      try {
        const raw = await withFallback((s) => s.get(sentKey(tool, toolCallId)));
        return raw === null ? null : (JSON.parse(raw) as unknown);
      } catch (err) {
        logStoreError("treating the send as not yet delivered", err);
        return null;
      }
    },
  };
}

let shared: RateLimiter | null = null;

/**
 * Process-wide limiter. Env is read here, on first call, never at import, so
 * the module stays importable in tests and the in-memory fallback is the
 * accepted behaviour when no Redis is configured (per warm instance only).
 */
export function getRateLimiter(): RateLimiter {
  if (shared) return shared;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    shared = createRateLimiter(createUpstashStore(url, token), { backend: "upstash" });
    console.info("[rate-limit] Upstash REST counters enabled");
  } else {
    shared = createRateLimiter(createMemoryStore(), { backend: "memory" });
    console.info("[rate-limit] no Upstash env; per-instance in-memory counters");
  }
  return shared;
}
