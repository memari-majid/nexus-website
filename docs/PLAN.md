# Plan — nexusaisolution.net

**Last updated:** 2026-09-12  
**Repo:** https://github.com/memari-majid/nexus-website  
**This is the only living *site-ops* plan in this repo.** Positioning and channel strategy stay in [`../contract/docs/reference/PLAN.md`](../../contract/docs/reference/PLAN.md) (§11 / §11.1). Do not duplicate that strategy here.

**AI assistants:** standing editorial rules, edit map, and hard policies live in [`../AGENTS.md`](../AGENTS.md). Keep status and deploy notes here; keep “how to update” there.

Restore the company site after the Vercel project was removed.

| Track | Status | Notes |
|---|---|---|
| **Vercel project** | Recreated | `nexus-website` on `memari-majids-projects`, GitHub `memari-majid/nexus-website`, production branch `main`. Latest site work lives on `nvidia-green-redesign` and is merged to `main` for GitHub production deploys. |
| **Domain** | Attached | `nexusaisolution.net` + `www` — DNS is still on Cloudflare (`sreeni` / `valentin.ns.cloudflare.com`), not Vercel nameservers |
| **Env** | Production + development | Site URL, AI CPA URL, models, contact inbox, AI Gateway key. Preview-all-branches add is blocked by CLI in this environment |
| **Pages** | Live 2026-09-12 | `/` · `/about` (team index) · `/about/<slug>` ×3 (per-person, one shared template from `lib/people.ts`) · `/nvidia-dli-workshops` · `/contact`. All in `sitemap.xml`. Nav is four links: Training · Consulting · About · Contact, plus the chat CTA. |
| **Design** | Sleek pass 2026-09-12 | Apple-like: one idea per section, generous space, short declarative copy, **no trailing periods in headlines**. Homepage = hero + Consulting + Training + Team + footer only. Depth (workshop outline, NVIDIA verification links, collaborations) lives on inner pages, not the homepage. Removed: stats grid, partners strip, AI-now, portfolio, careers, FAQ accordion, market widgets, `/api/news`, `/api/market`. |
| **People** | Live 2026-09-12 | `lib/people.ts` is the one registry (homepage row, `/about`, per-person pages, JSON-LD). **Majid Memari, PhD — Founder & CEO**; **Hamid Memari — CTO**; **Mohammad JN, PhD — CFO** (display name shortened; legal name `Mohammad Jafarinejad` stays in structured data). Portraits are cropped from **one studio group shot** (master outside the repo at `~/Downloads/team-headshots-source.png`) into square `public/team-*.jpg` (640×640, head-and-shoulders, q88) — reuse that recipe; never copy a photo from LinkedIn. |
| **Naming & affiliations** | Policy 2026-09-12 | Full rules in [`AGENTS.md`](../AGENTS.md). Name style: postnominal **"Majid Memari, PhD"** — never a `Dr.` prefix, never `Ph.D.` with periods. **Omit current UVU faculty title** on this commercial site (conflict of interest); teaching stays generic ("university level"). **Prior research may be named**: Penn (postdoc); Stanford / Johns Hopkins as collaborations through that appointment (not employers); U of Utah One-U RAI; SIU for PhD. Degree = PhD in CS with doctoral research in generative AI — not “PhD in LLMs.” Experience as **start year** ("since 2015"); **no** citation totals. Verifiable credentials (NVIDIA, AI Utah 100) stay. |
| **NVIDIA DLI** | Live 2026-09-12 | `lib/dli.ts` is the single source; rendered in homepage `#training` (short model line + link), `/nvidia-dli-workshops` (full who-provides-what), FAQ, chat/voice/`chat-knowledge`, brief prompt, and the intake classifier. Public titles are **DLI Certified Instructor** and **University Ambassador** only — **never** "NVIDIA partner" / "NVIDIA-sponsored" or any implied NVIDIA endorsement of Nexus. **Never publish** the Ambassador program cost or projected profit. **Only list workshops he is certified to teach** — today that is exactly one: *Building Agentic AI Applications With LLMs* (8h, NIM / LangChain / LangGraph / retrieval / multi-agent / deployment; DLI certificate). Private cohorts **in person or online**, subject to NVIDIA requirements, **six weeks** lead time. Audience is **industry and academia**. **Delivery-model rule (lock this)**: **NVIDIA takes care of everything** — cloud GPU VMs (customer needs **no** GPUs / local compute / special infra), pricing & purchase, content & curriculum, assessment, and certificate; **Nexus only hosts and teaches** and helps participants pass. Explicit boundary in `DLI.boundary`: Nexus has **no control** over pricing, content, curriculum, assessment, or the certificate — seats purchased through NVIDIA at NVIDIA's rate. Never quote a workshop dollar price. Chat must never invent that Nexus sells seats, sets prices, or requires client GPUs. A quiet **Resources** link list points to ten official NVIDIA pages (course outline, instructor directory, CIP, Ambassador program, DLI, instructor-led workshops, catalog PDF, NIM docs, build.nvidia.com, agentic AI) — all checked HTTP 200 on 2026-09-12; **re-verify before editing** (sibling NVIDIA paths 404 easily). **Custom training** (`lib/training.ts`) is **Nexus curriculum** — never call it an NVIDIA workshop and never imply a DLI certificate. **Free for US universities**: the workshop is taught at no cost to any US university (students, faculty, researchers) with **six weeks'** notice, via the Ambassador program. The NVIDIA eye mark (`app/components/NvidiaLogo.tsx`) is monochrome `currentColor` in NVIDIA green, and **every page showing it must carry the trademark notice** (full on the training page, short in the footer). |
| **SEO** | NVIDIA pass 2026-09-12 | Realistic target is **intent**, not the bare word "NVIDIA" (nvidia.com owns that). `/nvidia-dli-workshops` is the ranking asset: focused title, module outline, `Course` JSON-LD with **NVIDIA DLI as provider/seller**, breadcrumbs, and internal links from nav/footer/homepage. Also live: ProfessionalService + Person ×3 + WebSite + FAQPage + ProfilePage schema. Canonical **apex**; `www` 308s. **No keyword stuffing** — it hurts. **Majid must still** verify Search Console, submit the sitemap, and request indexing for the new pages. |
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

