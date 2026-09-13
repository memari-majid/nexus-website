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
 *
 * Needs AI_GATEWAY_API_KEY in the environment (`vercel env pull .env.local`,
 * then `set -a; source .env.local; set +a`).
 */
import { gateway, generateText } from "ai";
import { nexusChatSystem } from "../lib/assistant";
import { CHAT_MODELS } from "../lib/chat-models";
import { chatTools } from "../lib/chat-tools";

const KEY = process.env.AI_GATEWAY_API_KEY;
if (!KEY) throw new Error("AI_GATEWAY_API_KEY is not set");

const ids = process.argv.slice(2).length ? process.argv.slice(2) : CHAT_MODELS.map((m) => m.id);

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
        console.log(`${id}  ${toolName}  NO CALL  ${ms}ms  finish=${r.finishReason}`);
        continue;
      }
      const keys = Object.keys(call.input as Record<string, unknown>).join(",");
      const tokens = r.usage.totalTokens ?? 0;
      console.log(`${id}  ${toolName}  ok  ${ms}ms  ${tokens} tokens  input keys: ${keys}`);
    } catch (err) {
      failures += 1;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`${id}  ${toolName}  FAILED  ${msg.slice(0, 300)}`);
    }
  }
}
console.log(failures === 0 ? "all tool schemas accepted" : `${failures} failure(s)`);
process.exitCode = failures === 0 ? 0 : 1;
