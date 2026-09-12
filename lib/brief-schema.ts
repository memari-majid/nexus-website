import { z } from "zod";

/**
 * AI Readiness Brief — the contract shared by `/api/brief` (server) and
 * `/ai-brief` (client). Field order matters: `streamObject` emits keys in
 * schema order, so the order below is the order the visitor watches sections
 * arrive, and the process trace on the page is derived from it.
 */

/** Visitor input — hard caps enforced on both sides. */
export const BRIEF_INPUT_MIN = 20;
export const BRIEF_INPUT_MAX = 1200;

export const briefInputSchema = z.object({
  description: z.string().trim().min(BRIEF_INPUT_MIN).max(BRIEF_INPUT_MAX),
});

export const AUDIENCES = ["business", "university", "nonprofit", "public-sector", "individual", "other"] as const;
export const EFFORTS = ["low", "medium", "high"] as const;

/**
 * Closed set of real Nexus offerings. The model can only choose one of these;
 * the page renders the matching card from `lib/dli.ts` / `lib/training.ts`,
 * so recommendations are grounded by construction.
 */
export const PATHS = ["consulting", "nvidia-dli-workshop", "custom-training", "implementation"] as const;

export const briefSchema = z.object({
  audience: z
    .enum(AUDIENCES)
    .describe("Who the visitor is. 'university' for any college or university department or campus group."),
  summary: z
    .string()
    .describe("Two or three plain sentences restating the situation and the goal in the visitor's terms."),
  opportunities: z
    .array(
      z.object({
        title: z.string().describe("Short noun phrase, no trailing period"),
        why: z.string().describe("One or two sentences on why this is a good fit for AI, concretely"),
        effort: z.enum(EFFORTS).describe("Realistic effort to reach a working first version"),
      }),
    )
    .min(2)
    .max(4),
  risks: z
    .array(
      z.object({
        title: z.string().describe("Short noun phrase, no trailing period"),
        mitigation: z.string().describe("One sentence on how to reduce it"),
      }),
    )
    .min(2)
    .max(3),
  notAutomate: z
    .array(z.string().describe("One sentence naming a task to keep with people and why"))
    .min(2)
    .max(4)
    .describe("Tasks this organization should not hand to AI, at least for now"),
  recommendedPath: z.object({
    path: z.enum(PATHS),
    reason: z.string().describe("One sentence on why this is the right first step"),
  }),
  questionsToAnswer: z
    .array(z.string().describe("A question ending in a question mark"))
    .min(3)
    .max(5)
    .describe("Questions the organization should answer before committing budget"),
});

export type Brief = z.infer<typeof briefSchema>;
export type BriefAudience = (typeof AUDIENCES)[number];
export type BriefPath = (typeof PATHS)[number];
export type BriefEffort = (typeof EFFORTS)[number];

/** Keys in stream order — the trace panel walks this list. */
export const BRIEF_KEYS = [
  "audience",
  "summary",
  "opportunities",
  "risks",
  "notAutomate",
  "recommendedPath",
  "questionsToAnswer",
] as const satisfies readonly (keyof Brief)[];
