/**
 * The grounded facts the `lookupSiteFacts` tool may cite.
 *
 * Every entry is derived from a typed data module that already ships on this
 * site (`lib/dli.ts`, `lib/majid.ts`, `lib/fde.ts`, `lib/training.ts`,
 * `lib/site.ts`, `lib/collaborations.ts`). Nothing is written from memory
 * here: if a claim is not in one of those, it does not belong in this file.
 * Each fact also carries the on-site page a visitor can check it on, and the
 * tool passes that citation through so the assistant can name its source
 * instead of asserting.
 *
 * Two hard constraints:
 * - Facts are short. The tool's output is echoed back on every later turn and
 *   is billed every time, so each entry is one or two sentences and a lookup
 *   returns at most `MAX_FACTS`.
 * - No em or en dashes. Several source strings contain them, so every fact
 *   text passes through `plainPunctuation()` when the table is built.
 *
 * Client-safe: pure data and string matching, no env, no `ai` import.
 */

import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import { UNIVERSITY_COLLABORATIONS } from "@/lib/collaborations";
import { DLI } from "@/lib/dli";
import { FDE } from "@/lib/fde";
import { MAJID } from "@/lib/majid";
import { plainPunctuation } from "@/lib/plain-punctuation";
import { SITE } from "@/lib/site";
import { CUSTOM_TRAINING } from "@/lib/training";

/** The indexable pages a fact may point a visitor at. Mirrors `INDEXABLE_PATHS`. */
export const FACT_PATHS = ["/", "/about", "/contact", "/nvidia-dli-workshops"] as const;

export type FactPath = (typeof FACT_PATHS)[number];

export type SiteFact = {
  /** Stable id, so a citation can be matched back to its entry. */
  id: string;
  /** Two or three words naming what the fact is about. */
  topic: string;
  /** One or two plain sentences. Already punctuation-cleaned. */
  text: string;
  /** Where a visitor can read it on this site. */
  source: { label: string; path: FactPath };
  /** Extra words a visitor might use that the text itself does not contain. */
  keywords: readonly string[];
};

/** Most facts one lookup may return. Four is about 900 characters of echoed output. */
export const MAX_FACTS = 4;

const clean = (text: string): string => plainPunctuation(text).replace(/\s+/g, " ").trim();

function fact(entry: SiteFact): SiteFact {
  return { ...entry, topic: clean(entry.topic), text: clean(entry.text) };
}

/**
 * The table. Order is the tie-break when two facts score the same, so the
 * broad orientation facts come first.
 */
