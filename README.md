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
- [Vercel AI SDK](https://sdk.vercel.ai/) through Vercel AI Gateway for the AI Consultant, the consulting agent on the homepage and in the floating panel (Claude Haiku 4.5, see "The chat" below)
- Deployed on [Vercel](https://vercel.com)

## Theme & layout

- **Dark/light:** `next-themes` with Tailwind v4 class-based `dark:` (toggle in the nav). Default theme is dark.
- **Homepage:** Sparse Apple-like layout: hero + Consulting + **Try our AI** + Training + Team + footer. The "Try our AI" section carries the inline AI Consultant chat and is the one sanctioned addition (`AGENTS.md` §9.3). Depth on inner pages (`/nvidia-dli-workshops`, `/about`). No trailing periods in headlines.
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
| `AI_CHAT_MODEL` | Model slug for `/api/chat` (Vercel AI Gateway). Production and code default: `anthropic/claude-haiku-4.5` (owner decision 2026-09-13; the dot is the real gateway slug, `claude-haiku-4-5` with a dash does not exist there). Must be the one entry in `lib/chat-models.ts`; any other slug is ignored with one warning at startup. Visitors cannot choose a model, and a `model` field in the request body is dropped. |
| `CONTACT_CLASSIFY_MODEL` | Optional. Model slug for contact inquiry classification + auto-reply via AI Gateway. Default: `openai/gpt-4.1-nano` (2026-09-13, the same default on the personal site; `anthropic/claude-haiku-4-5`, the default before, is not a slug the gateway serves). Not the chat model, so `lib/chat-models.ts` does not price it and `CONTACT_CLASSIFY_RATES` below does. |
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
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Optional. Upstash Redis REST from the Vercel Marketplace (no custom key prefix). Shares the chat rate limits and daily budgets across function instances. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are read as a fallback. Without either pair, limits are per warm instance. |
| `CHAT_APPROVAL_SECRET` | Recommended before Resend. HMAC key for the chat's on-screen approvals: every approval request the AI Consultant streams is signed with it, and an approval that comes back unsigned or altered is refused before any budget is reserved (`lib/approval-signature.ts`). Unset, the key is derived from `RESEND_API_KEY` when that is set, else a random per-instance key with one warning at startup. |

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
6. **Model allowlist:** `AI_CHAT_MODEL` must be `anthropic/claude-haiku-4.5`, the one entry in `lib/chat-models.ts`. Check the deploy log for the one-line warning if it is not.
7. **Budgets:** the per-visitor allowance, the soft budget, and the hard budget live in `lib/chat-limits.ts`. Review them against the AI Gateway spend page after the first week.
8. **Gateway usage mapping:** on the second turn of a real conversation, confirm one `chat.usage` log line shows cache read tokens, and that the logged cost matches the gateway's spend report.
9. **Search Console:** `/how-it-works` was removed on 2026-09-13 and now 308s to `/` (`next.config.ts`). Once the redirect is live, remove the URL from the property if it is still listed; nothing else to request.
10. **Approval secret:** set `CHAT_APPROVAL_SECRET` (any long random string, the same value on both sites is fine) in Vercel production before item 1. Every on-screen approval is signed with it and verified before a send runs; without it the key is derived from `RESEND_API_KEY` once that is set, and until either exists it is a per-instance random key, so an approval issued by one instance does not verify on another. Nothing can be sent today, but a visitor whose approval lands on a different instance from the one that issued it sees "could not be verified" instead of "noted but not sent", so set it with this deploy rather than waiting for Resend.
11. **Contact classifier model:** run `vercel env pull` and check `CONTACT_CLASSIFY_MODEL`. The local `.env.local` pins `openai/gpt-oss-20b`, which returned no usable classification on 99 of 99 submissions (2026-09-13), and the code default before this round, `anthropic/claude-haiku-4-5`, is not a slug the gateway serves (its Haiku is `anthropic/claude-haiku-4.5`). The code default is now `openai/gpt-4.1-nano`, which answered first time through the text parser, and the same default on the personal site. The classifier reads the object out of plain text and pauses itself for an hour after five failures in a row, but a model that cannot answer is still a call paid for nothing until it pauses. Unset the variable or set it to `openai/gpt-4.1-nano`.

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

## The chat

The AI Consultant is a plain, good chatbot and nothing more (owner decision, 2026-09-13; the
paragraph in `AGENTS.md` §9.4 is the record). What that means in this repo:

- **One model.** `lib/chat-models.ts` holds one entry, `anthropic/claude-haiku-4.5`, with its
  gateway list prices. `DEFAULT_MODEL_ID` and `FALLBACK_MODEL_ID` both point at it, so the soft
  budget's model swap is a no-op and the hard budget is what refuses. Prompt caching stays on.
- **Nothing about the internals reaches a visitor.** No model picker, no stats line under a
  reply, no `/how-it-works` page, no explainer cards under the inline frame. The route streams
  one metadata flag (`emailEnabled`, so the chips never invite an email while email is off) and
  nothing about cost, tokens, model, or timing. Those go to the server's `chat.usage` log line,
  which is unchanged. Asked how it works or what it costs, the assistant says it is a custom AI
  assistant built by Nexus for this site and offers to put the visitor in touch with the founder.
- **Everything that guards the bill is unchanged.** Per-minute rate limit, per-IP and global daily
  budgets, the precharge and settle, the approval gate and its signatures, the empty-turn
  recovery, and the contact-form metering all stand as they were (`lib/chat-limits.ts`,
  `lib/rate-limit.ts`, `lib/chat-request.ts`, `lib/approval-signature.ts`).
- **Chips.** At most two per reply, each five words or fewer, each naming something concrete
  from the reply or the visitor's last message; when the reply ends by asking the visitor about
  their situation the model writes `SUGGESTIONS: none` and the widget shows no chips
  (`MAX_CHIPS` and `NO_CHIPS` in `lib/chat-chips.ts`).
- **Removed on 2026-09-13.** The evaluations tab and its live run route, the checked-in bake-off
  artifacts and the `evals/` scripts, the model picker, the per-reply stats line, and the public
  teardown page. `/how-it-works` redirects permanently to `/` so old links do not 404.
