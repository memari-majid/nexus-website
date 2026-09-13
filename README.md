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
- [Vercel AI SDK](https://sdk.vercel.ai/) through Vercel AI Gateway for Dr. MJ, the consulting agent (public teardown at [`/how-it-works`](https://nexusaisolution.net/how-it-works); evals in `evals/`)
- Deployed on [Vercel](https://vercel.com)

## Theme & layout

- **Dark/light:** `next-themes` with Tailwind v4 class-based `dark:` (toggle in the nav). Default theme is dark.
- **Homepage:** Sparse Apple-like layout — hero + Consulting + Training + Team + footer. Depth on inner pages (`/nvidia-dli-workshops`, `/about`). No trailing periods in headlines.
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
| `CONTACT_CLASSIFY_MODEL` | Optional. Model slug for contact inquiry classification + auto-reply via AI Gateway. Default: `openai/gpt-oss-20b` |
| `VOICE_CHAT_MODEL` | Optional. Model slug for `/api/voice/gather`. Defaults to `AI_CHAT_MODEL`. |
| `AI_GATEWAY_API_KEY` | Optional fallback for non-Vercel environments. On Vercel, OIDC auth is automatic after enabling AI Gateway in project settings. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio request signing. Required in production before the voice engine answers. |
| `TWILIO_PHONE_NUMBER` | Hidden Twilio number (E.164). **Not** the public Google Voice line. |
| `VOICE_WEBHOOK` | Public incoming Voice URL, e.g. `https://nexusaisolution.net/api/voice` |
| `RESEND_API_KEY` | Optional. With `RESEND_FROM_EMAIL` also set, the contact form and the chat email tools send through [Resend](https://resend.com). Missing either one, every chat email tool reports "not sent" and Dr. MJ points the visitor to the contact form. |
| `RESEND_FROM_EMAIL` | Verified sender on the Nexus domain in Resend (e.g. `Nexus AI Solutions <hello@nexusaisolution.net>`). Unset, Resend falls back to `onboarding@resend.dev`, which only delivers to the account owner, so the code treats email as not configured. |
| `CONTACT_TO_EMAIL` | Inbox for contact-form inquiries (default: `info@nexusaisolution.net`) |
| `WORKSHOP_TO_EMAIL` | Founder inbox for chat hand-offs, and the CC and reply-to on every visitor email (default: `memari.majid@hotmail.com`). `info@nexusaisolution.net` has no inbound mail, so never point replies there. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Optional. Upstash Redis REST from the Vercel Marketplace (no custom key prefix). Shares the chat rate limits and daily budgets across function instances. `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are read as a fallback. Without either pair, limits are per warm instance. |

Without `RESEND_API_KEY`, contact submissions are logged on the server only—configure Resend for production email delivery.

**Phone:** the published `(801) 810-9152` number is **Google Voice**. GV cannot hit Vercel. The AI engine is Twilio TwiML at `/api/voice`. Keep the GV number public and forward it to a hidden Twilio number — checklist in [`docs/PLAN.md`](docs/PLAN.md).

**AI Gateway setup:** in Vercel Dashboard go to **Project → AI Gateway** and enable the gateway. For local dev, run `vercel link` then `vercel env pull .env.local` to provision a short-lived `VERCEL_OIDC_TOKEN` (auto-refreshed on Vercel; valid ~24h locally). No provider-specific API keys are required.

### Owner checklist (Dr. MJ agent)

Things only the owner can click. Numbered so code comments and plans can point at an item.

1. **Resend:** set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (a verified sender on `nexusaisolution.net`) in Vercel production. Both are empty today, so every chat email tool reports "not sent" until then.
2. **Founder inbox:** keep `WORKSHOP_TO_EMAIL` on an inbox that receives mail (default `memari.majid@hotmail.com`). `info@nexusaisolution.net` has no inbound MX. Decide one of: set up inbound mail (MX records plus a mailbox) for `info@nexusaisolution.net`, or remove the `mailto:` links on `/contact` and in `ContactForm.tsx` so visitors are not sent to an address that bounces.
3. **Fluid compute:** this project has it on in `vercel.json`. Enable it on the personal site project (`majidmemari`) too so its chat route's `maxDuration = 180` applies.
4. **Upstash Redis:** add it from the Vercel Marketplace with **no custom prefix** so `KV_REST_API_URL` / `KV_REST_API_TOKEN` land in this project. Until then, limits and budgets are per warm instance.
5. **WAF:** keep the `/api/chat` WAF rule at or above 30 requests per minute per IP (see `docs/PLAN.md`) so the app's own limit, and its friendlier message, is what visitors hit first.
6. **Model allowlist:** `AI_CHAT_MODEL` must be one of the four picker models. Check the deploy log for the one-line warning if it is not.
7. **Budgets:** the per-visitor allowance, the soft budget, and the hard budget live in `lib/chat-limits.ts`. Review them against the AI Gateway spend page after the first week.
8. **Gateway usage mapping:** on the second turn of a real conversation, confirm one `chat.usage` log line shows cache read tokens, and that the logged cost matches the gateway's spend report.
9. **Tool smoke test:** run `evals/tool-smoke.ts` against all four picker models after any change to a tool schema.
10. **Search Console:** request indexing for `/how-it-works`.

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
