# Nexus AI Solutions — Company Website

Public website for **Nexus AI Solutions LLC**. The offer is **AI consulting and training** (advisory work, workshops, in-house sessions). Implementation is follow-on. Leadership: **Majid Memari, PhD** (Founder & CEO; **2026 AI Utah 100 honoree**), **Hamid Memari** (CTO), **Mohammad JN, PhD** (CFO).

Live at **[nexusaisolution.net](https://nexusaisolution.net)**

## For AI assistants

**How to update this site** (edit map, NVIDIA/DLI rules, naming, people, deploy): **[`AGENTS.md`](./AGENTS.md)**. Site-ops status: **[`docs/PLAN.md`](./docs/PLAN.md)**.

## Strategy alignment (internal ops repo)

Keep positioning and channel execution aligned with **`../contract/docs/reference/PLAN.md`** (especially **§11** and **§11.1**) and **`../contract/docs/reference/PLATFORM-PLAYBOOK.md`**. Canonical public copy: **`lib/site.ts`**, homepage **`#consulting` / `#training`**, and **`lib/faq.ts`**.

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript
- [Vercel AI SDK](https://sdk.vercel.ai/) through Vercel AI Gateway for the AI Consultant, the consulting agent (public teardown at [`/how-it-works`](https://nexusaisolution.net/how-it-works); evals and published results in `evals/`)
- Deployed on [Vercel](https://vercel.com)

## Theme & layout

- **Dark/light:** `next-themes` with Tailwind v4 class-based `dark:` (toggle in the nav). Default theme is dark.
- **Homepage:** Sparse Apple-like layout: hero + Consulting + **Try our AI** + Training + Team + footer. The "Try our AI" section carries the inline AI Consultant demo and is the one sanctioned addition (`AGENTS.md` §9.3). Depth on inner pages (`/nvidia-dli-workshops`, `/about`). No trailing periods in headlines.
- **Mobile:** Full-screen chat on small viewports; `overflow-x-hidden` on the shell.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (SEO, sitemap, JSON-LD). Default: `https://nexusaisolution.net` |
| `NEXT_PUBLIC_AI_CPA_URL` | Optional. Public URL for the AI financial assistant app (Try Our AI section). If unset, the section shows “Request access”. |
| `NEXT_PUBLIC_AI_TA_URL` | Optional. Public URL for the AI Entrepreneurship teaching assistant. If unset, the section shows “Request access”. |
| `AI_CHAT_MODEL` | Default model slug for `/api/chat` (Vercel AI Gateway). Production and code default: `anthropic/claude-opus-5` (chosen 2026-09-12 after a bake-off; see `evals/README.md` and `/how-it-works`). Must be one of the picker models in `lib/chat-models.ts`; any other slug is ignored with one warning at startup. Visitors can switch models in the widget. |
| `CONTACT_CLASSIFY_MODEL` | Optional. Model slug for contact inquiry classification + auto-reply via AI Gateway. Default: `anthropic/claude-haiku-4-5`. Not a picker model: it is deliberately a slug no visitor can select, so `lib/chat-models.ts` does not price it and `CONTACT_CLASSIFY_RATES` below does. |
| `CONTACT_CLASSIFY_RATES` | Optional. USD per 1M tokens for `CONTACT_CLASSIFY_MODEL`, written `input,output` (for example `1,5`). Precedence, highest first: **this variable**, then the `CONTACT_CLASSIFY_RATES` table in `lib/chat-limits.ts`, then the model's published price if the slug happens to be on the chat allowlist in `lib/chat-models.ts`, then `UNPRICED_MODEL_RATES` (Opus rates) with one warning at startup. Setting it wins even for an allowlisted slug, because that is what setting it means. One resolved pair prices all three of the reservation, the failure floor and the settle, so a post can never be reserved at one price and settled at another. A pair that is malformed, negative, non-finite, half empty, or free on both sides (`0,0`) is rejected and the next source down is used: a typo must not price a metered call at nothing. |
| `VOICE_CHAT_MODEL` | Optional. Model slug for `/api/voice/gather`. Defaults to `AI_CHAT_MODEL`. |
| `AI_GATEWAY_API_KEY` | Optional fallback for non-Vercel environments. On Vercel, OIDC auth is automatic after enabling AI Gateway in project settings. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio request signing. Required in production before the voice engine answers. |
| `TWILIO_PHONE_NUMBER` | Hidden Twilio number (E.164). **Not** the public Google Voice line. |
| `VOICE_WEBHOOK` | Public incoming Voice URL, e.g. `https://nexusaisolution.net/api/voice` |
| `RESEND_API_KEY` | Optional. With `RESEND_FROM_EMAIL` also set, the contact form and the chat email tools send through [Resend](https://resend.com). Missing either one, every chat email tool reports "not sent" and the AI Consultant points the visitor to the contact form. |
| `RESEND_FROM_EMAIL` | Verified sender on the Nexus domain in Resend (e.g. `Nexus AI Solutions <hello@nexusaisolution.net>`). Unset, Resend falls back to `onboarding@resend.dev`, which only delivers to the account owner, so the code treats email as not configured. |
| `CONTACT_TO_EMAIL` | Inbox for contact-form inquiries (default: `info@nexusaisolution.net`) |
| `WORKSHOP_TO_EMAIL` | Founder inbox for chat hand-offs, and the CC and reply-to on every visitor email (default: `memari.majid@hotmail.com`). `info@nexusaisolution.net` has no inbound mail, so never point replies there. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Optional. Upstash Redis REST from the Vercel Marketplace (no custom key prefix). Shares the chat rate limits and daily budgets across function instances. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are read as a fallback. Without either pair, limits are per warm instance and the live evaluation run on `/how-it-works` refuses to start, says so, and spends nothing. |

Without `RESEND_API_KEY`, contact submissions are logged on the server only—configure Resend for production email delivery.

**The contact classifier is metered like every other visitor-triggerable model call.** It lives in
`lib/inquiry-ai.ts` and is called from `lib/inquiry.ts`, not from a route, because two routes reach
it: `POST /api/contact` and `POST /api/voice/message`. Around that one call `submitInquiry` runs
`checkRequestRate`, reserves through `reserveBudget` before the model runs, and logs one
`contact.usage` line with a hashed IP and the rates the post was priced at. Every exit path settles.
A success settles at the real token counts; a call that reports no usage and a call that throws both
settle at a floor, the input tokens the prompt actually sent plus the whole output cap
(`contactClassifyFloorUsd`), because the tokens are billed whether or not the object validated and a
visitor who controls 4,000 characters of the prompt can choose to make the call fail. The name and
message the model reads are bounded (`CONTACT_CLASSIFY_NAME_CHARS`, `CONTACT_CLASSIFY_MESSAGE_CHARS`);
the inbox still receives the full text. When the visitor is over the per-minute rate, when the budget
refuses, or when the provider fails, the classifier is skipped and the inquiry still goes out with the
fixed acknowledgment: the email is the product and it costs no model money, so the cap belongs on the
model call, not on delivery. The chat hand-off (`source: "chat-handoff"`) never reaches the classifier
and is not metered here. There is no uncapped model call left on this site.

**Phone:** the published `(801) 810-9152` number is **Google Voice**. GV cannot hit Vercel. The AI engine is Twilio TwiML at `/api/voice`. Keep the GV number public and forward it to a hidden Twilio number — checklist in [`docs/PLAN.md`](docs/PLAN.md).

**AI Gateway setup:** in Vercel Dashboard go to **Project → AI Gateway** and enable the gateway. For local dev, run `vercel link` then `vercel env pull .env.local` to provision a short-lived `VERCEL_OIDC_TOKEN` (auto-refreshed on Vercel; valid ~24h locally). No provider-specific API keys are required.

### Owner checklist (AI Consultant agent)

Things only the owner can click. Numbered so code comments and plans can point at an item.

1. **Resend:** set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a verified sender on `nexusaisolution.net`) in Vercel production. Both are empty today, so every chat email tool reports "not sent" until then.
2. **Founder inbox:** keep `WORKSHOP_TO_EMAIL` on an inbox that receives mail (default `memari.majid@hotmail.com`). `info@nexusaisolution.net` has no inbound MX. Decide one of: set up inbound mail (MX records plus a mailbox) for `info@nexusaisolution.net`, or remove the `mailto:` links on `/contact` and in `ContactForm.tsx` so visitors are not sent to an address that bounces.
3. **Fluid compute:** this project has it on in `vercel.json`. Enable it on the personal site project (`majidmemari`) too so its chat route's `maxDuration = 180` applies.
4. **Upstash Redis:** add it from the Vercel Marketplace with **no custom prefix** so `KV_REST_API_URL` / `KV_REST_API_TOKEN` land in this project. Until then, limits and budgets are per warm instance.
5. **WAF:** keep the `/api/chat` WAF rule at or above 30 requests per minute per IP (see `docs/PLAN.md`) so the app's own limit, and its friendlier message, is what visitors hit first.
6. **Model allowlist:** `AI_CHAT_MODEL` must be one of the four picker models. Check the deploy log for the one-line warning if it is not.
7. **Budgets:** the per-visitor allowance, the soft budget, and the hard budget live in `lib/chat-limits.ts`. Review them against the AI Gateway spend page after the first week.
8. **Gateway usage mapping:** on the second turn of a real conversation, confirm one `chat.usage` log line shows cache read tokens, and that the logged cost matches the gateway's spend report.
9. **Tool smoke test:** run `evals/tool-smoke.ts --json` against all four picker models after any change to a tool schema, and commit the artifact it writes. All ten tools are sent to every provider on every run.
10. **Search Console:** request indexing for `/how-it-works`. The URL is unchanged, the title and the page now describe the AI Consultant.
11. **Evaluation budget:** live runs from `/how-it-works` draw on `GLOBAL_EVAL_USD_PER_DAY` inside the existing soft budget (`lib/chat-limits.ts`). Review it with the other budgets after the first week. Without Upstash there is no shared store, so the button refuses and spends nothing.
12. **Published scores:** `evals/results/bakeoff-latest.json` is what `/how-it-works` renders. Regenerate it with `npx tsx evals/bakeoff.ts --json` after a prompt change or a model swap, then `npx tsx evals/judge.ts` for the rubric scores, and never hand-edit a cell. A score exists only if someone measured it. The artifact's `promptHash` is the check: if it does not match the prompt the site renders today, the table describes a prompt nobody ships. Regenerate it; never edit the hash to match.
13. **Inline demo default:** the demo and the floating panel share one conversation and one model pick, so both open on the cheaper model and a first tap is inexpensive; the picker still offers all four. If the default changes, change the section copy, the `/how-it-works` model table, and `AGENTS.md` §9.3 with it.

### Deploy (Vercel)

Aligned with **Finance Hub** (`finhub`): same region (**`iad1`**) and explicit **`vercel-build`** in `package.json`.

1. **Import** this Git repo into Vercel (or link an existing **nexus-website** project).
2. **Root Directory:** leave **empty** (app lives at repo root — unlike `finhub`, which uses **`web/`**).
3. **Framework:** Next.js (auto). **Build Command:** default uses **`npm run vercel-build`** → **`npm run build`**.
4. **Environment variables:** Project → **Settings** → **Environment Variables** — set the table above for **Production** (and **Preview** if needed). Use **Shared Variable** on the team when the same value applies to multiple projects.
5. **Domain:** **Settings** → **Domains** — attach **nexusaisolution.net** / **www** per your DNS.
6. **CLI:** from **this repo root**, `npx vercel link` once, then `npx vercel deploy --prod` (same pattern as **ai-cpa**; **finhub** deploys from its monorepo root with Root Directory **`web`**).

Cross-repo checklist: **`~/Downloads/finhub/docs/deploy/VERCEL_TEAM_PATTERN.md`**.

### Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint

## Evaluations

`evals/` holds the measurement scripts and the checked-in results. The rule the whole
section rests on: **a score exists only if someone measured it.** Nothing on the site
quotes a number that is not in one of these artifacts.

| Script | Run it | Writes |
|---|---|---|
| `evals/bakeoff.ts` | `npx tsx evals/bakeoff.ts --json anthropic/claude-opus-5 anthropic/claude-sonnet-5 openai/gpt-5.6-sol google/gemini-3.8-flash` | `evals/results/bakeoff-latest.json` (published rows) and `evals/results/bakeoff-transcripts.json` (the replies) |
| `evals/judge.ts` | `npx tsx evals/judge.ts` | The `rubricScores` fields of `evals/results/bakeoff-latest.json` |
| `evals/tool-smoke.ts` | `npx tsx evals/tool-smoke.ts --json` | `evals/results/tool-smoke-latest.json` |

- **`--json` is what publishes.** Without the flag a script prints for a human and writes
  nothing. With it, the script writes its artifact under `evals/results/` and that file is
  the only thing the site reads. `lib/evals.ts` parses it; `EvalPanel` and `/how-it-works`
  render it.
- **`bakeoff-latest.json` carries no transcripts.** It is imported by a page, so it stays
  small and carries only what a visitor sees: one row per model with cost, time to first
  token, a one-line human read, and rubric scores once a judge has produced them, plus the
  shape of the run, its `gitSha`, and the `promptHash` of the prompt that produced it. The
  replies go to the transcript file and the terminal.
- **A field nobody measured is `null`, not a plausible number.** Every `rubricScores` is
  null today, and the page says so rather than showing a score. The one-line `read` is the
  exception that needs a human: `bakeoff.ts` writes "Not read yet..." for a model it has no
  previous read for, and `lib/evals.test.ts` fails on that placeholder, so the line has to be
  written by hand before the artifact is committed rather than shipped as filler.
- **`gitSha` is measured, not guessed.** Each artifact records the commit it ran against,
  read from `git rev-parse HEAD` or from `VERCEL_GIT_COMMIT_SHA`. If neither is available
  the script exits instead of writing a file with invented provenance.
- **The prompt is rendered the way production renders it.** `bakeoff.ts` calls
  `nexusChatSystem({ emailEnabled: false })` to match `renderedPrompt()`. Any other value
  makes the published `promptHash` describe a prompt the site never sends.
- **`npx tsx` is required and `tsx` is not a dependency here.** That is deliberate: the
  artifacts are committed so the build, the page, and CI never depend on running a model.
  `evals/**` is still typechecked by `next build`, so a type error in an eval script breaks
  the build even though nothing imports it.
- **The live scored run** on `/how-it-works` is a separate, smaller measurement: two
  visitor-picked contestants, one turn at 600 output tokens, and a judge model that is never
  one of the contestants. It appends its own block under the published table and never
  rewrites a published cell. The caps, the judge model, and the `GLOBAL_EVAL_USD_PER_DAY`
  sub-budget live in `lib/chat-limits.ts`; the route is `app/api/evals/run/route.ts` and
  every call still passes through `reserveBudget`, the only hard daily ceiling there is.
- **The per-visitor run cap is spent when a run starts.** `EVAL_RUNS_PER_IP_PER_DAY` is taken
  at reservation, before the first contestant call, and it stays taken whether the visitor
  waits for the result, closes the tab, or the route errors. The one exception is a budget
  refusal: both refusal paths sit before the first model call, so the run is handed back and
  the visitor still has their run of the day. A run the visitor abandons settles upward only:
  the reserved amount is never given back, because the model calls were billed anyway, and a
  leg that lands after the cancellation raises the charge instead of riding for free. Stopping
  a run ends the stream and the accounting; it is not a refund.
- **The replay cache answers the pair that was run, and no other.** Its key carries the
  visitor, the UTC day, and the challenger, so a second tap after switching challengers meets
  the run counter and an honest refusal rather than being handed back the first pair's result.

Detail, rubric, and the read of each result: [`evals/README.md`](./evals/README.md).
