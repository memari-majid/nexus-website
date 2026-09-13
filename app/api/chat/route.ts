import {
  convertToModelMessages,
  gateway,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { nexusChatSystem } from "@/lib/assistant";
import { submitInquiry } from "@/lib/inquiry";
import { sendEmail } from "@/lib/email";
import { workshopInfoEmail } from "@/lib/workshop-email";
import { recommendWorkshop as pickWorkshop } from "@/lib/recommend";
import { DLI } from "@/lib/dli";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Best-effort per-IP rate limit. The map lives in module scope, so it only
 * guards a single warm instance; serverless spreads traffic across instances
 * and cold starts reset it. It's a cheap backstop against one client hammering
 * the (paid) model, not a real quota. For production-grade limiting use the
 * Vercel WAF or an Upstash-backed limiter.
 */
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
const rlHits = new Map<string, number[]>();

/**
 * Model and budget controls. Production runs Claude Opus 5 via `AI_CHAT_MODEL`
 * (see AI-WEBSITES-HANDOFF.md); the code default matches so a missing env var
 * never silently downgrades the experience. MAX_OUTPUT_TOKENS also bounds the
 * reasoning that precedes a reply on thinking models, so it leaves room for both.
 */
const CHAT_MODEL = process.env.AI_CHAT_MODEL || "anthropic/claude-opus-5";
const MAX_MESSAGES = 40;
const MAX_CHARS_PER_TEXT_PART = 4_000;
const MAX_CHARS_TOTAL = 12_000;
const MAX_OUTPUT_TOKENS = 2_500;

/**
 * Only user and assistant turns are accepted, so a client cannot inject system
 * messages. Tool parts (the in-chat booking card) pass through untouched.
 */
const partSchema = z.looseObject({
  type: z.string().max(64),
  text: z.string().max(MAX_CHARS_PER_TEXT_PART).optional(),
});
const messageSchema = z.looseObject({
  id: z.string().max(128).optional(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(partSchema).max(50),
});
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rlHits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  rlHits.set(ip, recent);
  if (rlHits.size > 5_000) {
    for (const [key, hits] of rlHits) {
      if (hits.every((t) => now - t >= RL_WINDOW_MS)) rlHits.delete(key);
    }
  }
  return recent.length > RL_MAX;
}

/**
 * Grounds a recommendation in the real NVIDIA catalog so Nex never invents a
 * title. Returns the pick, why it fits, whether Nexus teaches it in-house, and
 * alternatives.
 */
const recommendWorkshop = tool({
  description:
    "Recommend the best-fit NVIDIA DLI training from the real catalog for what the visitor does and needs. Call this after you understand their need, before naming specific training. Returns a grounded pick, why it fits, whether Nexus teaches it in-house, and alternatives.",
  inputSchema: z.object({
    role: z.string().optional().describe("Their role or team, e.g. 'ML engineers'"),
    need: z.string().optional().describe("What they want to build or improve with AI"),
    level: z.string().optional().describe("Experience level, if known"),
    text: z.string().optional().describe("Any extra context in their own words"),
  }),
  execute: async (input) => {
    const rec = pickWorkshop(input, DLI.catalog);
    return {
      title: rec.workshop.title,
      url: rec.workshop.url,
      blurb: rec.workshop.blurb,
      hostedByNexus: rec.hosted,
      why: rec.why,
      alternatives: rec.alternatives.slice(0, 3).map((w) => w.title),
    };
  },
});

/**
 * Consultation hand-off. After consulting, capture just enough for Majid to
 * follow up — name, email, and what they need. No scheduling, no booking form.
 * Routes to the founder's inbox (Dr. Memari).
 */
const requestAppointment = tool({
  description:
    "Capture the visitor's details so Majid can follow up for a consultation. Call this only after consulting, when the visitor wants to move forward. This is not a booking and does not schedule a workshop.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Visitor's name"),
    email: z.string().email().describe("Visitor's email address"),
    topic: z.string().min(1).describe("What they want to talk about or need, in one line"),
    role: z.string().optional().describe("Their role or team"),
    organization: z.string().optional().describe("Company if mentioned"),
  }),
  execute: async ({ name, email, topic, role, organization }) => {
    const lines = [
      `Wants a consultation about: ${topic}`,
      role ? `Role: ${role}` : null,
      organization ? `Organization: ${organization}` : null,
    ].filter(Boolean);

    const result = await submitInquiry({
      name,
      email,
      message: `[Chat consultation request]\n${lines.join("\n")}`,
      source: "chat-workshop",
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return {
      ok: true as const,
      note: "Sent. Confirm in one short sentence that it's filed and Majid will follow up by email. Do not promise a time or a call.",
    };
  },
});

