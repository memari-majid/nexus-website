# Nexus AI Solutions — Company Website

Public website for **Nexus AI Solutions LLC**, a Utah-based IT & AI consulting firm.

Live at [nexusaisolution.net](https://nexusaisolution.net)

## Tech Stack

- [Next.js 15](https://nextjs.org) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript
- [Vercel AI SDK](https://sdk.vercel.ai/) + OpenAI (optional chat widget)
- Deployed on [Vercel](https://vercel.com)

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
| `OPENAI_API_KEY` | Required for the floating chat assistant (`/api/chat`), Try Our AI demos (`/api/demo/*`), and AI contact classification |
| `OPENAI_MODEL` | Optional. Default: `gpt-5.4-mini` |
| `DEMO_AI_MODEL` | Optional. Model for summarizer & sentiment demos. Default: `gpt-4o-mini` |
| `CONTACT_CLASSIFY_MODEL` | Optional. Model for inquiry classification + auto-reply. Default: `gpt-4o-mini` |
| `RESEND_API_KEY` | Optional. If set, contact form + chat lead form send email via [Resend](https://resend.com) |
| `RESEND_FROM_EMAIL` | Verified sender in Resend (e.g. `Nexus AI <contact@yourdomain.com>`) |
| `CONTACT_TO_EMAIL` | Inbox for inquiries (default: `memari.majid@hotmail.com`) |

Without `RESEND_API_KEY`, contact submissions are logged on the server only—configure Resend for production email delivery.

### Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build locally
- `npm run lint` — ESLint
