/**
 * Model bake-off for Nex, the consulting assistant.
 *
 * Runs the same multi-turn prospect conversation through the REAL system prompt
 * (`nexusChatSystem()`) on each candidate model via Vercel AI Gateway, and prints
 * time to first token, total latency, token usage, cost, and the replies.
 *
 * This is the smallest useful evaluation: read the answers side by side and
 * judge them against the rubric below. It is also a demo asset, since it shows
 * a customer exactly how a model decision gets made.
 *
 *   npx tsx evals/bakeoff.ts anthropic/claude-opus-5 anthropic/claude-sonnet-5 openai/gpt-5.6-sol
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
import { nexusChatSystem } from "../lib/assistant";

const KEY = process.env.AI_GATEWAY_API_KEY;
if (!KEY) throw new Error("AI_GATEWAY_API_KEY is not set");

const MODELS = process.argv.slice(2);
if (MODELS.length === 0) throw new Error("Pass one or more gateway model slugs");

/** Gateway list prices, $/1M tokens, 2026-09-12. Update when the gateway changes them. */
const PRICES: Record<string, [input: number, output: number]> = {
  "anthropic/claude-opus-5": [5, 25],
  "anthropic/claude-sonnet-5": [2, 10],
  "anthropic/claude-fable-5.1": [10, 50],
  "openai/gpt-5.6-sol": [2, 10],
  "openai/gpt-5.6-terra": [2, 12],
  "openai/gpt-oss-20b": [0.05, 0.2],
};

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
      max_tokens: 2500,
      stream: true,
      stream_options: { include_usage: true },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`${model}: HTTP ${res.status} ${await res.text()}`);

  let text = "";
  let ttft: number | null = null;
  let usage: { prompt_tokens?: number; completion_tokens?: number } = {};
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
      let chunk: { usage?: typeof usage; choices?: { delta?: { content?: string } }[] };
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }
      if (chunk.usage) usage = chunk.usage;
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        if (ttft === null) ttft = Date.now() - t0;
        text += delta;
      }
    }
  }
  return { text, ttft, total: Date.now() - t0, usage };
}

for (const model of MODELS) {
  console.log("=".repeat(100));
  console.log(`MODEL: ${model}`);
  const history: Msg[] = [{ role: "system", content: nexusChatSystem() }];
  let cost = 0;
  const [pin, pout] = PRICES[model] ?? [0, 0];
  for (const [i, turn] of TURNS.entries()) {
    history.push({ role: "user", content: turn });
    const r = await complete(model, history);
    history.push({ role: "assistant", content: r.text });
    const inTok = r.usage.prompt_tokens ?? 0;
    const outTok = r.usage.completion_tokens ?? 0;
    const turnCost = (inTok * pin + outTok * pout) / 1e6;
    cost += turnCost;
    console.log(
      `--- turn ${i + 1} | TTFT ${r.ttft === null ? "n/a" : (r.ttft / 1000).toFixed(2)}s | total ${(r.total / 1000).toFixed(1)}s | in ${inTok} out ${outTok} | $${turnCost.toFixed(4)}`,
    );
    console.log(r.text.trim());
  }
  console.log(`--- conversation cost: $${cost.toFixed(4)}`);
}
