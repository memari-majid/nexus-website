import type { ModelMessage } from "ai";
import { z } from "zod";

/**
 * The consulting brief: the structured deliverable the assistant drafts in chat via
 * the `draftConsultingBrief` tool. The tool's input IS the brief, so the card
 * can render `part.input` while it streams, and the hand-off and the visitor
 * email re-read it from the message history (`findBrief`) instead of asking
 * the model to emit it twice.
 *
 * Schema rules that matter on every picker model: no regex patterns, no
 * `format` keywords, plain strings and enums only. Caps are twice the display
 * target and the targets sit in `.describe()`, so a slightly long field is
 * accepted instead of rejecting a 1,500-token brief and burning a retry step.
 *
 * Client-safe: type-only `ai` import, zod only.
 */

/** Closed set of real Nexus offerings the brief may recommend. */
export const BRIEF_PATHS = ["consulting", "nvidia-dli-workshop", "custom-training", "fde"] as const;
export const EFFORTS = ["low", "medium", "high"] as const;

export const consultingBriefSchema = z.object({
  organization: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "Who they are in one line, under 100 characters: what the organization does, its size if known, the visitor's role",
    ),
  goal: z
    .string()
    .min(1)
    .max(400)
    .describe("What they want AI to do for them, in their words, under 200 characters"),
  currentState: z
    .string()
    .min(1)
    .max(400)
    .describe("Where they are today: tools, data, team, what has been tried, under 200 characters"),
  opportunities: z
    .array(
      z.object({
        title: z
          .string()
          .min(1)
          .max(100)
          .describe("Short noun phrase, no trailing period, under 50 characters"),
        why: z
          .string()
          .min(1)
          .max(300)
          .describe("Why this is a good fit for AI here, concretely, under 150 characters"),
        effort: z.enum(EFFORTS).describe("Realistic effort to a working first version"),
      }),
    )
    .min(1)
    .max(4),
  risks: z
    .array(
      z.object({
        title: z.string().min(1).max(100).describe("Short noun phrase, under 50 characters"),
        mitigation: z
          .string()
          .min(1)
          .max(300)
          .describe("One sentence on how to reduce it, under 150 characters"),
      }),
    )
    .min(1)
    .max(3),
  keepWithPeople: z
    .array(
      z
        .string()
        .min(1)
        .max(240)
        .describe("A task that should stay with people and why, under 120 characters"),
    )
    .min(1)
    .max(4)
    .describe("Work this organization should not hand to AI, at least for now"),
  recommendedPath: z.object({
    path: z
      .enum(BRIEF_PATHS)
      .describe("consulting, nvidia-dli-workshop, custom-training, or fde"),
    reason: z
      .string()
      .min(1)
      .max(300)
      .describe("One sentence on why this is the right first step, under 150 characters"),
  }),
  firstStep: z
    .string()
    .min(1)
    .max(400)
    .describe("The concrete first thing to do, under 200 characters"),
  openQuestions: z
    .array(
      z
        .string()
        .min(1)
        .max(240)
        .describe("A question to answer before committing budget, under 120 characters"),
    )
    .min(1)
    .max(5),
});

export type ConsultingBrief = z.infer<typeof consultingBriefSchema>;
export type BriefPath = (typeof BRIEF_PATHS)[number];
export type BriefEffort = (typeof EFFORTS)[number];

/** Keys in the order the card renders them. */
export const BRIEF_KEYS = [
  "organization",
  "goal",
  "currentState",
  "opportunities",
  "risks",
  "keepWithPeople",
  "recommendedPath",
  "firstStep",
  "openQuestions",
] as const satisfies readonly (keyof ConsultingBrief)[];

export const BRIEF_TOOL_NAME = "draftConsultingBrief";

/**
 * Finds the brief in the `ModelMessage[]` the SDK hands to a tool's `execute`
 * (`ToolCallOptions.messages`): the latest assistant `tool-call` part named
 * `draftConsultingBrief`, or the one with the given id when the model echoed
 * it. The input is re-validated because message history is untrusted. A brief
 * drafted in the same step as the caller (parallel calls) is not visible yet
 * and returns null; the caller then proceeds without it.
 */
export function findBrief(
  messages: readonly ModelMessage[],
  toolCallId?: string,
): ConsultingBrief | null {
  let latest: ConsultingBrief | null = null;
  for (const message of messages) {
    if (message.role !== "assistant" || typeof message.content === "string") continue;
    for (const part of message.content) {
      if (part.type !== "tool-call" || part.toolName !== BRIEF_TOOL_NAME) continue;
      const parsed = consultingBriefSchema.safeParse(part.input);
      if (!parsed.success) continue;
      if (toolCallId && part.toolCallId === toolCallId) return parsed.data;
      latest = parsed.data;
    }
  }
  return latest;
}
