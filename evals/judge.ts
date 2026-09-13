/**
 * Scores a finished bake-off with a model that has no stake in the result.
 *
 * Reads the replies `evals/bakeoff.ts --json` wrote to
 * `evals/results/bakeoff-transcripts.json`, scores each model's final reply
 * against `EVAL_RUBRIC` in `lib/evals.ts` (the same five criteria the panel
 * renders), and writes those numbers into the `rubricScores` field of the
 * matching row in `evals/results/bakeoff-latest.json`.
 *
 *   npx tsx evals/judge.ts
 *
 * Rules this script exists to keep:
 *
 * 1. **A score exists only if someone measured it.** Nothing here invents a
 *    number. A row with no transcript keeps `rubricScores: null`.
 * 2. **No model judges itself.** `judgeFor()` returns the default judge, and
 *    swaps to the alternate for the one row whose model IS the judge.
 * 3. **The judge is blind.** It sees one reply, labelled, and never a model
 *    name, so it scores the writing rather than the brand.
 * 4. **The two files must come from the same run.** A transcript whose commit
 *    or prompt hash disagrees with the published artifact would score the
 *    wrong replies into the right-looking rows, so the script refuses.
 * 5. A judge score is a judgement, not a measurement. It is published beside
 *    the cost and latency numbers, labelled, and never merged into them.
 *
 * Built with `generateText` plus `Output.object`: `generateObject` is
 * deprecated in ai@6.0.282. No tools are ever attached (`result.output` throws
 * when a step ends in a tool call), a timeout is always passed, and
 * `NoOutputGeneratedError.isInstance` guards the read.
 *
 * Needs AI_GATEWAY_API_KEY in the environment (`vercel env pull .env.local`,
 * then `set -a; source .env.local; set +a`).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  gateway,
  generateText,
} from "ai";
import { z } from "zod";
import {
  EVAL_JUDGE_MAX_OUTPUT_TOKENS,
  EVAL_JUDGE_TIMEOUT_MS,
} from "../lib/chat-limits";
import { costUsd, tokenBreakdown } from "../lib/chat-metadata";
import { findModel } from "../lib/chat-models";
import {
  MAX_RUBRIC_SCORE,
  clampRubricScores,
  judgeFor,
  publishedEvalsSchema,
  rubricPrompt,
  type EvalRow,
  type RubricScores,
} from "../lib/evals";

if (!process.env.AI_GATEWAY_API_KEY) throw new Error("AI_GATEWAY_API_KEY is not set");

const RESULTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "results");
const LATEST_PATH = join(RESULTS_DIR, "bakeoff-latest.json");
const TRANSCRIPTS_PATH = join(RESULTS_DIR, "bakeoff-transcripts.json");

/** Only the fields this script reads. The writer owns the rest. */
const transcriptsSchema = z.object({
  gitSha: z.string().min(7),
  promptHash: z.string().nullable(),
  runs: z
    .array(
      z.object({
        modelId: z.string().min(1),
        turns: z.array(z.object({ user: z.string(), assistant: z.string() })).min(1),
      }),
    )
    .min(1),
});

/**
 * What the judge returns for one reply. Plain numbers and one short string:
 * `Output.object` is likelier to come back parseable without format keywords.
 */
const verdictSchema = z.object({
  consults: z.number().describe(`1 to ${MAX_RUBRIC_SCORE}: consults before it sells`),
  specific: z.number().describe(`1 to ${MAX_RUBRIC_SCORE}: specific and honest, names a first step`),
  human: z.number().describe(`1 to ${MAX_RUBRIC_SCORE}: sounds like a person, not a brochure`),
  grounded: z
    .number()
    .describe(`1 to ${MAX_RUBRIC_SCORE}: invents no price, partner, date, or course title`),
  forward: z.number().describe(`1 to ${MAX_RUBRIC_SCORE}: moves the conversation forward`),
  rationale: z.string().max(300).describe("One sentence on the score, under 35 words"),
});

function readJson(path: string, what: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    console.error(`Cannot read ${what} at ${path}. Run: npx tsx evals/bakeoff.ts --json <models>`);
    process.exit(1);
  }
}

/**
 * The script body lives in `main()` for one mechanical reason: neither
 * package.json declares `"type": "module"`, so `tsx` transforms these
 * files as CommonJS and a top-level `await` fails to compile. The personal
 * site's scripts are shaped the same way.
 */