/**
 * Emails the visitor the NVIDIA workshop one-pager and drops a heads-up to the
 * team so the warm lead is captured.
 */
const emailWorkshopInfo = tool({
  description:
    "Email the visitor the official NVIDIA DLI workshop details. Call this when they ask to be sent information, once you have their name and email.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Visitor's name"),
    email: z.string().email().describe("Visitor's email address"),
  }),
  execute: async ({ name, email }) => {
    const { subject, text, html } = workshopInfoEmail({ name });
    const sent = await sendEmail({ to: email, subject, text, html, replyTo: SITE.email });
    if (!sent.ok) {
      return { ok: false as const, error: sent.error };
    }
    await sendEmail({
      to: process.env.WORKSHOP_TO_EMAIL ?? "memari.majid@hotmail.com",
      subject: `[Nexus] ${name} requested workshop info`,
      replyTo: email,
      text: `${name} <${email}> asked Nex to email the NVIDIA workshop details.`,
    });
    return {
      ok: true as const,
      note: "Sent. Tell them it's on the way to their inbox and offer to scope it with them.",
    };
  },
});

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
    return json(429, {
      error: "You're sending messages pretty fast. Give it a few seconds and try again.",
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json(400, { error: "Invalid request body." });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json(400, { error: "Invalid request body." });

  const totalChars = parsed.data.messages.reduce(
    (sum, m) =>
      sum + m.parts.reduce((s, p) => s + (p.type === "text" && p.text ? p.text.length : 0), 0),
    0,
  );
  if (totalChars > MAX_CHARS_TOTAL) {
    return json(413, { error: "This conversation is getting long. Please start a new chat." });
  }

  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(parsed.data.messages as unknown as UIMessage[]);
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  const turns = parsed.data.messages.length;
  const result = streamText({
    model: gateway(CHAT_MODEL),
    system: nexusChatSystem(),
    messages: modelMessages,
    tools: { recommendWorkshop, requestAppointment, emailWorkshopInfo },
    // Room for: recommend -> talk -> capture -> confirm.
    stopWhen: stepCountIs(5),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    providerOptions: {
      gateway: {
        tags: ["site:nexus", "feature:chat", `env:${process.env.VERCEL_ENV ?? "dev"}`],
      },
    },
    // One structured line per request so usage can be graphed from Vercel logs.
    onFinish: ({ totalUsage, finishReason, steps }) => {
      console.log(
        JSON.stringify({
          event: "chat.usage",
          site: "nexus",
          model: CHAT_MODEL,
          turns,
          inputTokens: totalUsage.inputTokens,
          cachedInputTokens: totalUsage.cachedInputTokens,
          outputTokens: totalUsage.outputTokens,
          reasoningTokens: totalUsage.reasoningTokens,
          totalTokens: totalUsage.totalTokens,
          steps: steps.length,
          toolCalls: steps.reduce((n, s) => n + s.toolCalls.length, 0),
          finishReason,
        }),
      );
    },
  });

  return result.toUIMessageStreamResponse({
    // Never stream provider error text to visitors; log it and show a plain fallback.
    onError: (error) => {
      console.error("[chat] stream error:", error);
      return "Dr. MJ is unavailable right now. Please use the contact form instead.";
    },
  });
}