## SEO (organic search)

**Intent this site owns:** **Nexus AI Solutions**; Utah AI consulting / team training / workshops; Applied AI, Gen AI, RAG, agents; AI Solution Architect. **AI Entrepreneurship** is training direction, not a launched SKU (no catalog numbers). Branded “Majid Memari” is a *supporting* result — the personal site is the name-query target.

**SEO keywords (on-page + metadata, no stuffing):** Nexus AI Solutions · Utah AI consulting · team training · AI Solution Architect · Applied AI · Gen AI · RAG · agents · workshops · Majid Memari (supporting founder mention).

**Shipped (2026-08-27)**

- Unique title/description for `/`, `/about`, `/contact`
- ProfessionalService + Person + WebSite + FAQPage JSON-LD. No SearchAction (no on-site search). Course schema stays on majidmemari.com so Nexus is not framed as selling the UVU class
- `sitemap.xml` + `robots.txt` (allow `/`, disallow `/api/`, host = apex)
- Middleware 308: `www.nexusaisolution.net` → `https://nexusaisolution.net` (both previously 200)
- Honest contact copy: `(801) 810-9152` is Google Voice, not a live AI receptionist
- Headings mention AI consulting, team training, and AI Entrepreneurship (UVU course the founder teaches; training direction, not a launched SKU)

**Planned — Majid must click**

1. [Google Search Console](https://search.google.com/search-console) → add `https://nexusaisolution.net` (and optionally a Domain property covering www) → verify → submit `https://nexusaisolution.net/sitemap.xml` → Request indexing for `/`, `/about`, `/contact`
2. **LinkedIn** → add `https://nexusaisolution.net` as a second website (personal site stays first)
3. Optional: company LinkedIn Page (only if a real page exists) — do not invent one
4. **Google Business Profile** — only if he wants a real local listing for Sandy, UT consulting. Do **not** create a fake GBP or reviews
5. Same profile backlinks as the personal PLAN (Scholar / ORCID / ResearchGate / UVU) should list **majidmemari.com**; Nexus is optional second URL

Do **not** buy links, spam directories, or fabricate reviews. Do not claim a $1M USHE award or a launched entrepreneurship product.

---

## Phone: personal assistant (Google Voice + hidden Twilio + Vercel)

**Product:** callers dial **(801) 810-9152**. An AI **personal assistant** answers, can briefly say who Majid Memari is / consulting & training, then takes **name + callback + message** and **emails that message** (`CONTACT_TO_EMAIL` / Resend, else server log). He calls back if he wants. **No live transfer. No “please hold.” 618 does not ring.**

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

Owner clicks only (agents cannot finish these):

1. **Search Console** — verify the property, submit `sitemap.xml`, and request indexing for `/nvidia-dli-workshops` and the three `/about/<slug>` pages.
2. Confirm the NVIDIA logo usage and the "free for US universities" offer against the terms of the Certified Instructor / Ambassador agreements.
3. Decide whether the street address should stay public — it is in the footer, `/contact`, and `PostalAddress` schema.
4. Enable **AI Gateway** if chat / contact classifier / voice 503s; add Resend keys if voice messages should email.
5. Add a hidden Twilio answering number and link it in GV (checklist above) so the assistant can pick up 801.

Done in-repo (2026-09-12): missing modules committed so GitHub/Vercel builds resolve; Contact restored in nav and footer; Node engine pinned to `22.x`.
