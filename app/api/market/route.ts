import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SYMBOLS = [
  {
    symbol: "NVDA",
    displayLabel: "NVIDIA",
    tagline: "AI & accelerated computing",
  },
  {
    symbol: "SOXX",
    displayLabel: "iShares Semiconductor ETF",
    tagline: "Global chip demand",
  },
  {
    symbol: "QQQ",
    displayLabel: "Invesco QQQ Trust",
    tagline: "Nasdaq-100 tech leaders",
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
  try {
    const quotes = await Promise.all(
      SYMBOLS.map(async (cfg) => {
        const q = await fetchYahooQuote(cfg.symbol);
        return {
          ...q,
          displayLabel: cfg.displayLabel,
          tagline: cfg.tagline,
        };
      }),
    );
    return NextResponse.json({
      ok: true as const,
      updatedAt: Date.now(),
      quotes,
    });
  } catch (err) {
    console.error("[api/market]", err);
    return NextResponse.json(
      { ok: false as const, error: "Market data temporarily unavailable." },
      { status: 503 },
    );
  }
}
