# Nexus AI Solutions — Company Website

Public website for **Nexus AI Solutions LLC**, a Utah-based IT & AI consulting firm.

Live at [nexusaisolution.net](https://nexusaisolution.net)

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript
- [Vercel AI SDK](https://sdk.vercel.ai/) + OpenAI (optional chat widget)
- Deployed on [Vercel](https://vercel.com)

## Theme & responsiveness

- **Dark/light:** `next-themes` with Tailwind v4 class-based `dark:` (toggle in the nav). Default theme is dark.
- **Mobile:** Hero height, full-screen chat on small viewports, horizontal scroll for the workflow diagram, stacked footer newsletter, `overflow-x-hidden` on the shell.

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
| `NEXT_PUBLIC_AI_CPA_URL` | Optional. Public URL for the AI CPA app (Try Our AI section). If unset, the section shows “Request access”. |
| `NEXT_PUBLIC_AI_TA_URL` | Optional. Public URL for the CS 4720R AI teaching assistant. If unset, the section shows “Request access”. |
| `OPENAI_API_KEY` | Required for the floating chat assistant (`/api/chat`) and AI contact classification |
| `OPENAI_MODEL` | Optional. Default: `gpt-5.4-mini` |
| `CONTACT_CLASSIFY_MODEL` | Optional. Model for inquiry classification + auto-reply. Default: `gpt-4o-mini` |
| `RESEND_API_KEY` | Optional. If set, contact form + chat lead form send email via [Resend](https://resend.com) |
| `RESEND_FROM_EMAIL` | Verified sender in Resend (e.g. `Nexus AI <contact@yourdomain.com>`) |
| `CONTACT_TO_EMAIL` | Inbox for inquiries (default: `info@nexusaisolution.net`) |

Without `RESEND_API_KEY`, contact submissions are logged on the server only—configure Resend for production email delivery.

### Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint
