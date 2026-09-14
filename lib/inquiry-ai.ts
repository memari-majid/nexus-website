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
 * The model answers as text and `parseInquiryClassification` reads the object
 * out of it, rather than `generateObject` with a schema. Measured 2026-09-13:
 * with `CONTACT_CLASSIFY_MODEL=openai/gpt-oss-20b` the schema path failed 99
 * of 99 submissions. The model wrote its answer inside harmony channel tokens,
 * inside a code fence, or with `acknowledgment` where the schema wanted
 * `autoReply`, and every one was paid for and thrown away. The parser takes
 * all three and validates what it finds against the same schema, so a
 * model that answers approximately still classifies and a model that answers
 * nothing usable still fails honestly.
 *
 * Server-only. Never import from a client component.
 */

import { gateway, generateText } from "ai";
import { z } from "zod";
import {
  CONTACT_CLASSIFY_OUTPUT_TOKENS,
  CONTACT_CLASSIFY_TIMEOUT_MS,
} from "@/lib/chat-limits";
import { tokenBreakdown } from "@/lib/chat-metadata";
import { gatewayProviderOptions } from "@/lib/gateway";

export const INQUIRY_CATEGORIES = ["consulting", "workshop", "careers", "partnership", "general"] as const;

/** The longest acknowledgment the form shows; a longer one is cut, not rejected. */
export const AUTO_REPLY_MAX_CHARS = 550;

const inquirySchema = z.object({
  category: z.enum(INQUIRY_CATEGORIES),
  autoReply: z.string().min(1).max(AUTO_REPLY_MAX_CHARS),
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

Answer with one JSON object and nothing else: no prose before or after it, no code fence. The object has exactly two keys: "category", one of consulting, workshop, careers, partnership, general; and "autoReply", the acknowledgment as one string.

Name: ${input.name}
Message:
${input.message}`;
}

/** Characters the classification prompt will send, for the precharge estimate. */
export function inquiryPromptChars(input: { name: string; message: string }): number {
  return inquiryPrompt(input).length;
}

/** Keys a model may put the acknowledgment under when it ignores the field name. */
const AUTO_REPLY_KEYS = ["autoReply", "auto_reply", "acknowledgment", "acknowledgement", "reply", "message"];

/**
 * Reads the classification out of whatever the model wrote. Tolerant of what
 * small models actually return, strict about what it hands back:
 *
 * - Harmony channel tokens (`<|channel|>final<|message|>`) and code fences are
 *   stripped, then the outermost `{ ... }` is parsed.
 * - `category` is matched case-insensitively; anything outside the five reads
 *   as `general`, the same answer the fixed fallback gives.
 * - The acknowledgment may sit under `autoReply` or one of the aliases above;
 *   whitespace is flattened and it is cut at `AUTO_REPLY_MAX_CHARS`.
 *
 * Null when there is no object or no acknowledgment in it: that is a failed
 * call, and the caller charges it as one.
 */
export function parseInquiryClassification(
  text: string,
): { category: InquiryCategory; autoReply: string } | null {
  const cleaned = text.replace(/<\|[^|]*\|>/g, " ").replace(/```[a-z]*/gi, " ");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const categoryRaw = typeof record.category === "string" ? record.category.trim().toLowerCase() : "";
  const category = (INQUIRY_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as InquiryCategory)
    : "general";
  const replyKey = AUTO_REPLY_KEYS.find((key) => typeof record[key] === "string" && (record[key] as string).trim());
  if (!replyKey) return null;
  const autoReply = (record[replyKey] as string).replace(/\s+/g, " ").trim().slice(0, AUTO_REPLY_MAX_CHARS);
  const parsed = inquirySchema.safeParse({ category, autoReply });
  return parsed.success ? parsed.data : null;
}

export async function classifyInquiry(input: {
  name: string;
  message: string;
  modelId: string;
}): Promise<InquiryClassification> {
  const { text, usage } = await generateText({
    model: gateway(input.modelId),
    maxOutputTokens: CONTACT_CLASSIFY_OUTPUT_TOKENS,
    timeout: { totalMs: CONTACT_CLASSIFY_TIMEOUT_MS },
    providerOptions: gatewayProviderOptions("contact-classify"),
    prompt: inquiryPrompt(input),
  });
  const parsed = parseInquiryClassification(text);
  if (!parsed) {
    // The head of the text goes in the message so the log says what the
    // model actually wrote, which is how a misconfigured model is found.
    throw new Error(`classifier returned no usable object: ${JSON.stringify(text.slice(0, 160))}`);
  }
  const tokens = tokenBreakdown(usage);
  return {
    ...parsed,
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