async function main() {
  const published = publishedEvalsSchema.parse(readJson(LATEST_PATH, "the published artifact"));
  const transcripts = transcriptsSchema.parse(readJson(TRANSCRIPTS_PATH, "the transcripts"));

  if (transcripts.gitSha !== published.gitSha || transcripts.promptHash !== published.promptHash) {
    console.error(
      "The transcripts and the published artifact are from different runs (commit or prompt hash differ), so scoring them together would put the wrong numbers in the right-looking rows. Rerun the bake-off with --json first.",
    );
    process.exit(1);
  }

  const byModel = new Map(transcripts.runs.map((run) => [run.modelId, run]));

  let spentUsd = 0;
  const judgedBy = new Map<string, string>();
  const scored: EvalRow[] = [];

  for (const row of published.rows) {
    const run = byModel.get(row.modelId);
    if (!run) {
      console.log(`${row.modelId}  no transcript, leaving rubricScores null`);
      scored.push(row);
      continue;
    }
    // The last turn is the substantive one: the first is the opener.
    const reply = run.turns[run.turns.length - 1]?.assistant.trim() ?? "";
    if (!reply) {
      console.log(`${row.modelId}  empty reply, leaving rubricScores null`);
      scored.push(row);
      continue;
    }

    const judge = judgeFor([{ id: row.modelId }]);
    const prompt = [
      "You are scoring one reply from an AI consulting agent to a prospect.",
      "",
      `PROSPECT MESSAGE\n${run.turns[run.turns.length - 1]?.user ?? ""}`,
      "",
      `RUBRIC, score the reply 1 to ${MAX_RUBRIC_SCORE} on every line\n${rubricPrompt()}`,
      "",
      `REPLY\n${reply}`,
      "",
      "Score every line and give one sentence of rationale. Do not guess which model wrote this reply and do not mention model names.",
    ].join("\n");

    try {
      const result = await generateText({
        model: gateway(judge.id),
        prompt,
        maxOutputTokens: EVAL_JUDGE_MAX_OUTPUT_TOKENS,
        timeout: { totalMs: EVAL_JUDGE_TIMEOUT_MS },
        output: Output.object({ schema: verdictSchema }),
        providerOptions: {
          gateway: { tags: ["site:nexus", "feature:evals-judge", "env:script"] },
        },
      });
      const tokens = tokenBreakdown(result.usage);
      const judgeModel = findModel(judge.id);
      if (judgeModel) spentUsd += costUsd(judgeModel, tokens);

      const scores: RubricScores = clampRubricScores(result.output);
      judgedBy.set(row.modelId, judge.id);
      scored.push({ ...row, rubricScores: scores });
      console.log(
        `${row.modelId}  judged by ${judge.id}  ${Object.entries(scores)
          .map(([k, v]) => `${k} ${v}`)
          .join(" ")}  ${result.output.rationale.trim()}`,
      );
    } catch (err) {
      // No parseable object is the expected failure, and it arrives as either
      // of two errors: `NoOutputGeneratedError` when the step produced no text
      // at all, and `NoObjectGeneratedError` when text came back that did not
      // parse into the schema. A reasoning judge truncated at
      // `EVAL_JUDGE_MAX_OUTPUT_TOKENS` throws the second one, with
      // `finishReason: "length"`, which is exactly how this script failed
      // before the cap was raised. Either way the row keeps its null rather
      // than taking a made-up score, and the other rows still get scored.
      if (!NoOutputGeneratedError.isInstance(err) && !NoObjectGeneratedError.isInstance(err)) {
        throw err;
      }
      const why = NoObjectGeneratedError.isInstance(err) ? `${err.finishReason ?? "no object"}` : "no output";
      console.log(`${row.modelId}  judge returned no usable object (${why}), leaving rubricScores null`);
      scored.push(row);
    }
  }

  if (judgedBy.size === 0) {
    console.error("Nothing was scored, so nothing was written.");
    process.exit(1);
  }

  const judgeLine = [...judgedBy.entries()]
    .map(([modelId, judgeId]) => `${modelId} by ${judgeId}`)
    .join("; ");

  const JUDGEMENT_NOTE =
    "A judge score is a judgement, not a measurement. It sits beside the cost and latency numbers and is never merged into them.";

  const artifact = {
    ...published,
    rows: scored,
    // Rerunning the judge on the same bake-off replaces its own notes rather
    // than stacking a second set: the file must read as one run's provenance.
    notes: [
      ...published.notes.filter(
        (n) =>
          !n.startsWith("No judge model has scored") &&
          !n.startsWith("Scored ") &&
          n !== JUDGEMENT_NOTE,
      ),
      `Scored ${new Date().toISOString().slice(0, 10)} by evals/judge.ts, one reply at a time and blind: ${judgeLine}. No model scored its own reply.`,
      JUDGEMENT_NOTE,
    ],
  };

  const checked = publishedEvalsSchema.safeParse(artifact);
  if (!checked.success) {
    console.error("Refusing to write: the artifact does not match publishedEvalsSchema.");
    console.error(checked.error.issues);
    process.exit(1);
  }

  writeFileSync(LATEST_PATH, `${JSON.stringify(checked.data, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${LATEST_PATH}`);
  console.log(`Judge cost: $${spentUsd.toFixed(4)}`);

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
