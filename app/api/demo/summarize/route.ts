import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEMO_MODEL = process.env.DEMO_AI_MODEL ?? "gpt-4o-mini";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "AI demo is not configured (missing OPENAI_API_KEY)." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const text = typeof (body as { text?: string }).text === "string" ? (body as { text: string }).text.trim() : "";
  if (!text || text.length < 10) {
    return NextResponse.json({ error: "Please enter at least 10 characters to summarize." }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Text is too long (max 8000 characters)." }, { status: 400 });
  }

  const openai = createOpenAI({ apiKey });

  try {
    const { text: summary } = await generateText({
      model: openai(DEMO_MODEL),
      system:
        "You are a concise business analyst. Summarize for executives in 2–3 short sentences. No preamble.",
      prompt: text,
    });

    return NextResponse.json({ summary: summary.trim() });
  } catch (e) {
    console.error("[demo/summarize]", e);
    return NextResponse.json({ error: "Could not generate summary. Try again." }, { status: 502 });
  }
}
