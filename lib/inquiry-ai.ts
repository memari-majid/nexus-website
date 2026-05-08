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
    prompt: `You are the intake assistant for Nexus AI Solutions LLC, Utah—an independent IT & AI vendor on scoped statements-of-work / milestones (Nexus staffs delivery; positioning aligns with https://nexusaisolution.net/ #services and #engagement). Led by principals Dr. Majid Memari and Hamid Memari.

Classify this contact form message into exactly one category:
- consulting: IT strategy, integration, cloud, security, infrastructure, custom AI builds
- workshop: NVIDIA DLI, university GPU training, instructor-led workshops
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
