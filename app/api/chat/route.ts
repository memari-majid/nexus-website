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
 * Booking is a real action, not a promise: Nex collects the details and files
 * them through the same inquiry pipeline as the contact form, so the request
 * lands in the inbox. There is no live calendar, so never imply a confirmed
 * slot. Workshop requests (any scheduling field present) route to the founder's
 * inbox via the `chat-workshop` source.
 */
const requestAppointment = tool({
  description:
    "File a workshop or consultation request. Call this as soon as you have the visitor's name, email, and what they need. For a workshop, also capture audience, timing, delivery, and headcount when given. This files a request for email follow-up; never promise a specific time or a phone call.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Visitor's name"),
    email: z.string().email().describe("Visitor's email address"),
    topic: z
      .string()
      .min(1)
      .describe("What they need, in one line, e.g. 'NVIDIA DLI workshop for 30 engineers'"),
    audience: z
      .enum(["industry", "academia"])
      .optional()
      .describe("Industry team or academic institution. Omit if unclear."),
    workshop: z.string().optional().describe("Which workshop, if named. Defaults to the live one."),
    when: z
      .string()
      .optional()
      .describe("Requested date or timeframe, free text. Needs about six weeks of lead time."),
    delivery: z
      .enum(["in-person", "remote"])
      .optional()
      .describe("In person or remote. Omit if not given."),
    headcount: z
      .number()
      .int()
      .min(1)
      .max(40)
      .optional()
      .describe("Number of participants, 1 to 40 per cohort."),
    phone: z.string().optional().describe("Phone number if offered. Omit if not given."),
    organization: z.string().optional().describe("Company or institution if mentioned."),
  }),
  execute: async ({
    name,
    email,
    topic,
    audience,
    workshop,
    when,
    delivery,
    headcount,
    phone,
    organization,
  }) => {
    const lines = [
      `Request: ${topic}`,
      workshop ? `Workshop: ${workshop}` : null,
      audience ? `Audience: ${audience}` : null,
      when ? `When: ${when}` : null,
      delivery ? `Delivery: ${delivery}` : null,
      headcount ? `Headcount: ${headcount}` : null,
      organization ? `Organization: ${organization}` : null,
    ].filter(Boolean);

    const isWorkshop = Boolean(audience || workshop || when || delivery || headcount);

    const result = await submitInquiry({
      name,
      email,
      phone,
      message: `[Chat ${isWorkshop ? "workshop" : "request"}] ${lines.join("\n")}`,
      source: isWorkshop ? "chat-workshop" : "chat-appointment",
    });

    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return {
      ok: true as const,
      note: "Request filed. Confirm in one short sentence that it is sent and we will follow up by email. Do not invent a meeting time or promise a call.",
    };
  },
});

/**
 * Emails the visitor the NVIDIA workshop one-pager and drops a heads-up to the
 * team so the warm lead is captured. Separate from the inquiry pipeline so the
 * visitor does not also get a booking confirmation for the same action.
 */
const emailWorkshopInfo = tool({
  description:
    "Email the visitor the official NVIDIA DLI workshop details. Call this when they ask to be sent information, once you have their name and email. Do not promise attachments beyond the email itself.",
  inputSchema: z.object({
    name: z.string().min(1).describe("Visitor's name"),
    email: z.string().email().describe("Visitor's email address"),
    audience: z
      .enum(["industry", "academia"])
      .optional()
      .describe("Tailors the email; academia highlights the free offer."),
  }),
  execute: async ({ name, email, audience }) => {
    const { subject, text, html } = workshopInfoEmail({ name, audience });
    const sent = await sendEmail({ to: email, subject, text, html, replyTo: SITE.email });
    if (!sent.ok) {
      return { ok: false as const, error: sent.error };
    }
    // Best-effort team heads-up; do not fail the visitor send on this.
    await sendEmail({
      to: process.env.WORKSHOP_TO_EMAIL ?? "memari.majid@hotmail.com",
      subject: `[Nexus] ${name} requested workshop info`,
      replyTo: email,
      text: `${name} <${email}> asked Nex to email the NVIDIA workshop details${
        audience ? ` (audience: ${audience})` : ""
      }.`,
    });
    return {
      ok: true as const,
      note: "Sent. Tell them it is on the way to their inbox and offer to get it scheduled.",
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
      tools: { requestAppointment, emailWorkshopInfo },
      // tool call -> result -> spoken confirmation, with room for a second tool.
      stopWhen: stepCountIs(5),
      // Nex answers briefly; this also caps cost per message on the public endpoint.
      maxOutputTokens: 800,
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
