/**
 * Model bake-off for the AI Consultant.
 *
 * Runs the same multi-turn prospect conversation through the REAL system prompt
 * on each candidate model via Vercel AI Gateway, and prints time to first token,
 * total latency, token usage, cost, and the replies.
 *
 * The prompt is rendered `nexusChatSystem({ emailEnabled: false })`, which is
 * what `renderedPrompt()` passes in production. Rendering it the other way
 * measures a prompt the site never sends, and every published `promptHash`
 * would be wrong.
 *
 * This is the smallest useful evaluation: read the answers side by side and
 * judge them against the rubric below. It is also a demo asset, since it shows
 * a customer exactly how a model decision gets made.
 *
 *   npx tsx evals/bakeoff.ts anthropic/claude-opus-5 anthropic/claude-sonnet-5
 *   npx tsx evals/bakeoff.ts --json anthropic/claude-opus-5 anthropic/claude-sonnet-5
 *
 * Without `--json` it prints for a human and writes nothing. With it, the run
 * is published: `evals/results/bakeoff-latest.json` (what the site renders) and
 * `evals/results/bakeoff-transcripts.json` (the replies, for `judge.ts` and for
 * a human read). A score is never written here: `rubricScores` is null until
 * `judge.ts` measures it.
 *
 * Needs AI_GATEWAY_API_KEY in the environment (`vercel env pull .env.local`,
 * then `set -a; source .env.local; set +a`).
 *
 * Rubric (score each reply 1 to 5):
 *   1. Consults before it sells: asks what the team does, gives guidance first.
 *   2. Specific and honest: names a first step, trade-offs, realistic effort.
 *   3. Sounds like a person: reacts to what was said, one question at a time.
 *   4. Grounded: never invents prices, partners, dates, or workshop titles.
 *   5. Moves forward naturally: the next step and the chips fit the moment.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nexusChatSystem } from "../lib/assistant";
import { CHAT_MODELS } from "../lib/chat-models";
import { publishedEvalsSchema, type EvalRow } from "../lib/evals";

const KEY = process.env.AI_GATEWAY_API_KEY;
if (!KEY) throw new Error("AI_GATEWAY_API_KEY is not set");

const argv = process.argv.slice(2);
const PUBLISH = argv.includes("--json");
const MODELS = argv.filter((a) => a !== "--json");
if (MODELS.length === 0) throw new Error("Pass one or more gateway model slugs");

/** The cap every turn runs under, and the number the published shape reports. */
const MAX_OUTPUT_TOKENS = 2500;

/** The published `shape` fields, so the artifact describes the run it came from. */
const SCENARIO =
  "A 40-person logistics company asks whether to build retrieval over its SOPs or fine-tune a model, in two turns";
const PROMPT_CALL = "nexusChatSystem({ emailEnabled: false })";

const RESULTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "results");
const LATEST_PATH = join(RESULTS_DIR, "bakeoff-latest.json");
const TRANSCRIPTS_PATH = join(RESULTS_DIR, "bakeoff-transcripts.json");

/**
 * Provenance is measured, never guessed. With no git and no Vercel commit in
 * the environment the run is printed and nothing is written: an artifact that
 * cannot say which commit produced it is worse than no artifact.
 */
function gitSha(): string {
  const fromCi = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromCi && fromCi.length >= 7) return fromCi;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    console.error(
      "Cannot read a commit sha from git or VERCEL_GIT_COMMIT_SHA, so nothing was written. Run this inside the repo, or set VERCEL_GIT_COMMIT_SHA.",
    );
    process.exit(1);
  }
}

/**
 * The one-line human read of each model's answers. A script cannot measure it,
 * so a rerun carries forward whatever the published file already says for that
 * model and flags a model nobody has read yet. Never invents a read.
 */
function previousReads(): Map<string, string> {
  const reads = new Map<string, string>();
  try {
    const raw: unknown = JSON.parse(readFileSync(LATEST_PATH, "utf8"));
    const rows = (raw as { rows?: unknown }).rows;
    if (!Array.isArray(rows)) return reads;
    for (const row of rows) {
      const r = row as { modelId?: unknown; read?: unknown };
      if (typeof r.modelId === "string" && typeof r.read === "string" && r.read.trim()) {
        reads.set(r.modelId, r.read);
      }
    }
  } catch {
    /* no readable artifact yet: every row gets the unread placeholder */
  }
  return reads;
}

