import { CUSTOM_TRAINING } from "@/lib/training";
import { DLI } from "@/lib/dli";
import { FDE } from "@/lib/fde";
import type { BriefPath, ConsultingBrief } from "@/lib/brief-schema";

/**
 * Prompt rules and plain-text rendering for the consulting brief. Every fact
 * about Nexus is read from the same modules that render the public pages, so
 * the brief cannot describe an offering the site does not.
 */

export const PATH_LABEL: Record<BriefPath, string> = {
  consulting: "AI consulting",
  "nvidia-dli-workshop": `NVIDIA DLI workshop: ${DLI.workshop.title}`,
  "custom-training": CUSTOM_TRAINING.title,
  fde: FDE.label,
};

export const EFFORT_LABEL = {
  low: "low effort",
  medium: "medium effort",
  high: "high effort",
} as const;

/** Safe on untrusted input: unknown paths read as consulting. */
export function pathLabel(path: unknown): string {
  return typeof path === "string" && path in PATH_LABEL
    ? PATH_LABEL[path as BriefPath]
    : PATH_LABEL.consulting;
}

export function effortLabel(effort: unknown): string {
  return typeof effort === "string" && effort in EFFORT_LABEL
    ? EFFORT_LABEL[effort as keyof typeof EFFORT_LABEL]
    : "effort to be scoped";
}

/** Appended to the chat system prompt. Rendered through plainPunctuation there. */
export function briefGuidance(): string {
  return `THE CONSULTING BRIEF (draftConsultingBrief)
Draft it once you understand the organization, the goal, and what they have today, or the moment they ask for a brief, a summary, or a write-up. It renders as a card in the chat; do not repeat it in prose afterward. Ground every field in what they said. When the picture is thin, say so in currentState and lean on openQuestions. Choose recommendedPath from the four real Nexus offerings: consulting when the goal is unclear or a decision is needed before spending; nvidia-dli-workshop for a team with intermediate Python that wants to build agents or LLM apps themselves (name the real catalog title, never invent one); custom-training when the catalog does not fit and the curriculum should be built around their stack and their data (Nexus curriculum, no DLI certificate); fde when they need a solution built and adopted with them, not a team upskilled. keepWithPeople is mandatory and specific to them: judgement, accountability, safety, legal exposure, relationships. Never invent clients, metrics, ROI, timelines, grants, or partnerships. Never write "NVIDIA partner", "NVIDIA-sponsored", or anything implying NVIDIA endorses Nexus. Never call consulting free. Short declarative sentences, plain words, no marketing adjectives, no exclamation marks, no trailing periods on titles. Write to the visitor as "you".`;
}

type Scrub = (s: string) => string;
const identity: Scrub = (s) => s;

/**
 * Plain-text rendering shared by the hand-off email to Majid and the visitor's
 * copy. Pass `scrubForEmail` as `scrub` for anything addressed to a visitor.
 */
export function renderBriefText(brief: ConsultingBrief, scrub: Scrub = identity): string {
  const s = scrub;
  return [
    "WHO YOU ARE",
    s(brief.organization),
    "",
    "GOAL",
    s(brief.goal),
    "",
    "WHERE YOU ARE TODAY",
    s(brief.currentState),
    "",
    "OPPORTUNITIES",
    ...brief.opportunities.map((o) => `- ${s(o.title)} (${effortLabel(o.effort)}): ${s(o.why)}`),
    "",
    "RISKS",
    ...brief.risks.map((r) => `- ${s(r.title)}: ${s(r.mitigation)}`),
    "",
    "KEEP WITH PEOPLE",
    ...brief.keepWithPeople.map((k) => `- ${s(k)}`),
    "",
    "RECOMMENDED PATH",
    `${pathLabel(brief.recommendedPath.path)}: ${s(brief.recommendedPath.reason)}`,
    "",
    "FIRST STEP",
    s(brief.firstStep),
    "",
    "OPEN QUESTIONS",
    ...brief.openQuestions.map((q) => `- ${s(q)}`),
  ].join("\n");
}
