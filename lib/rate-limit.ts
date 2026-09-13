/**
 * Request rate, daily spend, and email counters for the chat route.
 *
 * Reservation instead of read-before-write: `reserveBudget` increments both
 * day counters first and refunds on refusal, so twenty parallel requests from
 * one IP cannot all slip past the edge of the cap, and the global hard cap
 * cannot be overshot by more than one request's estimate. `settleBudget`
 * (onFinish) refunds or tops up against actual usage; `topUpBudget` (onAbort)
 * only ever adds.
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
 * Server-only: reads env lazily on first use. Never import from a client
 * component.
 */

import {
  GLOBAL_EMAILS_PER_DAY,
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

export interface CounterStore {
  /**
   * Adds `by` to each key (negative values refund), refreshes each key's TTL,
   * and returns the new values in the same order.
   */
  incrBy(entries: readonly CounterEntry[], ttlSeconds: number): Promise<number[]>;
}

const MINUTE_TTL_SECONDS = 120;
const DAY_TTL_SECONDS = 2 * 24 * 60 * 60;
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
  let lastSweep = 0;
  const sweep = () => {
    const t = now();
    if (t - lastSweep < 60_000 && values.size < 5_000) return;
    lastSweep = t;
    for (const [key, entry] of values) if (entry.expiresAt <= t) values.delete(key);
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
  return {
    async incrBy(entries, ttlSeconds) {
      const commands = entries.flatMap(({ key, by }) => [
        ["INCRBY", key, String(by)],
        ["EXPIRE", key, String(ttlSeconds)],
      ]);
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
      return entries.map((_, i) => {
        const row = rows[i * 2];
        if (row.error) throw new Error(`Upstash: ${row.error}`);
        const n = Number(row.result);
        if (!Number.isFinite(n)) throw new Error("Upstash: non-numeric INCRBY result");
        return n;
      });
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

export type RateLimiter = {
  readonly backend: "upstash" | "memory";
  checkRequestRate(ip: string): Promise<{ allowed: boolean; count: number }>;
  reserveBudget(ip: string, estimateUsd: number): Promise<BudgetDecision>;
  settleBudget(reservation: BudgetReservation, actualUsd: number): Promise<void>;
  topUpBudget(reservation: BudgetReservation, actualUsd: number): Promise<void>;
  /** One email of the given kind; false when the IP or the site is over its daily cap for that kind. */
  reserveEmail(ip: string, kind?: EmailKind): Promise<boolean>;
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
  }>;
};

function dayBucket(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function minuteBucket(now: number): number {
  return Math.floor(now / 60_000);
}

/** Keys never carry raw visitor text; IPs are the only variable segment. */
function safeSegment(s: string): string {
  return s.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 64) || "unknown";
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
    ...options.limits,
  };
  let lastErrorLog = 0;

  async function incr(entries: readonly CounterEntry[], ttl: number): Promise<number[]> {
    try {
      return await store.incrBy(entries, ttl);
    } catch (err) {
      const t = now();
      if (t - lastErrorLog > 60_000) {
        lastErrorLog = t;
        console.error("[rate-limit] store error, using in-memory fallback for this call:", err);
      }
      return fallbackStore.incrBy(entries, ttl);
    }
  }

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
      const delta = toMicroUsd(actualUsd) - reservation.estimateMicro;
      if (delta === 0) return;
      await incr(
        [
          { key: reservation.ipKey, by: delta },
          { key: reservation.globalKey, by: delta },
        ],
        DAY_TTL_SECONDS,
      );
    },

    async topUpBudget(reservation, actualUsd) {
      const delta = toMicroUsd(actualUsd) - reservation.estimateMicro;
      if (delta <= 0) return;
      await incr(
        [
          { key: reservation.ipKey, by: delta },
          { key: reservation.globalKey, by: delta },
        ],
        DAY_TTL_SECONDS,
      );
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
