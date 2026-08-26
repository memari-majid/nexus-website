# Plan — nexusaisolution.net

**Last updated:** 2026-08-26  
**Repo:** https://github.com/memari-majid/nexus-website  
**This is the only living *site-ops* plan in this repo.** Positioning and channel strategy stay in [`../contract/docs/reference/PLAN.md`](../../contract/docs/reference/PLAN.md) (§11 / §11.1). Do not duplicate that strategy here.

Restore the company site after the Vercel project was removed.

| Track | Status | Notes |
|---|---|---|
| **Vercel project** | Recreated | `nexus-website` on `memari-majids-projects`, GitHub `memari-majid/nexus-website`, production branch `main` |
| **Domain** | Attached | `nexusaisolution.net` + `www` — DNS is still on Cloudflare (`sreeni` / `valentin.ns.cloudflare.com`), not Vercel nameservers |
| **Env** | Production + development | Site URL, AI CPA URL, models, contact inbox, AI Gateway key. Preview-all-branches add is blocked by CLI in this environment |
| **Copy** | Synced 2026-08-26 | Public site is **AI solutions only**. **Hamid Memari is not listed**. Homepage leads with **active projects and named collaborators** — not publication counts (those stay on the personal `/publications` page). Hero stats: active AI delivery streams, courses & DLI workshops, student researchers, Fall 2026 UVU courses. Partners strip (`#partners`): State (Herbert Institute, Utah Office of Data Privacy, DHHS) · Universities (UVU; One-U RAI public/policy; GridEye U of Utah / UVU ECE / PacifiCorp collaboration, USHE proposal in development) · Silicon Slopes (community, not a client) · Industry (**Clarion AI Partners** — applied AI consulting on LLM and agent workflows, including when to use AI). No invented client counts or extra law-firm roster. **Selected for the 2026 AI Utah 100**. |
| **SEO** | Live 2026-08-25 | Title includes “Majid Memari”; crawlable `/about` founder page; Person JSON-LD `sameAs` personal site + Scholar/ORCID |
| **Phone / voice AI** | Personal assistant; **AI cannot pick up yet** | 2026-08-25 test: 801 went to **GV voicemail** because Web + 618 forwarding are OFF and no Twilio number is linked. Webhook live. Twilio SID/token still empty. |

---

## Deploy

Region `iad1` (`vercel.json`). From this repo:

```bash
npx vercel link --yes --scope memari-majids-projects --project nexus-website
npx vercel deploy --prod
```

Or push `main` — GitHub integration deploys automatically.

## DNS (Cloudflare)

Apex and `www` are on the Vercel project. Current nameservers are Cloudflare. Keep Cloudflare and point records at Vercel (`CNAME` to `cname.vercel-dns.com`, proxied or DNS-only per Vercel docs), **or** switch nameservers to `ns1.vercel-dns.com` / `ns2.vercel-dns.com`.

## Google name search

This site will show for “Majid Memari” only as a *supporting* result. The personal site is the name-query target. Link both ways (already on `/about`) and add `https://nexusaisolution.net` on LinkedIn as a second website if desired.

---

## Phone: personal assistant (Google Voice + hidden Twilio + Vercel)

**Product:** callers dial **(801) 810-9152**. An AI **personal assistant** answers, can briefly say who Dr. Memari is / consulting & training, then takes **name + callback + message** and **emails that message** (`CONTACT_TO_EMAIL` / Resend, else server log). He calls back if he wants. **No live transfer. No “please hold.” 618 does not ring.**

**Why the 2026-08-25 test hit Google Voice voicemail:** Settings → Calls has **Forward calls to Web = OFF**, **Forward calls to (618) 412-1041 = OFF**, and **no other linked number**. GV has nowhere to send the call, so it plays its own voicemail. There is no “rings before voicemail” control that can send the call to Vercel. Vercel has no Twilio SID/token/number.

```text
Caller → Google Voice (801) 810-9152  →  hidden Twilio (AI answering line)  →  POST /api/voice  →  talk + take message  →  email Majid
```

### Routes

| Method | Path | Role |
|---|---|---|
| GET | `/api/voice` | Status JSON (`role: personal-assistant`) |
| POST | `/api/voice` | Personal-assistant greeting → speech gather |
| POST | `/api/voice/gather` | Brief Q&A (same facts as chat); then take a message |
| POST | `/api/voice/message` | Save transcript via `submitInquiry` → Resend or log |

### Env (no secrets in git)

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Signature validation. Empty in production today |
| `TWILIO_PHONE_NUMBER` | Hidden Twilio answering number (not 801, not 618) |
| `VOICE_WEBHOOK` | `https://nexusaisolution.net/api/voice` |
| `AI_GATEWAY_API_KEY` / OIDC + `AI_CHAT_MODEL` | Same as site chat |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` / `CONTACT_TO_EMAIL` | How the **message** reaches Majid |

### Google Voice toggles (2026-08-25, voice.google.com/u/0/settings)

Public number unchanged: **(801) 810-9152**. No Vercel URL field in GV.

| Control | After this pass |
|---|---|
| Forward calls to Web | **OFF** |
| Forward calls to (618) 412-1041 | **OFF** — 618 does not ring |
| Screen calls | **OFF** |
| Linked numbers on file | (618) 412-1041 still listed, forwarding disabled |
| + New linked number | Still empty of Twilio — cannot add without a programmable number |

Until a hidden Twilio number is linked **and** its forwarding is ON, incoming 801 calls go to **Google Voice voicemail** (not the Vercel AI). His cell stays silent.

### Remaining clicks (Twilio still required)

1. Twilio: buy a hidden number. Console → Voice webhook HTTP POST → `https://nexusaisolution.net/api/voice`. Set SID / token / number in Vercel env.
2. GV → **Account → Linked numbers → + New linked number** → that Twilio number → verify.
3. GV → **Calls → Call forwarding** → **ON** for the Twilio number only. Keep 618 and Web **OFF**.
4. Set Resend if messages should email `info@nexusaisolution.net` (otherwise they log only).
5. Test: dial 801-810-9152 → hear the personal assistant → ask a brief question or leave name / number / message → Majid gets email.

### Honest limits

- Twilio webhook budget ~15s. Speech recognition (`<Gather>`), not `<Record>`.
- GV cannot POST to Vercel. A second number is required for AI pickup.
- Status: webhook live; **AI cannot answer 801 today** (no Twilio credentials).

---

## Next

1. Confirm Cloudflare records so [nexusaisolution.net](https://nexusaisolution.net) resolves to this project.
2. Enable **AI Gateway** on the new project if chat / contact classifier / voice 503s.
3. Add Resend keys if voice messages should email (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).
4. Add a hidden Twilio answering number and link it in GV (checklist above) so the personal assistant can pick up 801. A new test call will **not** reach the AI until that exists.