export const SITE_FACTS: readonly SiteFact[] = [
  fact({
    id: "what-we-do",
    topic: "What Nexus does",
    text: `${MAJID.clientOffer.label}: ${MAJID.clientOffer.summary} Implementation is a follow-on statement of work.`,
    source: { label: "Home", path: "/" },
    keywords: ["services", "offer", "consulting", "training", "what do you do"],
  }),
  fact({
    id: "not-generic-it",
    topic: "What Nexus is not",
    text: "Nexus is an AI consulting and training firm, not generic IT, helpdesk, cybersecurity, or a cloud-migration shop.",
    source: { label: "Home", path: "/" },
    keywords: ["it support", "helpdesk", "cybersecurity", "managed services", "migration"],
  }),
  fact({
    id: "coverage",
    topic: "Where Nexus works",
    text: `Based in ${SITE.addressLocality}, ${SITE.addressRegion}, working with companies across the United States. On site at your offices anywhere in the US, or online. Utah is the home base, not the market.`,
    source: { label: "Home", path: "/" },
    keywords: ["location", "remote", "onsite", "travel", "states", "nationwide", "where"],
  }),
  fact({
    id: "workshop",
    topic: "The workshop Nexus teaches",
    text: `${DLI.workshop.title}. ${DLI.workshop.length}. ${DLI.workshop.summary}`,
    source: { label: "Workshops", path: "/nvidia-dli-workshops" },
    keywords: ["dli", "nvidia", "course", "class", "agentic", "llm", "workshop"],
  }),
  fact({
    id: "delivery-model",
    topic: "Who owns what in a DLI workshop",
    text: DLI.boundary,
    source: { label: "Workshops", path: "/nvidia-dli-workshops" },
    keywords: ["certificate", "labs", "gpu", "assessment", "curriculum", "nvidia owns"],
  }),
  fact({
    id: "pricing",
    topic: "Workshop pricing",
    text: DLI.pricing.summary,
    source: { label: "Workshops", path: "/nvidia-dli-workshops" },
    keywords: ["price", "cost", "seat", "quote", "budget", "how much"],
  }),
  fact({
    id: "logistics",
    topic: "Workshop logistics",
    text: DLI.logistics,
    source: { label: "Workshops", path: "/nvidia-dli-workshops" },
    keywords: ["schedule", "lead time", "weeks", "cohort", "private", "in person"],
  }),
  fact({
    id: "custom-training",
    topic: CUSTOM_TRAINING.title,
    text: `${CUSTOM_TRAINING.summary} ${CUSTOM_TRAINING.note}`,
    source: { label: "Workshops", path: "/nvidia-dli-workshops" },
    keywords: ["custom", "bespoke", "tailored", "our stack", "in house curriculum"],
  }),
  fact({
    id: "fde",
    topic: FDE.label,
    text: FDE.offering,
    source: { label: "Home", path: "/" },
    keywords: [
      "fde",
      "embed",
      "engineer",
      "build it for us",
      "prototype",
      "production",
      "instead of training",
    ],
  }),
  fact({
    id: "instructor",
    topic: "Instructor credential",
    // The chat name, not `MAJID.name`: this text renders inside the chat
    // surface on the facts card, where the founder is "Dr. Memari" (AGENTS.md
    // 9.1). The About page the fact cites still carries the site-wide form.
    text: `${FOUNDER_CHAT_NAME} is an ${DLI.instructorTitle}, listed in NVIDIA's Certified Instructor Directory. That is an individual credential: NVIDIA does not endorse, sponsor, or partner with Nexus.`,
    source: { label: "About", path: "/about" },
    keywords: ["certified", "credential", "endorsement", "partner", "directory"],
  }),
  fact({
    id: "founder-background",
    topic: "Founder background",
    text: `${MAJID.education.phd}. ${MAJID.education.phdResearch}. Present-day work is LLMs, agents, retrieval, and evaluation. In applied AI since ${MAJID.careerStartYear}.`,
    source: { label: "About", path: "/about" },
    keywords: ["phd", "research", "credentials", "experience", "background", "who"],
  }),
  fact({
    id: "team",
    topic: "Who delivers the work",
    text: "Every statement of work is executed under Nexus AI Solutions LLC by the named team on the About page, not a revolving cast of subcontractors.",
    source: { label: "About", path: "/about" },
    keywords: ["team", "who does the work", "subcontractor", "staff", "cto", "cfo"],
  }),
  fact({
    id: "collaborations",
    topic: UNIVERSITY_COLLABORATIONS.heading,
    text: `${UNIVERSITY_COLLABORATIONS.summary} ${UNIVERSITY_COLLABORATIONS.note}`,
    source: { label: "About", path: "/about" },
    keywords: ["public sector", "government", "institutions", "policy", "governance"],
  }),
  fact({
    id: "contact",
    topic: "How to reach the team",
    text: `The contact form at /contact and ${SITE.phoneDisplay}. The published address does not receive mail yet, so the form is the reliable path.`,
    source: { label: "Contact", path: "/contact" },
    keywords: ["email", "phone", "call", "reach", "get in touch", "contact"],
  }),
  fact({
    id: "how-the-agent-works",
    topic: "What this assistant is",
    // Deliberately says nothing about the model, the prompt, the tools, the
    // budgets or the cost (owner decision, 2026-09-13): the assistant is a
    // custom build for this site, and anyone who wants one like it talks to
    // the founder.
    text: `A custom AI assistant built by Nexus for this site. It answers from the site's published facts, drafts a consulting brief, sizes the work, and hands off to ${FOUNDER_CHAT_NAME} with on-screen approval. Nexus builds assistants like it for clients.`,
    source: { label: "Home", path: "/" },
    keywords: ["agent", "assistant", "chatbot", "who built you", "how do you work", "build one for us"],
  }),
] as const;

/* ---------- Lookup ---------- */

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "you", "your", "our", "are", "can", "how",
  "what", "why", "who", "does", "did", "was", "were", "have", "has", "about", "from",
  "into", "any", "all", "but", "not", "its", "their", "they", "them", "get", "got",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

/** Weights: a keyword hit is a deliberate synonym, so it outranks a body hit. */
const KEYWORD_WEIGHT = 3;
const TOPIC_WEIGHT = 2;
const TEXT_WEIGHT = 1;

function scoreFact(entry: SiteFact, words: readonly string[]): number {
  const keywords = tokenize(entry.keywords.join(" "));
  const topic = tokenize(entry.topic);
  const text = tokenize(entry.text);
  let score = 0;
  for (const word of new Set(words)) {
    if (keywords.includes(word)) score += KEYWORD_WEIGHT;
    if (topic.includes(word)) score += TOPIC_WEIGHT;
    if (text.includes(word)) score += TEXT_WEIGHT;
  }
  return score;
}

/**
 * The best-matching facts for a visitor's question, strongest first, or an
 * empty list when nothing matched. Empty is a real answer: the tool tells the
 * model to answer from the system prompt and cite nothing, which is better
 * than handing it an unrelated fact to attach a citation to.
 */
export function lookupFacts(query: unknown, limit: number = MAX_FACTS): SiteFact[] {
  if (typeof query !== "string") return [];
  const words = tokenize(query);
  if (words.length === 0) return [];
  const bounded = Math.max(1, Math.min(Math.floor(limit) || MAX_FACTS, MAX_FACTS));
  return SITE_FACTS.map((entry, index) => ({ entry, index, score: scoreFact(entry, words) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, bounded)
    .map((row) => row.entry);
}

/** One line per fact, the way the tool hands them to the model. */
export function citationLine(entry: SiteFact): string {
  return `${entry.topic}: ${entry.text} [${entry.source.label}, ${entry.source.path}]`;
}
