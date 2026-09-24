/**
 * AI readiness snapshot: five fixed dimensions the assistant scores from what
 * the visitor said. The dimension list is closed so the card and the tool
 * always agree, and every score is clamped before it is rendered.
 *
 * Client-safe: zod only, no React, no env.
 */

import { z } from "zod";

export const READINESS_DIMENSIONS = [
  {
    key: "useCase",
    label: "Use case",
    question: "Is there one specific, valuable task AI should do?",
  },
  {
    key: "data",
    label: "Data",
    question: "Is the data that task needs reachable, clean enough, and allowed to be used?",
  },
  {
    key: "team",
    label: "Team",
    question: "Is there an owner, and hands-on skill to build and maintain it?",
  },
  {
    key: "workflow",
    label: "Workflow fit",
    question: "Is there a place in the daily work where the output would actually be used?",
  },
  {
    key: "governance",
    label: "Governance",
    question: "Are privacy, safety, and accountability rules settled enough to ship?",
  },
] as const;

export type ReadinessKey = (typeof READINESS_DIMENSIONS)[number]["key"];

export const READINESS_KEYS = READINESS_DIMENSIONS.map((d) => d.key) as [
  ReadinessKey,
  ...ReadinessKey[],
];

export const MAX_SCORE = 5;

/**
 * Tool input. Scores are plain numbers (no `integer` or `format` keywords in
 * the JSON schema) and are rounded and clamped in `summarizeReadiness`.
 * Caps are twice the display target; the targets sit in the descriptions.
 */
export const readinessInputSchema = z.object({
  headline: z
    .string()
    .min(1)
    .max(160)
    .describe("One sentence on where they stand today, under 80 characters, in their terms"),
  dimensions: z
    .array(
      z.object({
        key: z.enum(READINESS_KEYS),
        score: z.number().min(1).max(MAX_SCORE).describe("1 (not there) to 5 (solid)"),
        note: z
          .string()
          .min(1)
          .max(200)
          .describe("One short sentence of evidence from what the visitor said, under 100 characters"),
      }),
    )
    .min(1)
    .max(READINESS_DIMENSIONS.length)
    .describe("Score only the dimensions you have evidence for; skip the rest"),
  nextStep: z
    .string()
    .min(1)
    .max(300)
    .describe("The single most useful next step, under 150 characters"),
});

export type ReadinessInput = z.infer<typeof readinessInputSchema>;

export type ReadinessDimensionResult = {
  key: ReadinessKey;
  label: string;
  score: number;
  note: string;
};

export type ReadinessSnapshot = {
  headline: string;
  nextStep: string;
  /** Mean of the scored dimensions, one decimal. */
  overall: number;
  level: ReadinessLevel;
  dimensions: ReadinessDimensionResult[];
  /** Lowest-scoring dimension, the natural "fix this first". */
  weakest: ReadinessDimensionResult | null;
};

export type ReadinessLevel = "Early" | "Forming" | "Ready to pilot" | "Ready to scale";

/** Integer 0..5, never NaN, so `"●".repeat(score)` can never throw. */
export function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, Math.round(n)));
}

export function readinessLevel(overall: number): ReadinessLevel {
  if (overall < 2.5) return "Early";
  if (overall < 3.5) return "Forming";
  if (overall < 4.5) return "Ready to pilot";
  return "Ready to scale";
}

export function dimensionLabel(key: string): string {
  return READINESS_DIMENSIONS.find((d) => d.key === key)?.label ?? key;
}

/** Pure: what the `assessReadiness` tool returns and the card renders. */
export function summarizeReadiness(input: ReadinessInput): ReadinessSnapshot {
  const byKey = new Map<ReadinessKey, ReadinessDimensionResult>();
  for (const d of input.dimensions) {
    byKey.set(d.key, {
      key: d.key,
      label: dimensionLabel(d.key),
      score: clampScore(d.score),
      note: d.note.trim(),
    });
  }
  // Canonical order, last write wins for a repeated key.
  const dimensions = READINESS_DIMENSIONS.map((d) => byKey.get(d.key)).filter(
    (d): d is ReadinessDimensionResult => Boolean(d),
  );
  const scored = dimensions.filter((d) => d.score > 0);
  const overall =
    scored.length === 0
      ? 0
      : Math.round((scored.reduce((s, d) => s + d.score, 0) / scored.length) * 10) / 10;
  const weakest = scored.reduce<ReadinessDimensionResult | null>(
    (low, d) => (low === null || d.score < low.score ? d : low),
    null,
  );
  return {
    headline: input.headline.trim(),
    nextStep: input.nextStep.trim(),
    overall,
    level: readinessLevel(overall),
    dimensions,
    weakest,
  };
}
