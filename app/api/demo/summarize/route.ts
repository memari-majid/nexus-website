import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEMO_MODEL = process.env.DEMO_AI_MODEL ?? "gpt-4o-mini";

const executiveBriefSchema = z.object({
  headline: z.string().max(280),
  situation: z.string().max(900),
  whatMatters: z.array(z.string()).min(2).max(4),
  recommendation: z.string().max(520),
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
  if (!text || text.length < 10) {
    return NextResponse.json({ error: "Please enter at least 10 characters." }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Text is too long (max 8000 characters)." }, { status: 400 });
  }

  const openai = createOpenAI({ apiKey });

  try {
    const { object } = await generateObject({
      model: openai(DEMO_MODEL),
      schema: executiveBriefSchema,
      system: `You are a senior strategy partner preparing a pre-read for executives. Your job is to turn messy notes, email threads, or pasted context into a structured brief that feels authored by a sharp operator—not a generic chatbot.

Rules:
- Be concrete: name stakeholders, constraints, and decisions implied by the text.
- Headline: one punchy line that captures the decision or tension (not a title case slogan).
- Situation: 2–4 sentences max—context, stakes, and what is unresolved.
- whatMatters: 2–4 distinct bullets; each bullet one idea; no numbering in the strings.
- recommendation: one clear next move or framing (even if the input is ambiguous—say what you would do first).
- Never start with "This text" or "The author"; write as if briefing a busy principal.`,
      prompt: text,
    });

    return NextResponse.json(object);
  } catch (e) {
    console.error("[demo/summarize]", e);
    return NextResponse.json({ error: "Could not generate brief. Try again." }, { status: 502 });
  }
}
