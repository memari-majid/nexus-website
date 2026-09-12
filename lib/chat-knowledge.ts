import { UNIVERSITY_COLLABORATIONS } from "@/lib/collaborations";
import { DLI } from "@/lib/dli";
import { FAQS } from "@/lib/faq";
import { PEOPLE } from "@/lib/people";
import { SITE } from "@/lib/site";
import { CUSTOM_TRAINING } from "@/lib/training";

/**
 * Grounding layer for the site chat assistant.
 *
 * Everything here is derived from the same typed sources the pages render
 * (`lib/dli.ts`, `lib/training.ts`, `lib/people.ts`, `lib/collaborations.ts`,
 * `lib/faq.ts`, `lib/site.ts`) so the assistant cannot drift from the site.
 * Never hard-code a fact in this file that belongs in one of those modules —
 * import it instead.
 *
 * Split in two:
 *   - `chatKnowledgeCore()` goes into every system prompt: the link map, the
 *     workshop essentials, who's who, contact details, grounding rules.
 *   - `knowledgeTopic()` backs the `lookupKnowledge` tool for depth (module
 *     outline, per-person bios, FAQ answers, NVIDIA verification links) so the
 *     prompt stays small and every detailed answer is quoted, not recalled.
 */

/** Pages the assistant may link. Relative paths only — same-tab navigation. */
export const SITE_PAGES: { path: string; covers: string }[] = [
  { path: "/", covers: "Overview of services, the workshop, the team, and the FAQ" },
  {
    path: "/nvidia-dli-workshops",
    covers: "The NVIDIA DLI workshop: outline, tools, delivery model, free-for-universities, official NVIDIA links",
  },
  { path: "/about", covers: "The three leaders and what Nexus does" },
  ...PEOPLE.map((p) => ({
    path: `/about/${p.slug}`,
    covers: `${p.displayName} — ${p.role}`,
  })),
  { path: "/contact", covers: "Contact form, email, and phone" },
];

export const KNOWLEDGE_TOPICS = [
  "workshop-outline",
  "workshop-logistics",
  "universities",
  "custom-training",
  "team",
  "faq",
  "nvidia-resources",
  "contact",
] as const;

export type KnowledgeTopic = (typeof KNOWLEDGE_TOPICS)[number];

export const KNOWLEDGE_TOPIC_HINTS: Record<KnowledgeTopic, string> = {
  "workshop-outline": "module-by-module outline, tools, and length of the NVIDIA DLI workshop",
  "workshop-logistics": "who provides what, scheduling lead time, on-site vs virtual, pricing policy",
  universities: "free delivery for US universities, campus audiences, Ambassador program terms",
  "custom-training": "Nexus-designed training when the NVIDIA catalog is not the right fit",
  team: "the three leaders, their roles, bios, and profile links",
  faq: "the published FAQ answers about services, engagements, privacy, and industries",
  "nvidia-resources": "official NVIDIA pages linked from the workshop Resources list",
  contact: "email, phone, address, and how to reach a human",
};

function bullets(items: readonly string[]): string {
  return items.map((i) => `- ${i}`).join("\n");
}

