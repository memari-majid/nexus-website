# Evals for Dr. MJ

Two scripts, both run against the real system prompt through Vercel AI Gateway.
The public write-up of these results lives at `/how-it-works`.

## Setup

```bash
vercel env pull .env.local            # once; provides AI_GATEWAY_API_KEY
set -a; source .env.local; set +a
```

## bakeoff.ts: which model should answer

Runs one realistic two-turn prospect conversation (a 40-person logistics company
asking whether to build RAG over its SOPs or fine-tune) through `nexusChatSystem()`
on every gateway model you name, and prints time to first token, total latency,
tokens, cost, and the replies for side-by-side judging against the rubric in the
file header: consults before it sells; specific and honest; sounds like a person;
grounded; moves forward naturally. Prices come from `CHAT_MODELS` in
`lib/chat-models.ts`, the same table behind the widget picker and `/how-it-works`,
so the three cannot drift.

```bash
npx tsx evals/bakeoff.ts anthropic/claude-opus-5 anthropic/claude-sonnet-5 openai/gpt-5.6-sol google/gemini-3.8-flash
```

Result on 2026-09-12 (two turns, real prompt):

| Model | Cost per conversation | Read |
|---|---|---|
| `anthropic/claude-opus-5` | about $0.08 | Most human, most specific consulting answer. Production default |
| `anthropic/claude-sonnet-5` | about $0.03 | Fastest (1.3 s to first token), nearly as good. Budget fallback |
| `openai/gpt-5.6-sol` | about $0.02 | Correct but terse |
| `openai/gpt-oss-20b` | | Generic. The previous production model |

`google/gemini-3.8-flash` is in the picker as the low-price option and has not
been scored on this rubric yet. Rerun the bake-off before changing the default.

## tool-smoke.ts: do the tool schemas work on every picker model

Forces one `assessReadiness` and one `draftConsultingBrief` call per picker model
(`toolChoice: { type: "tool", toolName }` with `generateText`), with the full
`chatTools` set attached so every schema is sent to every provider. No email tool
is ever executed. Run it after any change to a tool's input schema: zod features
such as `.email()` or regex patterns compile to JSON Schema keywords that some
providers reject, which is why email addresses are plain strings validated inside
`execute`.

```bash
npx tsx evals/tool-smoke.ts
```

## Usage logs

Every `/api/chat` request logs one JSON line (`event: "chat.usage"`) from
`app/api/chat/route.ts`: the model that answered, whether the budget fallback
kicked in, the token breakdown (input, cache read, cache write, output,
reasoning), cost, step and tool-call counts, and the finish reason. Filter Vercel
logs on `chat.usage` to chart cost per conversation. The same numbers reach the
visitor as the stats row under each reply.
