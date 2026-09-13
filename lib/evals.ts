/**
 * The published evaluation artifact: schema, loader, and the small helpers the
 * evaluations panel and `/how-it-works` render it with.
 *
 * One rule governs this file and everything that touches it: a score only
 * exists if someone measured it. The artifact under `evals/results/` is
 * written by `evals/bakeoff.ts --json` and `evals/judge.ts`, never by hand, and
 * a field that was not measured is `null` here rather than a plausible number.
 * `rubricScores: null` on a row means no judge has scored that row, and the
 * panel renders the human read instead of inventing a number. The replies
 * themselves are written to `evals/results/bakeoff-transcripts.json`, which
 * nothing on the site imports: this file must stay small enough to ship to a
 * browser.
 *
 * The live run a visitor can start is a DIFFERENT measurement (one turn at
 * `EVAL_MAX_OUTPUT_TOKENS`, scored by a judge model) and must be rendered in
 * its own block. Nothing may write a live number into a published cell.
 *
 * Client-safe: zod and a static JSON import. No fs, no crypto, no env.
 */

import { z } from "zod";
import published from "@/evals/results/bakeoff-latest.json";
import { EVAL_JUDGE_ALT_MODEL_ID, EVAL_JUDGE_MODEL_ID } from "@/lib/chat-limits";
import {
  CHAT_MODELS,
  fallbackModel,
  findModel,
  resolveModel,
  type ChatModel,
} from "@/lib/chat-models";

/** The five things a reply is judged on. Shared by the script and the panel. */
export const EVAL_RUBRIC = [
  { key: "consults", label: "Consults before it sells" },
  { key: "specific", label: "Specific and honest" },
  { key: "human", label: "Sounds like a person" },
  { key: "grounded", label: "Grounded, invents nothing" },
  { key: "forward", label: "Moves the conversation forward" },
] as const;

export type RubricKey = (typeof EVAL_RUBRIC)[number]["key"];

export const RUBRIC_KEYS = EVAL_RUBRIC.map((r) => r.key) as [RubricKey, ...RubricKey[]];

export const MAX_RUBRIC_SCORE = 5;

export const rubricScoresSchema = z.object({
  consults: z.number(),
  specific: z.number(),
  human: z.number(),
  grounded: z.number(),
  forward: z.number(),
});

export type RubricScores = z.infer<typeof rubricScoresSchema>;

const rowSchema = z.object({
  modelId: z.string().min(1),
  /** Label as measured, so a model later removed from the picker still renders. */
  label: z.string().min(1),
  /** Dollars for the whole scenario, or null when the run was not priced. */
  costUsd: z.number().nullable(),
  /** True when the figure is a rounded reading, not an exact total. */
  approximate: z.boolean(),
  /** Time to first token in milliseconds, or null when it was not recorded. */
  ttftMs: z.number().nullable(),
  /** The human read of the answers, in one line. */
  read: z.string().min(1),
  /** Judge scores, or null when no judge has scored this row. */
  rubricScores: rubricScoresSchema.nullable(),
});

export type EvalRow = z.infer<typeof rowSchema>;

export const publishedEvalsSchema = z.object({
  schemaVersion: z.literal(1),
  /** UTC date the numbers were measured. */
  measuredAt: z.string().min(4),
  /** Commit the results were published in. Never guessed: the script exits instead. */
  gitSha: z.string().min(7),
  /**
   * SHA-256 of the rendered system prompt at measurement time, or null when the
   * run predates the `--json` writer and no hash was recorded. A non-null hash
   * that no longer matches the current prompt means the table is stale, which
   * `lib/evals.test.ts` checks against the shipped prompt on every test run.
   */
  promptHash: z.string().nullable(),
  shape: z.object({
    turns: z.number(),
    maxOutputTokens: z.number(),
    /** How the prompt was rendered, in the exact call the script makes. */
    promptCall: z.string().min(1),
    scenario: z.string().min(1),
  }),
  rows: z.array(rowSchema).min(1),
  /** Models in the picker that this run did not cover, and why. */
  unscored: z.array(z.object({ modelId: z.string().min(1), why: z.string().min(1) })),
  notes: z.array(z.string()),
});

export type PublishedEvals = z.infer<typeof publishedEvalsSchema>;

/**
 * The checked-in artifact, parsed once. Throws at module load if the file and
 * the schema disagree, which is what we want: the panel must never render a
 * half-understood result, and `lib/evals.test.ts` catches it before a deploy.
 */
export const PUBLISHED_EVALS: PublishedEvals = publishedEvalsSchema.parse(published);

/** True when at least one published row carries a judge's rubric scores. */
export function hasPublishedScores(evals: PublishedEvals = PUBLISHED_EVALS): boolean {
  return evals.rows.some((row) => row.rubricScores !== null);
}

/** The picker label for a row, preferring today's table so a rename shows through. */
export function rowLabel(row: EvalRow): string {
  return findModel(row.modelId)?.label ?? row.label;
}

