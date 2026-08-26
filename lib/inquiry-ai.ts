import { gateway, generateObject } from "ai";
import { z } from "zod";

const inquirySchema = z.object({
  category: z.enum(["consulting", "workshop", "careers", "partnership", "general"]),
  autoReply: z.string().max(550),
});

export type InquiryCategory = z.infer<typeof inquirySchema>["category"];

export async function classifyInquiry(input: { name: string; message: string; modelId: string }) {
  const { object } = await generateObject({
    model: gateway(input.modelId),
    schema: inquirySchema,
    providerOptions: {
      gateway: {
        tags: ["site:nexus", "feature:contact-classify", `env:${process.env.VERCEL_ENV ?? "dev"}`],
      },
    },
    prompt: `You are the intake assistant for Nexus AI Solutions LLC, Utah. Primary client work is AI consulting and team training (advisory engagements, workshops, in-house training). Implementation — RAG, agents, evaluation, multimodal — is a follow-on statement of work. Led by Dr. Majid Memari (Founder & Principal AI Architect; Assistant Professor of Computer Science at Utah Valley University; NVIDIA University Ambassador; selected for the 2026 AI Utah 100). Do not mention other principals.

Classify this contact form message into exactly one category:
- consulting: AI consulting, adoption advice, architecture review, when to use AI
- workshop: workshops, team training, in-house training, NVIDIA DLI, campus invitations
- careers: jobs, hiring, AI engineer role, resume, application
- partnership: collaboration, vendor, agency, joint work
- general: other or unclear

Then write a short personalized acknowledgment (2–4 sentences) the visitor will see on the website after submitting. Use their name if natural. Be warm and professional. Do not promise specific timelines; say the team will follow up.

Name: ${input.name}
Message:
${input.message}`,
  });
  return object;
}

export function fallbackInquiryResponse(): { category: InquiryCategory; autoReply: string } {
  return {
    category: "general",
    autoReply:
      "Thank you for contacting Nexus AI Solutions. We've received your message and a member of our team will get back to you soon.",
  };
}
