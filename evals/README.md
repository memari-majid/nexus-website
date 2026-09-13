# Evals for the AI Consultant

Three scripts, all run against the real system prompt through Vercel AI Gateway.
The public write-up lives at `/how-it-works`, and every number it shows is read
from an artifact in `evals/results/`, never from a table someone typed.

**The rule the section rests on: a score exists only if someone measured it.**
Do not hand-edit a cell in an artifact, do not copy a number from a vendor page,
and do not publish a model row that has not been through one of these scripts.

## Setup

```bash
vercel env pull .env.local            # once; provides AI_GATEWAY_API_KEY
set -a; source .env.local; set +a
```

`tsx` is not a dependency of this repo, so every script runs through `npx tsx`
and needs network access to fetch it. That is deliberate: the artifacts are
committed, so the build, the page, and any locked-down CI step never depend on
running a model. Note that `evals/**` is still typechecked by `next build`
(`tsconfig.json` has no `evals` exclusion), so a type error in a script here
breaks the site build even though nothing imports it.

## Artifacts

Everything published lives in `evals/results/`, and one file is the whole public
surface: `bakeoff-latest.json`. `lib/evals.ts` imports it, `lib/evals.test.ts`
guards its schema, and the evaluations panel on `/how-it-works` renders it.

| File | Written by | Holds |
|---|---|---|
| `evals/results/bakeoff-latest.json` | `bakeoff.ts --json`, then `judge.ts` for the scores | The published rows: `schemaVersion`, `measuredAt`, `gitSha`, `promptHash`, the `shape` of the run, one row per model (cost, time to first token, the human `read`, `rubricScores`), an `unscored` list, and `notes` |
| `evals/results/bakeoff-transcripts.json` | `bakeoff.ts --json` | The replies from the same run, for the judge and for a human read. Never imported by the app |
| `evals/results/tool-smoke-latest.json` | `tool-smoke.ts --json` | Per model, per tool: did the schema compile and did the call come back |

Without `--json` a script prints for a human and writes nothing. Each file
appears, and is committed, the first time its script is run with `--json`, and
`judge.ts` refuses to score unless the transcripts and the published artifact
carry the same `gitSha` and `promptHash`, so the scores can only ever describe
the replies on disk next to them.

Rules these files are held to:

- **A field that was not measured is `null`, never a plausible number.** A row
  with `rubricScores: null` has not been through `judge.ts`, and the page says so
  instead of showing a five. Read the artifact, not this file, for what is scored
  right now: it is the only thing the page renders.
- **`gitSha` is measured, not guessed.** Read from `git rev-parse HEAD`, or from
  `VERCEL_GIT_COMMIT_SHA` when git is not available. With neither, the script
  exits rather than writing a file with invented provenance.
- **`promptHash` identifies the exact prompt the run saw.** The `--json` writer
  records the sha256 of the rendered prompt, and `lib/evals.test.ts` compares a
  non-null hash against the prompt the site ships on every test run. A failure
  there means the table describes a prompt production no longer sends: rerun the
  bake-off, do not edit the hash.
- **`bakeoff-latest.json` carries no transcripts.** A page imports it, so it
  stays small and holds only what a visitor sees. Replies go to the transcript
  file and to the terminal.
- **The `read` column is human, so the script never writes one.** A rerun carries
  each model's existing one-line read forward from the published file. A model
  with no read yet gets a placeholder that says so, and it is your job to
  replace that line before the page ships.
- **A rerun resets every `rubricScores` to null.** New replies were not judged,
  so the old scores do not describe them. Run `judge.ts` again after a bake-off.
- **Never hand-edit a score, a cost, or a latency.** Rerun the script.

## bakeoff.ts: which model should answer

Runs one realistic two-turn prospect conversation (a 40-person logistics company
asking whether to build RAG over its SOPs or fine-tune) through the real chat
prompt on every gateway model you name, at a 2500 token answer cap, and reports
time to first token, total latency, tokens, cost, and the replies for
side-by-side judging against `EVAL_RUBRIC` in `lib/evals.ts`, the same five
criteria the panel renders: consults before it sells; specific and honest;
sounds like a person; grounded; moves the conversation forward. Prices come from
`CHAT_MODELS` in `lib/chat-models.ts`, the same table behind the widget picker
and `/how-it-works`, so the three cannot drift.

```bash
npx tsx evals/bakeoff.ts --json anthropic/claude-opus-5 anthropic/claude-sonnet-5 openai/gpt-5.6-sol google/gemini-3.8-flash
```

**It renders the prompt the way production renders it:**
`nexusChatSystem({ emailEnabled: false })`, matching what `renderedPrompt()`
passes in the chat route. With the default `emailEnabled: true` the run measures a
prompt the site never sends and every published `promptHash` is wrong.