/** Average of the five rubric scores, or null when the row was never scored. */
export function rubricAverage(scores: RubricScores | null): number | null {
  if (!scores) return null;
  const values = RUBRIC_KEYS.map((key) => scores[key]);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/* ---------- The live run ---------- */

/**
 * The wire contract between `app/api/evals/run/route.ts` and the evaluations
 * panel, written down once so the two cannot drift.
 *
 * `POST /api/evals/run` with `{ challenger: "<model id>" }` answers with
 * newline-delimited JSON, one frame per line. NDJSON rather than a Server
 * Action or a UI message stream: `ai/rsc` does not exist in ai 6.0.282, so a
 * Server Action cannot stream this, and `readUIMessageStream` will not take a
 * raw fetch body. Eval frames also never enter the chat transcript: the chat
 * route drops `data-*` parts, so a result carried that way would be invisible
 * to the model on its next turn.
 *
 * Frame order is `start`, then one `reply` per contestant as it lands, then
 * `verdict`, then `done`. An `error` frame is terminal and may arrive at any
 * point, including as the only frame when a cap refuses the run before
 * anything was spent. A cached replay sends the same frames with
 * `cached: true` on `start`.
 */

/** What one contestant produced. `text` is shown in the panel, never persisted. */
export const liveReplySchema = z.object({
  modelId: z.string().min(1),
  label: z.string().min(1),
  text: z.string(),
  totalMs: z.number(),
  tokens: z.object({ input: z.number(), output: z.number(), total: z.number() }),
  costUsd: z.number(),
});

export type LiveReply = z.infer<typeof liveReplySchema>;

/** The judge's verdict on one live run. */
export const liveVerdictSchema = z.object({
  judgeModelId: z.string().min(1),
  judgeLabel: z.string().min(1),
  scores: z.array(z.object({ modelId: z.string().min(1), scores: rubricScoresSchema })),
  winnerModelId: z.string().min(1),
  rationale: z.string(),
});

export type LiveVerdict = z.infer<typeof liveVerdictSchema>;

export const evalFrameSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    contestants: z.array(z.object({ modelId: z.string(), label: z.string() })),
    judge: z.object({ modelId: z.string(), label: z.string() }),
    shape: z.object({ turns: z.number(), maxOutputTokens: z.number(), scenario: z.string() }),
    cached: z.boolean(),
  }),
  z.object({ type: z.literal("reply"), reply: liveReplySchema }),
  z.object({ type: z.literal("verdict"), verdict: liveVerdictSchema }),
  z.object({ type: z.literal("done"), totalCostUsd: z.number(), totalMs: z.number() }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type EvalFrame = z.infer<typeof evalFrameSchema>;

/** One NDJSON line, terminator included. */
export function evalFrameLine(frame: EvalFrame): string {
  return `${JSON.stringify(frame)}\n`;
}

/**
 * Parses one NDJSON line. A partial, unknown, or malformed frame is ignored
 * rather than thrown: the panel reads a network stream, and half a line at a
 * chunk boundary is normal.
 */
export function parseEvalFrame(line: string): EvalFrame | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = evalFrameSchema.safeParse(JSON.parse(trimmed));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * The scenario the live run puts to both models: one turn, deliberately not
 * the two-turn conversation the published table used, so the two measurements
 * read as different rather than as subtly incomparable ones.
 */
export const LIVE_EVAL_TURN =
  "We are a 40-person logistics company. Our ops team keeps asking a public chatbot about our own internal SOPs and getting confident wrong answers. Should we build retrieval over those documents or fine-tune a model, and what would you do first?";

/**
 * What the judge returns. Plain numbers and short strings: this goes through
 * `Output.object`, and a schema with format keywords or long free text is both
 * slower and likelier to come back unparseable.
 */
export const judgeVerdictSchema = z.object({
  scores: z
    .array(
      z.object({
        model: z.string().max(100).describe("The label of the reply you are scoring, exactly as given: A or B"),
        consults: z.number().describe("1 to 5: consults before it sells"),
        specific: z.number().describe("1 to 5: specific and honest, names a first step"),
        human: z.number().describe("1 to 5: sounds like a person, not a brochure"),
        grounded: z.number().describe("1 to 5: invents no price, partner, date, or course title"),
        forward: z.number().describe("1 to 5: moves the conversation forward"),
      }),
    )
    .describe("One entry per reply, in the order the replies were given"),
  winner: z.string().max(100).describe("The label of the better reply: A or B"),
  rationale: z.string().max(300).describe("One sentence on why it won, under 35 words"),
});

export type JudgeVerdict = z.infer<typeof judgeVerdictSchema>;

/** The rubric, as the judge is shown it. */
export function rubricPrompt(): string {
  return EVAL_RUBRIC.map((r, i) => `${i + 1}. ${r.label}`).join("\n");
}

/** Clamps a judge score into the rubric's range. Out-of-range or missing reads as 1. */
export function clampJudgeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.min(MAX_RUBRIC_SCORE, Math.max(1, Math.round(value * 10) / 10));
}

/** The five clamped scores for one judged reply, whatever the judge actually returned. */
export function clampRubricScores(row: Partial<Record<RubricKey, unknown>>): RubricScores {
  return {
    consults: clampJudgeScore(row.consults),
    specific: clampJudgeScore(row.specific),
    human: clampJudgeScore(row.human),
    grounded: clampJudgeScore(row.grounded),
    forward: clampJudgeScore(row.forward),
  };
}

/**
 * The judge for one live run. A model must never judge itself, so the default
 * judge (the cheapest seat at the table, and never the production incumbent)
 * only has to move when the visitor picks it as the challenger. The fallbacks
 * are exhaustive rather than clever: with four models and two contestants
 * there is always a third.
 */
export function judgeFor(contestants: readonly { id: string }[]): ChatModel {
  const taken = new Set(contestants.map((m) => m.id));
  for (const id of [EVAL_JUDGE_MODEL_ID, EVAL_JUDGE_ALT_MODEL_ID]) {
    const model = CHAT_MODELS.find((m) => m.id === id);
    if (model && !taken.has(model.id)) return model;
  }
  return CHAT_MODELS.find((m) => !taken.has(m.id)) ?? fallbackModel();
}

/** The challenger the visitor picked: never the incumbent, always priced. */
export function challengerFor(requested: unknown, incumbent: ChatModel): ChatModel {
  const picked = resolveModel(requested, fallbackModel());
  if (picked.id !== incumbent.id) return picked;
  return CHAT_MODELS.find((m) => m.id !== incumbent.id) ?? fallbackModel();
}
