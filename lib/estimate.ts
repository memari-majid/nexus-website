/**
 * Effort bands for the `estimateProject` tool.
 *
 * The assistant is told, everywhere else, never to invent numbers or
 * timelines. This module is how it can still answer "how long would this
 * take": the ranges come from one published band table below, the arithmetic
 * is deterministic, and the result is labelled a planning range, never a
 * quote. The model chooses the shape of the work; it never chooses the weeks.
 *
 * Two honesty rules the callers must keep:
 * - Ranges are in weeks of elapsed delivery, not a price and not a commitment.
 *   Pricing lives in `lib/dli.ts` for training and in a scoped statement of
 *   work for everything else.
 * - When the inputs are thin, the range widens instead of narrowing. An
 *   unknown is reported as an unknown.
 *
 * Client-safe: zod only, no env, no `ai` import.
 */

import { z } from "zod";
import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";

/** The kinds of work Nexus actually delivers. A shape outside this list is not estimated. */
export const COMPONENT_KINDS = [
  "retrieval",
  "agent",
  "classification",
  "assistant",
  "integration",
  "evaluation",
  "data-preparation",
] as const;

export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export const COMPLEXITIES = ["low", "medium", "high"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

export const DATA_READINESS = ["unknown", "messy", "partly-ready", "ready"] as const;
export type DataReadiness = (typeof DATA_READINESS)[number];

export const TEAM_CAPACITY = ["none", "one-engineer", "small-team", "platform-team"] as const;
export type TeamCapacity = (typeof TEAM_CAPACITY)[number];

/** Weeks of build at medium complexity, before any multiplier. The whole table. */
const KIND_WEEKS: Record<ComponentKind, [low: number, high: number]> = {
  retrieval: [2, 4],
  agent: [3, 6],
  classification: [1, 3],
  assistant: [2, 4],
  integration: [1, 3],
  evaluation: [1, 2],
  "data-preparation": [1, 4],
};

const KIND_LABEL: Record<ComponentKind, string> = {
  retrieval: "Retrieval over your documents",
  agent: "Tool-using agent",
  classification: "Extraction or classification",
  assistant: "Assistant surface",
  integration: "Integration with an existing system",
  evaluation: "Evaluation and guardrails",
  "data-preparation": "Data preparation",
};

const COMPLEXITY_FACTOR: Record<Complexity, number> = { low: 0.75, medium: 1, high: 1.5 };

const DATA_FACTOR: Record<DataReadiness, number> = {
  ready: 1,
  "partly-ready": 1.15,
  messy: 1.4,
  unknown: 1.4,
};

const TEAM_FACTOR: Record<TeamCapacity, number> = {
  "platform-team": 0.85,
  "small-team": 1,
  "one-engineer": 1.3,
  none: 1.6,
};

export const estimateInputSchema = z.object({
  goal: z
    .string()
    .min(1)
    .max(400)
    .describe("What the system should do, in one or two lines, under 200 characters"),
  components: z
    .array(
      z.object({
        name: z.string().min(1).max(120).describe("What this piece is, in their words"),
        kind: z
          .enum(COMPONENT_KINDS)
          .describe("The closest shape of work: retrieval, agent, classification, assistant, integration, evaluation, data-preparation"),
        complexity: z.enum(COMPLEXITIES).describe("How hard this piece looks from what they told you"),
        note: z.string().max(300).optional().describe("One line on why it is that complexity"),
      }),
    )
    .min(1)
    .max(8)
    .describe("The pieces the work breaks into. Two to five is typical; do not pad the list"),
  dataReadiness: z
    .enum(DATA_READINESS)
    .describe("How ready the data is: unknown, messy, partly-ready, ready. Use unknown when they have not said"),
  teamCapacity: z
    .enum(TEAM_CAPACITY)
    .describe("Who would build it: none, one-engineer, small-team, platform-team"),
  constraints: z
    .array(z.string().max(200))
    .max(6)
    .optional()
    .describe("Hard constraints they named: compliance, on-premise, a deadline, a system that cannot change"),
  openQuestions: z
    .array(z.string().max(200))
    .max(5)
    .optional()
    .describe("What you would need answered before this range could tighten"),
});

export type EstimateInput = z.infer<typeof estimateInputSchema>;

export type EstimatePhase = { name: string; low: number; high: number; detail: string };

export type EstimateResult = {
  phases: EstimatePhase[];
  totalLow: number;
  totalHigh: number;
  /** What moved the range, strongest first. */
  drivers: string[];
  biggestUnknown: string;
  /** The one change that would most reduce the range. */
  whatShrinksIt: string;
  /** Always present, always rendered: this is a planning range, not a quote. */
  disclaimer: string;
};

const DISCLAIMER = `Planning range in weeks of elapsed delivery, from a fixed band table, not a quote and not a commitment. Scope, pricing, and dates are settled with ${FOUNDER_CHAT_NAME}.`;

const round = (n: number): number => Math.max(1, Math.round(n));

/**
 * The bands, applied. Discovery and adoption are fixed because they are about
 * people, not scope; build scales with the components; hardening is a share of
 * build, because evaluation and guardrails scale with what was built.
 */
export function estimateProject(input: EstimateInput): EstimateResult {
  const dataFactor = DATA_FACTOR[input.dataReadiness];
  const teamFactor = TEAM_FACTOR[input.teamCapacity];
  let buildLow = 0;
  let buildHigh = 0;
  for (const component of input.components) {
    const [low, high] = KIND_WEEKS[component.kind];
    const factor = COMPLEXITY_FACTOR[component.complexity];
    buildLow += low * factor;
    buildHigh += high * factor;
  }
  buildLow *= dataFactor * teamFactor;
  buildHigh *= dataFactor * teamFactor;

  const phases: EstimatePhase[] = [
    {
      name: "Discovery",
      low: 1,
      high: 2,
      detail: "Read the workflow, see the data, agree on what good looks like.",
    },
    {
      name: "Build",
      low: round(buildLow),
      high: round(buildHigh),
      detail: input.components
        .map((c) => `${KIND_LABEL[c.kind]} (${c.complexity})`)
        .join("; "),
    },
    {
      name: "Evaluation and hardening",
      low: round(buildLow * 0.3),
      high: round(buildHigh * 0.4),
      detail: "Test set, failure review, guardrails, and the numbers that say it is working.",
    },
    {
      name: "Adoption",
      low: 1,
      high: 2,
      detail: "Put it where the work happens and get people using it.",
    },
  ];

  const drivers: string[] = [];
  if (dataFactor > 1) {
    drivers.push(
      input.dataReadiness === "unknown"
        ? "Nobody has looked at the data yet, so every phase carries its widest band."
        : `Data is ${input.dataReadiness}, which widens the build.`,
    );
  }
  if (teamFactor > 1) {
    drivers.push(
      input.teamCapacity === "none"
        ? "No one on your side would build it, so delivery is on Nexus end to end."
        : "One engineer would carry it, so the calendar stretches even if the work does not.",
    );
  }
  if (teamFactor < 1) drivers.push("A platform team shortens the build and the hand-over.");
  const hardParts = input.components.filter((c) => c.complexity === "high");
  if (hardParts.length > 0) {
    drivers.push(`Hardest pieces: ${hardParts.map((c) => c.name).join(", ")}.`);
  }
  if (input.constraints && input.constraints.length > 0) {
    drivers.push(`Constraints you named: ${input.constraints.join("; ")}.`);
  }
  if (drivers.length === 0) drivers.push("Nothing in what you described widens the usual bands.");

  const biggestUnknown =
    input.openQuestions?.[0] ??
    (input.dataReadiness === "unknown"
      ? "What the data actually looks like."
      : "Whether the output lands in a workflow people already use.");

  const whatShrinksIt =
    input.dataReadiness === "unknown" || input.dataReadiness === "messy"
      ? "One week looking at a real sample of the data. It moves the range more than any other single thing."
      : hardParts.length > 0
        ? `Cutting ${hardParts[0].name} from the first release and adding it once the rest is in use.`
        : "Picking one workflow for the first release instead of all of them.";

  return {
    phases,
    totalLow: phases.reduce((sum, p) => sum + p.low, 0),
    totalHigh: phases.reduce((sum, p) => sum + p.high, 0),
    drivers,
    biggestUnknown,
    whatShrinksIt,
    disclaimer: DISCLAIMER,
  };
}

export function kindLabel(kind: unknown): string {
  return typeof kind === "string" && kind in KIND_LABEL
    ? KIND_LABEL[kind as ComponentKind]
    : "Work item";
}