/** Detailed answer text for one topic — returned verbatim by the lookup tool. */
export function knowledgeTopic(topic: KnowledgeTopic): string {
  switch (topic) {
    case "workshop-outline":
      return [
        `${DLI.workshop.title} — ${DLI.workshop.length}. ${DLI.workshop.summary}`,
        `NVIDIA's published outline: ${DLI.workshop.courseUrl}`,
        "",
        "Modules:",
        DLI.outline.map((m) => `- ${m.title}: ${m.text}`).join("\n"),
        "",
        `Tools used: ${DLI.tools.join(", ")}.`,
        `${DLI.catalogNote} NVIDIA training catalog: ${DLI.catalogUrl}`,
        "Site page: /nvidia-dli-workshops",
      ].join("\n");

    case "workshop-logistics":
      return [
        DLI.model,
        DLI.boundary,
        "",
        `${DLI.nvidiaProvides.heading}:`,
        bullets(DLI.nvidiaProvides.items),
        "",
        `${DLI.weProvide.heading}:`,
        bullets(DLI.weProvide.items),
        "",
        DLI.logistics,
        `Audiences: ${DLI.audiences}`,
        "Pricing: seats are purchased through NVIDIA at NVIDIA's published rate. Nexus does not sell seats or set the price. Never quote a figure — invite them to contact Nexus to arrange delivery.",
        "Compute: the customer needs no GPUs, local compute, or special infrastructure — NVIDIA supplies cloud GPU VMs.",
        "Site page: /nvidia-dli-workshops",
      ].join("\n");

    case "universities":
      return [
        `${DLI.academia.heading}: ${DLI.academia.text}`,
        `Credential behind it: ${DLI.credential}.`,
        "Scheduling and lab access run through NVIDIA's University Ambassador Program, so six weeks' notice is a real constraint, not a preference.",
        `${UNIVERSITY_COLLABORATIONS.summary} ${UNIVERSITY_COLLABORATIONS.items
          .map((i) => `${i.name}: ${i.text}`)
          .join(" ")} ${UNIVERSITY_COLLABORATIONS.note}`,
        "Site page: /nvidia-dli-workshops",
      ].join("\n");

    case "custom-training":
      return [
        `${CUSTOM_TRAINING.title}: ${CUSTOM_TRAINING.summary}`,
        bullets(CUSTOM_TRAINING.points),
        CUSTOM_TRAINING.note,
      ].join("\n");

    case "team":
      return PEOPLE.map((p) =>
        [
          `${p.displayName} — ${p.roleLong}`,
          p.summary,
          ...p.bio.map((b) => (b.heading ? `${b.heading}: ${b.text}` : b.text)),
          `Profile page: /about/${p.slug}`,
          `Links: ${p.links.map((l) => `${l.label} — ${l.href}`).join("; ")}`,
        ].join("\n"),
      ).join("\n\n");

    case "faq":
      return FAQS.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

    case "nvidia-resources":
      return [
        `Credential: ${DLI.credential}. Directory: ${DLI.instructorDirectory}`,
        bullets(DLI.references.map((r) => `${r.label}: ${r.href}`)),
        "Share these when useful. Never say NVIDIA partner, NVIDIA-sponsored, or NVIDIA-endorsed.",
      ].join("\n");

    case "contact":
      return [
        `Email: ${SITE.email}`,
        `Phone: ${SITE.phoneDisplay}`,
        `Based in ${SITE.addressLocality}, ${SITE.addressRegion} — ${SITE.addressCountry}.`,
        "Contact page: /contact",
        "You can also file the request yourself with requestAppointment or requestWorkshop instead of sending them to the form.",
      ].join("\n");
  }
}

/**
 * Compact grounded context for the system prompt. Facts a visitor asks about
 * in the first breath live here; anything longer is one `lookupKnowledge` call
 * away.
 */
export function chatKnowledgeCore(): string {
  const leaders = PEOPLE.map((p) => `${p.displayName} — ${p.role} (/about/${p.slug})`).join("; ");

  return `GROUNDED SITE KNOWLEDGE
Everything below is published on ${SITE.name}'s own site. Answer from it. If a question is not covered here or by lookupKnowledge, say you do not know and offer ${SITE.email} or the /contact page — never guess, never fill a gap with a plausible-sounding fact.

Workshop available now: ${DLI.workshop.title} — ${DLI.workshop.length}. ${DLI.workshop.summary} ${DLI.model} ${DLI.boundary} ${DLI.logistics} ${DLI.academia.heading.toLowerCase()}: ${DLI.academia.text}
Custom training: ${CUSTOM_TRAINING.summary} ${CUSTOM_TRAINING.note}
Leadership: ${leaders}.
Contact: ${SITE.email} · ${SITE.phoneDisplay} · /contact

LINKING
Link to real pages with markdown when it helps, using these relative paths only:
${SITE_PAGES.map((p) => `- ${p.path} — ${p.covers}`).join("\n")}
For NVIDIA claims, link NVIDIA's own pages (course outline ${DLI.workshop.courseUrl}, instructor directory ${DLI.instructorDirectory}). Never invent a URL or a page that is not in the list above.

DEEPER DETAIL
Call lookupKnowledge before answering anything detailed about: ${KNOWLEDGE_TOPICS.map(
    (t) => `${t} (${KNOWLEDGE_TOPIC_HINTS[t]})`,
  ).join("; ")}. Quote what it returns rather than recalling from memory.

FILING REQUESTS
Use requestAppointment for a call, consult, or quote. Use requestWorkshop when the ask is a workshop or campus session and you have the organization type, team size, and timing. Both land in the Nexus inbox and neither books a calendar slot — never state or imply a specific meeting time, invite, or confirmation number.`;
}
