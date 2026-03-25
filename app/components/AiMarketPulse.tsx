"use client";

import { useCallback, useEffect, useState } from "react";

type Quote = {
  symbol: string;
  name: string;
  displayLabel: string;
  tagline: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  marketTime?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

type ApiOk = { ok: true; updatedAt: number; quotes: Quote[] };
type ApiErr = { ok: false; error: string };

const POLL_MS = 60_000;

function formatPrice(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "USD" ? "USD" : currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

type AiMarketPulseProps = {
  /** Nested inside another section (no full-bleed band, smaller heading). */
  variant?: "section" | "embedded";
};

export function AiMarketPulse({ variant = "section" }: AiMarketPulseProps) {
  const [data, setData] = useState<ApiOk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/market", { cache: "no-store" });
      const json = (await res.json()) as ApiOk | ApiErr;
      if (!json.ok) {
        setError(json.error);
        setData(null);
        return;
      }
      setError(null);
      setData(json);
    } catch {
      setError("Could not load market data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const Wrapper = variant === "embedded" ? "div" : "section";
  const headingId = variant === "embedded" ? "work-market-heading" : "ai-market-heading";

  return (
    <Wrapper
      {...(variant === "section"
        ? {
            id: "ai-market",
            className:
              "border-b border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-4 py-10 dark:border-zinc-800/40 dark:from-zinc-950 dark:to-zinc-950 sm:px-6",
          }
        : {
            id: "work-market",
            className: "mt-20 border-t border-zinc-200/80 pt-16 dark:border-zinc-800/40",
          })}
      aria-labelledby={headingId}
    >
      <div className="mx-auto max-w-6xl">
        <div className={variant === "embedded" ? "mb-8 text-left sm:text-center" : "mb-6 text-center"}>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
            Live pulse
          </p>
          {variant === "embedded" ? (
            <h3
              id={headingId}
              className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl"
            >
              Promising AI companies
            </h3>
          ) : (
            <h2
              id={headingId}
              className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl"
            >
              Promising AI companies
            </h2>
          )}
          <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-500">
            Liquid, AI-focused public equities—infrastructure, platforms, and security. Not a
            recommendation; many AI leaders are still private. Refreshed about every minute. Not
            investment advice.
          </p>
        </div>

        {loading && !data && (
          <div className="flex justify-center py-8">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"
              role="status"
              aria-label="Loading market data"
            />
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {error}{" "}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void load().finally(() => setLoading(false));
              }}
              className="font-semibold underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-100"
            >
              Retry
            </button>
          </p>
        )}

        {data?.quotes && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.quotes.map((q) => {
              const up = q.change >= 0;
              return (
                <li key={q.symbol}>
                  <div className="card h-full p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      {q.symbol}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {q.displayLabel}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{q.tagline}</p>
                    <p className="mt-4 font-mono text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatPrice(q.price, q.currency)}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold tabular-nums ${
                        up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {up ? "▲" : "▼"} {formatPct(q.changePercent)} today
                    </p>
                    {q.fiftyTwoWeekHigh != null && q.fiftyTwoWeekLow != null && (
                      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500">
                        52-week range: {formatPrice(q.fiftyTwoWeekLow, q.currency)} –{" "}
                        {formatPrice(q.fiftyTwoWeekHigh, q.currency)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {data && (
          <p className="mt-6 break-words px-1 text-center text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-600">
            Informative only—not investment advice. Data via public market feeds; timing
            and delays can vary by exchange. Last fetch:{" "}
            <time dateTime={new Date(data.updatedAt).toISOString()}>
              {new Date(data.updatedAt).toLocaleString()}
            </time>
            .
          </p>
        )}
      </div>
    </Wrapper>
  );
}
