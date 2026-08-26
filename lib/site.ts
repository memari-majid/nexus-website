export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nexusaisolution.net";

export const SITE = {
  name: "Nexus AI Solutions LLC",
  description:
    "Nexus AI Solutions LLC (Utah) provides AI consulting and team training: advisory engagements on how to adopt AI, instructor-led workshops, and in-house training for builders and leaders. Implementation — RAG, agents, evaluation, multimodal systems — is available as a follow-on statement of work. Founder: Dr. Majid Memari, selected for the 2026 AI Utah 100.",
  email: "info@nexusaisolution.net",
  /** Public customer-facing line — Google Voice. Not a Twilio / Vercel webhook endpoint. */
  phone: "+18018109152",
  phoneDisplay: "(801) 810-9152",
  addressLocality: "Sandy",
  addressRegion: "UT",
  addressCountry: "US",
} as const;
