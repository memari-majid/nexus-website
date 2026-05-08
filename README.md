# Nexus AI Solutions — Company Website

Public website for **Nexus AI Solutions LLC**, a Utah IT & AI **vendor**: temporary SOW/project engagements—not client payroll employment (see **`#engagement`** on site).

Live at **[nexusaisolution.net](https://nexusaisolution.net)**

## Strategy alignment (internal ops repo)

Keep positioning and channel execution aligned with **`../contract/docs/reference/PLAN.md`** (especially **§11** and **§11.1**) and **`../contract/docs/reference/PLATFORM-PLAYBOOK.md`** (especially **§1**, **§3 Upwork positioning**, **§12** profiles). **`lib/site.ts`**, **`#services`**, **`#engagement`**, and **FAQ** are the canonical public copy—in sync with **`PLAN.md` §11.1** (“public-facing source of truth”).

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript
- [Vercel AI SDK](https://sdk.vercel.ai/) + OpenAI (optional chat widget)
- Deployed on [Vercel](https://vercel.com)

## Theme & layout

- **Dark/light:** `next-themes` with Tailwind v4 class-based `dark:` (toggle in the nav). Default theme is dark.
- **Homepage:** Consolidated sections (Services, Work, Education, About, Careers, Contact+FAQ) with minimal chrome—solid `.card` surfaces, generous spacing, no glassmorphism.
- **Mobile:** Hero height, full-screen chat on small viewports, horizontal scroll for the workflow diagram, `overflow-x-hidden` on the shell.

Tech stack logos live under `public/logos/` (see `LogoStrip`).

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
| `NEXT_PUBLIC_AI_TA_URL` | Optional. Public URL for the CS 4720R AI teaching assistant. If unset, the section shows “Request access”. |
| `AI_CHAT_MODEL` | Optional. Model slug for `/api/chat` (Vercel AI Gateway). Default: `openai/gpt-oss-20b` |
| `CONTACT_CLASSIFY_MODEL` | Optional. Model slug for contact inquiry classification + auto-reply via AI Gateway. Default: `openai/gpt-oss-20b` |
| `AI_GATEWAY_API_KEY` | Optional fallback for non-Vercel environments. On Vercel, OIDC auth is automatic after enabling AI Gateway in project settings. |
| `RESEND_API_KEY` | Optional. If set, contact form + chat lead form send email via [Resend](https://resend.com) |
| `RESEND_FROM_EMAIL` | Verified sender in Resend (e.g. `Nexus AI <contact@yourdomain.com>`) |
| `CONTACT_TO_EMAIL` | Inbox for inquiries (default: `info@nexusaisolution.net`) |

Without `RESEND_API_KEY`, contact submissions are logged on the server only—configure Resend for production email delivery.

**AI Gateway setup:** in Vercel Dashboard go to **Project → AI Gateway** and enable the gateway. For local dev, run `vercel link` then `vercel env pull .env.local` to provision a short-lived `VERCEL_OIDC_TOKEN` (auto-refreshed on Vercel; valid ~24h locally). No provider-specific API keys are required.

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
