import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEMO_MODEL = process.env.DEMO_AI_MODEL ?? "gpt-4o-mini";

const signalSchema = z.object({
  intent: z.string().max(220),
  register: z.enum(["collaborative", "neutral", "tense", "enthusiastic", "guarded"]),
  subtext: z.string().max(320),
  suggestedOpening: z.string().max(300),
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
      schema: signalSchema,
      system: `You read short messages the way a seasoned stakeholder would: intent, emotional register, and what is left unsaid.

Rules:
- intent: what they are actually trying to accomplish in one crisp phrase (not "they want to communicate").
- register: pick the single best fit for tone/stance.
- subtext: one or two sentences on implications, risk, or unspoken pressure—no moralizing.
- suggestedOpening: one reply opener (not a full email) that matches their register and advances the conversation—specific and human, not corporate filler.
- Marketing or upbeat copy can be "enthusiastic" without being naive; calibrate honestly.`,
      prompt: `Message:\n"""${text.replace(/"/g, "'")}"""`,
    });

    return NextResponse.json(object);
  } catch (e) {
    console.error("[demo/sentiment]", e);
    return NextResponse.json({ error: "Could not analyze signal. Try again." }, { status: 502 });
  }
}
