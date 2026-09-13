/**
 * Tool-schema smoke test across the picker models.
 *
 * zod 4 turns `.email()` into `format: "email"` plus a lookahead `pattern`,
 * which some function-schema validators reject, and each vendor validates
 * function schemas differently. This forces one `assessReadiness` and one
 * `draftConsultingBrief` call per model with the FULL tool set attached, so
 * every schema is sent and validated on every model. The email tools are
 * never forced and never execute (they also need on-screen approval).
 *
 *   npx tsx evals/tool-smoke.ts                       # every picker model
 *   npx tsx evals/tool-smoke.ts anthropic/claude-sonnet-5
 *   npx tsx evals/tool-smoke.ts --json                # also publish the result
 *
 * Without `--json` it prints and writes nothing. With it, the run is written to
 * `evals/results/tool-smoke-latest.json`: per model, per forced tool, whether
 * the schema was accepted and whether the call came back. Nothing on the site
 * imports that file; it is the record that the schemas were exercised.
 *
 * Needs AI_GATEWAY_API_KEY in the environment (`vercel env pull .env.local`,
 * then `set -a; source .env.local; set +a`).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gateway, generateText } from "ai";
import { nexusChatSystem } from "../lib/assistant";
import { CHAT_MODELS } from "../lib/chat-models";
import { chatTools } from "../lib/chat-tools";

const KEY = process.env.AI_GATEWAY_API_KEY;
if (!KEY) throw new Error("AI_GATEWAY_API_KEY is not set");

const argv = process.argv.slice(2);
const PUBLISH = argv.includes("--json");
const named = argv.filter((a) => a !== "--json");
const ids = named.length ? named : CHAT_MODELS.map((m) => m.id);

const RESULTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "results",
  "tool-smoke-latest.json",
);

/** Provenance is measured, never guessed, exactly as in bakeoff.ts. */
function gitSha(): string {
  const fromCi = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromCi && fromCi.length >= 7) return fromCi;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    console.error(
      "Cannot read a commit sha from git or VERCEL_GIT_COMMIT_SHA, so nothing was written.",
    );
    process.exit(1);
  }
}

type Result = {
  modelId: string;
  toolName: string;
  outcome: "ok" | "no-call" | "failed";
  ms: number;
  inputKeys: string[];
  detail: string;
};

/**
 * The script body lives in `main()` for one mechanical reason: neither
 * package.json declares `"type": "module"`, so `tsx` transforms these
 * files as CommonJS and a top-level `await` fails to compile. The personal
 * site's scripts are shaped the same way.
 */
async function main() {
  const results: Result[] = [];

  /** Enough context for a grounded brief and snapshot in one shot. */
  const PROMPT =
    "We are a 40-person logistics company in Utah. Our ops team keeps asking ChatGPT about our own SOPs and getting wrong answers. The SOPs live in about 300 Word docs on SharePoint, one ops manager owns them, and we have two developers who know Python. Leadership wants something in a quarter. Please structure this.";

  const FORCED = ["assessReadiness", "draftConsultingBrief"] as const;

  let failures = 0;
  for (const id of ids) {
    for (const toolName of FORCED) {
      const t0 = Date.now();
      try {
        const r = await generateText({
          model: gateway(id),
          system: nexusChatSystem(),
          prompt: PROMPT,
          tools: chatTools,
          toolChoice: { type: "tool", toolName },
          maxOutputTokens: 2500,
          experimental_context: { ip: "eval" },
        });
        const call = r.toolCalls.find((c) => c.toolName === toolName);
        const ms = Date.now() - t0;
        if (!call) {
          failures += 1;
          results.push({
            modelId: id,
            toolName,
            outcome: "no-call",
            ms,
            inputKeys: [],
            detail: `finish=${r.finishReason}`,
          });
          console.log(`${id}  ${toolName}  NO CALL  ${ms}ms  finish=${r.finishReason}`);
          continue;
        }
        const inputKeys = Object.keys(call.input as Record<string, unknown>);
        const tokens = r.usage.totalTokens ?? 0;
        results.push({
          modelId: id,
          toolName,
          outcome: "ok",
          ms,
          inputKeys,
          detail: `${tokens} tokens`,
        });
        console.log(
          `${id}  ${toolName}  ok  ${ms}ms  ${tokens} tokens  input keys: ${inputKeys.join(",")}`,
        );
      } catch (err) {
        failures += 1;
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          modelId: id,
          toolName,
          outcome: "failed",
          ms: Date.now() - t0,
          inputKeys: [],
          detail: msg.slice(0, 300),
        });
        console.log(`${id}  ${toolName}  FAILED  ${msg.slice(0, 300)}`);
      }
    }
  }
  console.log(failures === 0 ? "all tool schemas accepted" : `${failures} failure(s)`);

  if (PUBLISH) {
    mkdirSync(dirname(RESULTS_PATH), { recursive: true });
    writeFileSync(
      RESULTS_PATH,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          measuredAt: new Date().toISOString().slice(0, 10),
          gitSha: gitSha(),
          forced: FORCED,
          // Every schema in `chatTools` was sent to every model, whether or not
          // it was the forced one, so this records what the run covered.
          toolsAttached: Object.keys(chatTools),
          results,
          failures,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(`Wrote ${RESULTS_PATH}`);
  }

  process.exitCode = failures === 0 ? 0 : 1;

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