const UNREAD = "Not read yet. Replace this line with the one-line human read before publishing";

/**
 * Prices come from lib/chat-models.ts so the page, the widget, and this eval
 * agree. A model outside the picker allowlist still runs, at $0 (reported as
 * "unpriced" in the output).
 */
function priceFor(model: string): [input: number, output: number] | null {
  const m = CHAT_MODELS.find((c) => c.id === model);
  return m ? [m.inputPerM, m.outputPerM] : null;
}

/** A realistic prospect: opens with a symptom, then asks the real question. */
const TURNS = [
  "hi, we run a 40-person logistics company in Utah. our ops team keeps asking chatgpt questions about our own SOPs and getting wrong answers.",
  "should we build a RAG chatbot over our SOP docs or fine-tune a model? what would you actually do first, and what would it cost us in effort?",
];

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function complete(model: string, messages: Msg[]) {
  const t0 = Date.now();
  const res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`${model}: HTTP ${res.status} ${await res.text()}`);

  let text = "";
  let ttft: number | null = null;
  let usage: { prompt_tokens?: number; completion_tokens?: number } = {};
  // The provider can end a stream in an error after billing real tokens, and
  // it says so here rather than in the HTTP status, which was 200 long before.
  let finishReason: string | null = null;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let chunk: {
        usage?: typeof usage;
        choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
      };
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }
      if (chunk.usage) usage = chunk.usage;
      if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        if (ttft === null) ttft = Date.now() - t0;
        text += delta;
      }
    }
  }
  return { text, ttft, total: Date.now() - t0, usage, finishReason };
}

/**
 * One attempt is not a measurement when the provider can fail mid-stream.
 *
 * Measured 2026-09-13: `google/gemini-3.8-flash` ended its second turn with
 * `finish_reason: "error"` after 763 reasoning tokens and zero text, twice in
 * a row. The old loop read only `delta.content`, so an errored stream reached
 * the artifact as a reply of length zero, priced and timed like any other row.
 * A published table that cannot tell a bad answer from no answer is worse than
 * no table. So: retry once, and if the stream still ends in anything but a
 * clean stop or a length cutoff, or still carries no text, stop the whole run
 * and say which model failed. A human decides whether to publish without it.
 */
async function completeOrFail(model: string, messages: Msg[]) {
  const attempts: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const r = await complete(model, messages);
    const clean = r.finishReason === null || r.finishReason === "stop" || r.finishReason === "length";
    if (clean && r.text.trim()) return r;
    attempts.push(`attempt ${attempt}: finish_reason ${r.finishReason ?? "none"}, ${r.text.length} chars`);
    if (attempt === 1) console.log(`  ${model}: ${attempts[0]}, retrying once`);
  }
  throw new Error(
    `${model} did not return a usable reply (${attempts.join("; ")}). Nothing was written. Rerun, or rerun without this model and say on the page that it is missing.`,
  );
}

/** The system prompt exactly as production renders it, hashed once. */
const SYSTEM = nexusChatSystem({ emailEnabled: false });
const PROMPT_HASH = createHash("sha256").update(SYSTEM).digest("hex");

type Measured = {
  modelId: string;
  label: string;
  costUsd: number;
  priced: boolean;
  ttftMs: number | null;
  turns: { user: string; assistant: string; inTokens: number; outTokens: number; ttftMs: number | null; totalMs: number }[];
};

/**
 * The script body lives in `main()` for one mechanical reason: neither
 * package.json declares `"type": "module"`, so `tsx` transforms these
 * files as CommonJS and a top-level `await` fails to compile. The personal
 * site's scripts are shaped the same way. Keep it, or the command this
 * file's own header documents stops working.
 */