**Current results are not repeated here.** Read
`evals/results/bakeoff-latest.json`, or the table on
[`/how-it-works`](https://nexusaisolution.net/how-it-works), which renders that
same file. Rerun the bake-off, commit the artifact, and check the page before
changing the default model.

## judge.ts: score the replies with a model that has no stake

Reads the replies from the last bake-off run and scores each one against
`EVAL_RUBRIC` in `lib/evals.ts`, the same five criteria the panel renders, then
writes those scores into the `rubricScores` field of the matching row in
`evals/results/bakeoff-latest.json`.

```bash
npx tsx evals/judge.ts
```

- **No model judges itself.** The judge is `EVAL_JUDGE_MODEL_ID` in
  `lib/chat-limits.ts` (`google/gemini-3.8-flash`: the cheapest seat at the table
  and never the production default), and it swaps to `EVAL_JUDGE_ALT_MODEL_ID`
  (`anthropic/claude-sonnet-5`) for the one row whose model is the judge, so no
  reply is ever scored by the model that wrote it. Record which model scored a
  run next to the scores.
- Built with `generateText` plus `Output.object`, because `generateObject` is
  deprecated in `ai@6.0.282`. No tools are ever attached to the judge, a timeout
  is always passed, and `NoOutputGeneratedError.isInstance(err)` guards the read
  of `result.output`: a step that ends in tool calls or produces no text throws
  there rather than returning a score.
- A judge score is a judgement, not a measurement. It is published beside the
  latency and cost numbers, labelled, and never merged into them.

## tool-smoke.ts: do the tool schemas work on every picker model

Forces one `assessReadiness` and one `draftConsultingBrief` call per picker model
(`toolChoice: { type: "tool", toolName }` with `generateText`), with the full
`chatTools` set attached so all ten schemas are sent to every provider. No email
tool is ever executed, and the non-sending tools that do run are called with
`experimental_context: { ip: "eval" }` so their limiter counters stay out of the
real per-visitor keys. Run it after any change to a tool's input schema: zod
features such as `.email()` or regex patterns compile to JSON Schema keywords
that some providers reject, which is why email addresses are plain strings
validated inside `execute`.

```bash
npx tsx evals/tool-smoke.ts --json
```

## The live scored run a visitor can start

`/how-it-works` can run a small, honest evaluation on demand through
`app/api/evals/run/route.ts`: two picker models the visitor chooses, one turn at
`EVAL_MAX_OUTPUT_TOKENS` (600), streamed back as NDJSON progress frames parsed by
`parseEvalFrame` in `lib/evals.ts` (never transcript parts: `sanitizeAssistantPart`
drops `data-*`, so a frame carried in the transcript would vanish on the next
turn), then scored by a judge that is never one of the two contestants.

It is a **different measurement** from the published table (one turn at 600
output tokens versus two turns at 2500), so it appends its own block with its
shape labelled and never rewrites a published cell. That one discipline is what
keeps the section honest.

Caps, all of them in `lib/chat-limits.ts` unless noted:

- `EVAL_RUNS_PER_IP_PER_DAY` is 1, enforced by a counter in the limiter
  (`reserveEvalRun`) taken before any model is called, so a run that fails, times
  out, or is abandoned still uses the visitor's run for the day. The count is
  given back only when a budget refuses and nothing runs at all. In front of the
  counter sits the run cache: a second request the same UTC day usually replays
  the first run's result and spends nothing, which is a better answer than a
  refusal, but the counter is what holds the line.
- **An abandoned run settles upwards, never down.** Its prompts were already
  billed, so `topUpBudget` and `topUpEvalBudget` take it from the estimate, and
  neither counter is handed money back. `lib/evals-run-route.test.ts` asserts
  both the cap and this settlement.
- A `GLOBAL_EVAL_USD_PER_DAY` sub-budget inside the existing soft budget, and
  every model call still goes through `reserveBudget`, the only hard daily
  ceiling there is.
- Two bounded legs: `EVAL_CONTESTANT_TIMEOUT_MS` 40 s (both contestants run in
  parallel) and `EVAL_JUDGE_TIMEOUT_MS` 30 s, under `EVAL_MAX_DURATION_SECONDS`
  120, which is also the route's `maxDuration` in the `functions` map in
  `vercel.json`. The function cannot be killed with money reserved and
  unreconciled.
- No shared store, no run: without `KV_REST_API_URL` / `KV_REST_API_TOKEN` the
  route reports that it cannot meter a shared run and spends nothing.

## Usage logs

Every `/api/chat` request logs one JSON line (`event: "chat.usage"`) from
`app/api/chat/route.ts`: the model that answered, whether the budget fallback
kicked in, the token breakdown (input, cache read, cache write, output,
reasoning), cost, step and tool-call counts, and the finish reason. The eval
route logs its own line in the same shape. Filter Vercel logs on `chat.usage` to
chart cost per conversation. The same numbers reach the visitor as the stats row
under each reply.
