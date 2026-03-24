import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEMO_MODEL = process.env.DEMO_AI_MODEL ?? "gpt-4o-mini";

const sentimentSchema = z.object({
  label: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1),
  brief: z.string().max(280),
});

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
  if (!text || text.length < 3) {
    return NextResponse.json({ error: "Please enter a sentence to analyze." }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Text is too long (max 2000 characters)." }, { status: 400 });
  }

  const openai = createOpenAI({ apiKey });

  try {
    const { object } = await generateObject({
      model: openai(DEMO_MODEL),
      schema: sentimentSchema,
      prompt: `Classify the sentiment of this short text for a business audience. Be calibrated: marketing copy may be positive without being over-the-top.

Text: """${text.replace(/"/g, "'")}"""`,
    });

    return NextResponse.json(object);
  } catch (e) {
    console.error("[demo/sentiment]", e);
    return NextResponse.json({ error: "Could not analyze sentiment. Try again." }, { status: 502 });
  }
}
