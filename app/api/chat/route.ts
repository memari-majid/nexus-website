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

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rlHits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  rlHits.set(ip, recent);
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
 * The assisted smart form. No `execute`: this is a client-side interaction
 * tool. The UI renders a booking card pre-filled with whatever Nex passes, the
 * visitor completes it, and the card files the request itself (via
 * /api/workshop-request). Nex just confirms afterward.
 */
const collectRegistration = tool({
  description:
    "Open the in-chat booking form, pre-filled with whatever you already know. Call this only after consulting, when the visitor wants to move forward. The form files the request itself and reports back, so after it is filed just confirm warmly. Do not also call requestAppointment for the same request.",
  inputSchema: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    organization: z.string().optional(),
    headcount: z.number().int().min(1).max(60).optional(),
    timing: z.string().optional(),
    delivery: z.enum(["in-person", "remote"]).optional(),
    workshop: z.string().optional().describe("The recommended workshop, if any"),
    role: z.string().optional(),
    need: z.string().optional(),
  }),
});

/**
 * Fallback filing for when the visitor gives everything in chat and will not
 * use the form card. Routes to the workshop inbox (Dr. Memari) like the card.
 */
const requestAppointment = tool({
  description:
    "Fallback: file a consulting or training request when the visitor gave the details in chat and will not use the form card. Never promise a specific time or a phone call.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Visitor's name"),
    email: z.string().email().describe("Visitor's email address"),
    topic: z.string().min(1).describe("What they need, in one line"),
    workshop: z.string().optional().describe("Which workshop, if named"),
    need: z.string().optional().describe("What they want to build or improve"),
    role: z.string().optional().describe("Their role or team"),
    when: z.string().optional().describe("Requested timeframe. ~6 weeks lead time."),
    delivery: z.enum(["in-person", "remote"]).optional(),
    headcount: z.number().int().min(1).max(60).optional().describe("Team size"),
    phone: z.string().optional().describe("Phone if offered"),
    organization: z.string().optional().describe("Company if mentioned"),
  }),
  execute: async ({ name, email, topic, workshop, need, role, when, delivery, headcount, phone, organization }) => {
    const lines = [
      `Request: ${topic}`,
      workshop ? `Workshop: ${workshop}` : null,
      need ? `Need: ${need}` : null,
      role ? `Role: ${role}` : null,
      organization ? `Organization: ${organization}` : null,
      when ? `When: ${when}` : null,
      delivery ? `Delivery: ${delivery}` : null,
      headcount ? `Team size: ${headcount}` : null,
    ].filter(Boolean);

    const result = await submitInquiry({
      name,
      email,
      phone,
      message: `[Chat request]\n${lines.join("\n")}`,
      source: "chat-workshop",
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return {
      ok: true as const,
      note: "Filed. Confirm in one short sentence that it's sent and Dr. Memari will follow up by email. Do not invent a time or promise a call.",
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
    return new Response(
      JSON.stringify({
        error: "You're sending messages pretty fast. Give it a few seconds and try again.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json();
  const uiMessages = body.messages as UIMessage[];
  const modelMessages = await convertToModelMessages(uiMessages);
  const modelId = process.env.AI_CHAT_MODEL ?? "anthropic/claude-haiku-4-5";

  try {
    const result = streamText({
      model: gateway(modelId),
      system: nexusChatSystem(),
      messages: modelMessages,
      tools: { recommendWorkshop, collectRegistration, requestAppointment, emailWorkshopInfo },
      // Room for: recommend -> talk -> open form -> (form result) -> confirm.
      stopWhen: stepCountIs(6),
      maxOutputTokens: 900,
      providerOptions: {
        gateway: {
          tags: ["site:nexus", "feature:chat", `env:${process.env.VERCEL_ENV ?? "dev"}`],
        },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat request failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