async function main() {
  const measured: Measured[] = [];

  for (const model of MODELS) {
    console.log("=".repeat(100));
    console.log(`MODEL: ${model}`);
    const history: Msg[] = [{ role: "system", content: SYSTEM }];
    let cost = 0;
    const price = priceFor(model);
    const [pin, pout] = price ?? [0, 0];
    if (!price) console.log("(unpriced: not in lib/chat-models.ts; cost shown as $0)");
    const row: Measured = {
      modelId: model,
      label: CHAT_MODELS.find((m) => m.id === model)?.label ?? model,
      costUsd: 0,
      priced: price !== null,
      ttftMs: null,
      turns: [],
    };
    for (const [i, turn] of TURNS.entries()) {
      history.push({ role: "user", content: turn });
      const r = await completeOrFail(model, history);
      history.push({ role: "assistant", content: r.text });
      const inTok = r.usage.prompt_tokens ?? 0;
      const outTok = r.usage.completion_tokens ?? 0;
      const turnCost = (inTok * pin + outTok * pout) / 1e6;
      cost += turnCost;
      if (i === 0) row.ttftMs = r.ttft;
      row.turns.push({
        user: turn,
        assistant: r.text.trim(),
        inTokens: inTok,
        outTokens: outTok,
        ttftMs: r.ttft,
        totalMs: r.total,
      });
      console.log(
        `--- turn ${i + 1} | TTFT ${r.ttft === null ? "n/a" : (r.ttft / 1000).toFixed(2)}s | total ${(r.total / 1000).toFixed(1)}s | in ${inTok} out ${outTok} | $${turnCost.toFixed(4)}`,
      );
      console.log(r.text.trim());
    }
    row.costUsd = Math.round(cost * 1e6) / 1e6;
    measured.push(row);
    console.log(`--- conversation cost: $${cost.toFixed(4)}`);
  }

  if (!PUBLISH) {
    console.log("\nPrinted only. Pass --json to publish this run to evals/results/.");
  } else {
    const sha = gitSha();
    const reads = previousReads();
    const rows: EvalRow[] = measured.map((m) => ({
      modelId: m.modelId,
      label: m.label,
      // An unpriced model is not in the picker's price table, so its cost was
      // not measured. Null says that; zero would read as free.
      costUsd: m.priced ? m.costUsd : null,
      // Summed from the per-turn token counts the gateway reported, not from
      // rounded printout, so this run is exact.
      approximate: false,
      ttftMs: m.ttftMs,
      read: reads.get(m.modelId) ?? UNREAD,
      // A score exists only if someone measured it. judge.ts fills these in.
      rubricScores: null,
    }));
    const ran = new Set(rows.map((r) => r.modelId));
    const artifact = {
      schemaVersion: 1 as const,
      measuredAt: new Date().toISOString().slice(0, 10),
      gitSha: sha,
      promptHash: PROMPT_HASH,
      shape: {
        turns: TURNS.length,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        promptCall: PROMPT_CALL,
        scenario: SCENARIO,
      },
      rows,
      unscored: CHAT_MODELS.filter((m) => !ran.has(m.id)).map((m) => ({
        modelId: m.id,
        why: "In the picker, and not part of this run",
      })),
      notes: [
        `Cost is the sum of ${TURNS.length} turns, priced from CHAT_MODELS in lib/chat-models.ts, the same table the picker and /how-it-works use.`,
        "Time to first token is the first turn, on a cold prompt cache.",
        `The prompt was rendered ${PROMPT_CALL}, which is how the chat route renders it in production. promptHash is the sha256 of that exact text.`,
        "No judge model has scored this run yet, so every rubricScores field is null rather than a plausible number. Run evals/judge.ts to fill them in.",
        rows.some((r) => r.read === UNREAD)
          ? "At least one row has no human read yet and says so. Replace that line before publishing the page."
          : "The read column is the human read carried forward from the previous published run.",
      ],
    };

    // Never write a file the site cannot parse: lib/evals.ts parses this at
    // module load, so a bad artifact would break the build, not just the page.
    const checked = publishedEvalsSchema.safeParse(artifact);
    if (!checked.success) {
      console.error("Refusing to write: the artifact does not match publishedEvalsSchema.");
      console.error(checked.error.issues);
      process.exit(1);
    }

    mkdirSync(RESULTS_DIR, { recursive: true });
    writeFileSync(LATEST_PATH, `${JSON.stringify(checked.data, null, 2)}\n`, "utf8");
    writeFileSync(
      TRANSCRIPTS_PATH,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          measuredAt: artifact.measuredAt,
          gitSha: sha,
          promptHash: PROMPT_HASH,
          shape: artifact.shape,
          // The replies live here and nowhere else: a page imports
          // bakeoff-latest.json, so that file stays small and holds only what a
          // visitor sees.
          runs: measured.map((m) => ({ modelId: m.modelId, label: m.label, turns: m.turns })),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`\nWrote ${LATEST_PATH}`);
    console.log(`Wrote ${TRANSCRIPTS_PATH}`);
    console.log("Scores are null until you run: npx tsx evals/judge.ts");
  }

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
