import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Publicly traded names often cited for AI growth—infrastructure, platforms, data, and security.
 * (Many “pure” AI labs are private; this list is illustrative, not a recommendation.)
 */
const SYMBOLS = [
  {
    symbol: "NVDA",
    displayLabel: "NVIDIA",
    tagline: "AI GPUs & accelerated computing",
  },
  {
    symbol: "PLTR",
    displayLabel: "Palantir",
    tagline: "AI platforms & decision intelligence",
  },
  {
    symbol: "ARM",
    displayLabel: "Arm Holdings",
    tagline: "Chip IP for AI & edge devices",
  },
  {
    symbol: "SMCI",
    displayLabel: "Super Micro",
    tagline: "AI rack servers & liquid cooling",
  },
  {
    symbol: "NET",
    displayLabel: "Cloudflare",
    tagline: "Edge AI & global cloud network",
  },
  {
    symbol: "CRWD",
    displayLabel: "CrowdStrike",
    tagline: "AI-native cybersecurity",
  },
] as const;

type YahooMeta = {
  symbol: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketTime?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

async function fetchYahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NexusAISite/1.0; +https://nexusaisolution.net)",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Yahoo chart HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  const chart = json as { chart?: { result?: Array<{ meta?: YahooMeta }> } };
  const meta = chart?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) {
    throw new Error("Missing quote data");
  }
  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  return {
    symbol: meta.symbol,
    name: meta.shortName ?? meta.longName ?? symbol,
    price,
    currency: meta.currency ?? "USD",
    change,
    changePercent,
    marketTime: meta.regularMarketTime,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
  };
}

export async function GET() {
  const results = await Promise.all(
    SYMBOLS.map(async (cfg) => {
      try {
        const q = await fetchYahooQuote(cfg.symbol);
        return { ...q, displayLabel: cfg.displayLabel, tagline: cfg.tagline };
      } catch (err) {
        console.warn("[api/market] quote failed", cfg.symbol, err);
        return null;
      }
    }),
  );
  const quotes = results.filter((q): q is NonNullable<typeof q> => q != null);
  if (quotes.length === 0) {
    return NextResponse.json(
      { ok: false as const, error: "Market data temporarily unavailable." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true as const,
    updatedAt: Date.now(),
    quotes,
  });
}
