/**
 * The contact form's intake classification: one small model call that sorts a
 * message into a category and writes the acknowledgment the visitor reads.
 *
 * It reports the tokens it used, because the caller (`lib/inquiry.ts`) reserves
 * budget before it runs and settles against real usage afterwards. Every model
 * call on this site passes through the same daily cap, and a call whose usage
 * nobody reads would have to be settled by guesswork.
 *
 * Bounded on both ends: `maxOutputTokens` so the precharge is a real ceiling
 * rather than a hope, and a timeout so a hung provider cannot hold the
 * visitor's form open with money reserved.
 *
 * Server-only. Never import from a client component.
 */

import { gateway, generateObject } from "ai";
import { z } from "zod";
import {
  CONTACT_CLASSIFY_OUTPUT_TOKENS,
  CONTACT_CLASSIFY_TIMEOUT_MS,
} from "@/lib/chat-limits";
import { tokenBreakdown } from "@/lib/chat-metadata";

const inquirySchema = z.object({
  category: z.enum(["consulting", "workshop", "careers", "partnership", "general"]),
  autoReply: z.string().max(550),
});

export type InquiryCategory = z.infer<typeof inquirySchema>["category"];

/** The classification, plus what it cost in tokens so the caller can settle it. */
export type InquiryClassification = z.infer<typeof inquirySchema> & {
  inputTokens: number;
  outputTokens: number;
};

/**
 * Built in one place so the caller can size its budget reservation against the
 * same characters the model will actually read.
 */
function inquiryPrompt(input: { name: string; message: string }): string {
  return `You are the intake assistant for Nexus AI Solutions LLC, based in Sandy, Utah and working with companies across the United States. In-person delivery happens at the client site anywhere in the US, and consulting and training also run online, anywhere in the US. Utah is the home base, not the service area: never tell a visitor they are outside it, and never treat an out-of-state company as a poor fit. Primary client work is AI consulting and team training (advisory engagements, workshops, in-house training) for industry. Implementation (RAG, agents, evaluation, multimodal) is a follow-on statement of work. Led by Majid Memari, PhD (Founder & CEO; NVIDIA DLI Certified Instructor; researcher working on LLMs, agents, and retrieval; PhD in Computer Science with doctoral research in generative AI; postdoctoral research at the University of Pennsylvania, which brought research collaborations with Stanford and Johns Hopkins, which were collaborations, not employers, and no endorsement of Nexus; 2026 AI Utah 100 honoree), with Hamid Memari (Chief Technology Officer) leading the technical side and Mohammad Jafarinejad, PhD (Chief Financial Officer) leading pricing and engagement economics.

Classify this contact form message into exactly one category:
- consulting: AI consulting, adoption advice, architecture review, when to use AI
- workshop: workshops, team training, in-house training, NVIDIA DLI generative AI workshops for industry (the "Building Agentic AI Applications With LLMs" workshop: NVIDIA takes care of everything: cloud GPU VMs so the customer needs no compute, plus content, curriculum, assessment, and certificate; Nexus hosts and teaches in person at the client site anywhere in the United States, or online, and prices/invoices delivery at $500 per seat for up to 20, larger groups quoted). A Certified Instructor hosts. Also custom-designed training.
- careers: jobs, hiring, AI engineer role, resume, application
- partnership: collaboration, vendor, agency, joint work
- general: other or unclear

Then write a short personalized acknowledgment (2 to 4 sentences) the visitor will see on the website after submitting. Use their name if natural. Be warm and professional. Do not promise specific timelines; say the team will follow up. Never suggest the visitor's location is a problem or outside a service area.

Name: ${input.name}
Message:
${input.message}`;
}

/** Characters the classification prompt will send, for the precharge estimate. */
export function inquiryPromptChars(input: { name: string; message: string }): number {
  return inquiryPrompt(input).length;
}

export async function classifyInquiry(input: {
  name: string;
  message: string;
  modelId: string;
}): Promise<InquiryClassification> {
  const { object, usage } = await generateObject({
    model: gateway(input.modelId),
    schema: inquirySchema,
    maxOutputTokens: CONTACT_CLASSIFY_OUTPUT_TOKENS,
    timeout: { totalMs: CONTACT_CLASSIFY_TIMEOUT_MS },
    providerOptions: {
      gateway: {
        tags: ["site:nexus", "feature:contact-classify", `env:${process.env.VERCEL_ENV ?? "dev"}`],
      },
    },
    prompt: inquiryPrompt(input),
  });
  const tokens = tokenBreakdown(usage);
  return {
    ...object,
    inputTokens: tokens.input + tokens.cacheRead + tokens.cacheWrite,
    outputTokens: tokens.output,
  };
}

export function fallbackInquiryResponse(): { category: InquiryCategory; autoReply: string } {
  return {
    category: "general",
    autoReply:
      "Thank you for contacting Nexus AI Solutions. We've received your message and a member of our team will get back to you soon.",
  };
}
