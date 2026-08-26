import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type AiHeadline = {
  title: string;
  url: string;
  source: string;
};

const FEEDS = [
  { source: "arXiv cs.AI", url: "https://rss.arxiv.org/rss/cs.AI" },
  { source: "Hugging Face", url: "https://huggingface.co/blog/feed.xml" },
] as const;

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function headlinesFromFeed(xml: string, source: string): AiHeadline[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  const items: AiHeadline[] = [];
  for (const block of blocks) {
    const title = decodeXml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? "");
    const href = (block.match(/<link[^>]*href=["']([^"']+)["']/i) ?? [])[1];
    const textLink = decodeXml((block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ?? [])[1] ?? "");
    const url = href || textLink;
    if (!title || !url || !/^https?:\/\//i.test(url)) continue;
    items.push({ title, url, source });
  }
  return items;
}

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<AiHeadline[]> {
  const res = await fetch(feed.url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NexusAISite/1.0; +https://nexusaisolution.net)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
  });
  if (!res.ok) return [];
  const xml = await res.text();
  return headlinesFromFeed(xml, feed.source).slice(0, 4);
}

export async function GET() {
  const groups = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        return await fetchFeed(feed);
      } catch (err) {
        console.warn("[api/news] feed failed", feed.source, err);
        return [];
      }
    }),
  );
  const seen = new Set<string>();
  const headlines: AiHeadline[] = [];
  for (const item of groups.flat()) {
    const key = item.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    headlines.push(item);
    if (headlines.length >= 6) break;
  }
  if (headlines.length === 0) {
    return NextResponse.json(
      { ok: false as const, error: "AI headlines temporarily unavailable." },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true as const,
    updatedAt: Date.now(),
    headlines,
  });
}
