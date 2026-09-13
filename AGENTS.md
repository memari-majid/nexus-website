# AGENTS — How to update nexusaisolution.net

Instructions for AI assistants working in this repo. **Read this before editing copy, people, NVIDIA/DLI content, or chat prompts.**

| | |
|---|---|
| **Live** | https://nexusaisolution.net |
| **Repo** | https://github.com/memari-majid/nexus-website |
| **Ops plan (one file)** | [`docs/PLAN.md`](docs/PLAN.md) — status, deploy, SEO clicks, phone |
| **Positioning (do not duplicate)** | `../contract/docs/reference/PLAN.md` §11 / §11.1 |

Do not invent a second master plan. Extend `docs/PLAN.md` for site-ops status; put standing editorial rules here.

---

## Product (what the site is)

**Nexus AI Solutions LLC** sells **AI consulting and training**. Implementation is follow-on, not the homepage pitch.

| Offer | Source of truth | Notes |
|-------|-----------------|-------|
| Consulting | Homepage `#consulting`, `lib/site.ts`, `lib/faq.ts` | Advise on adopting AI — and when not to |
| NVIDIA DLI workshop | `lib/dli.ts` → `/nvidia-dli-workshops` | NVIDIA owns product; Nexus hosts & teaches |
| Custom Nexus training | `lib/training.ts` | **Not** an NVIDIA workshop; **no** DLI certificate |

Nav (keep four links unless the owner asks otherwise): **Consulting** → `/#consulting` · **Training** → `/nvidia-dli-workshops` · **About** → `/about` · **Contact** → `/contact`.

Homepage should stay sparse: hero + Consulting + Training + Team + footer. Depth belongs on inner pages.

---

## Edit map (change facts once)

| If you need to change… | Edit this file first | Then check |
|------------------------|----------------------|------------|
| Company name, email, phone, address, tagline | `lib/site.ts` | Footer, contact, SEO, JSON-LD |
| Founder bio / credentials / name style | `lib/majid.ts` | `lib/people.ts` pulls it |
| CTO | `lib/hamid.ts` | `lib/people.ts` |
| CFO | `lib/mohammad.ts` | `lib/people.ts` |
| Who appears on team / about / schema | `lib/people.ts` | `lib/team.ts`, `/about`, `/about/[person]` |
| NVIDIA workshop facts, delivery model | `lib/dli.ts` | Training page, FAQ, chat knowledge, homepage teaser |
| Custom (non-NVIDIA) training | `lib/training.ts` | Do not mix into DLI copy |
| FAQ answers | `lib/faq.ts` | FAQ JSON-LD in SEO |
| Chat / voice personality & facts | `lib/assistant.ts` (prompt), `lib/chat-tools.ts` (tools), `lib/chat-chips.ts` (chips) | `/api/chat`, `/api/voice/*` |
| Metadata & structured data | `lib/seo.ts` | Titles, Organization, Person, Course |
| Homepage layout / sections | `app/components/HomePageContent.tsx` | Keep Apple-sparse |
| Chat UI | `app/components/ChatWidget.tsx` | Sanitize model output; no tool/channel leaks |
| NVIDIA mark | `app/components/NvidiaLogo.tsx`, `NvidiaBadge.tsx` | Credential badge / mark only — no legal trademark paragraph |
| How Dr. MJ works page (`/how-it-works`) | `app/how-it-works/page.tsx` | `lib/seo.ts` (`PAGE_COPY.howItWorks`, `INDEXABLE_PATHS`, `HOW_IT_WORKS_BREADCRUMBS`), footer link in `HomePageContent.tsx`. Publishes model list prices and the bake-off, never the limit or budget constants |
| Picker models, list prices, default model | `lib/chat-models.ts` | `/how-it-works` price table, widget picker, `evals/bakeoff.ts`, `AI_CHAT_MODEL` allowlist |
| Rate limits, daily allowance, soft and hard budgets | `lib/chat-limits.ts` | `lib/rate-limit.ts` (server only, never imported by a client component), `/api/chat`, owner checklist in `README.md` |
| Agent tools: `recommendWorkshop`, `assessReadiness`, `draftConsultingBrief`, `handOffToMajid`, `emailBriefToVisitor`, `emailWorkshopInfo` | `lib/chat-tools.ts` | Tool cards in `ChatWidget.tsx`, tool rules in `lib/assistant.ts`, `evals/tool-smoke.ts`, tool list on `/how-it-works` |
| Consulting brief fields and caps | `lib/brief-schema.ts` | `BriefCard` in `ChatWidget.tsx`, brief email template, `findBrief` in `lib/chat-tools.ts` |
| Readiness snapshot dimensions and scoring | `lib/readiness.ts` | Readiness card in `ChatWidget.tsx` |
| Follow-up chips | `lib/chat-chips.ts` | `lib/assistant.ts` (prompt) and `lib/chat-suggestions.ts` (fallback) both import it |
| Per-reply stats (model, time to first token, tokens, cost) | `lib/chat-metadata.ts` | Stats row in `ChatWidget.tsx`, `chat.usage` log line |
| Visitor email templates (brief, NVIDIA one-pager) | `lib/workshop-email.ts`, `lib/email.ts` | Fixed templates only, scrubbed fields, `WORKSHOP_TO_EMAIL` as CC and reply-to |
| Prompt punctuation | `lib/plain-punctuation.ts` | Every rendered system prompt passes through it; `lib/prompt-punctuation.test.ts`; sweep copy for U+2014 and U+2013 before shipping |

**Do not** hardcode person names, workshop titles, or NVIDIA claims in random components. Read from the libs above.

---

## Hard policies (do not break)

### 1. Founder naming

- Correct: **`Majid Memari, PhD`**
- Never: `Dr. Majid Memari`, `Dr. Majid Memari, PhD`, or `Ph.D.` with periods

### 2. Collaborations vs pedigree

- `lib/collaborations.ts` = **current Nexus** industry / public-sector work — stay generic (no campus names).
- Founder prior research in `lib/majid.ts` may name Penn / Stanford / Johns Hopkins / One-U RAI / SIU under §3 below. Do not scrub those bios because of the collaborations policy.

### 3. Current employer (conflict of interest)

- **Do not publish** his current UVU faculty title, UVU course list, or UVU directory link on this commercial site.
- Do not describe teaching as “university level” on this commercial site.
- Personal site / LinkedIn may carry employment detail — this site must not.

### 4. Prior research institutions (named, carefully)

Allowed and encouraged when accurate: **Penn** (postdoc appointment), **Stanford** and **Johns Hopkins** (collaborations **through** that Penn appointment — **not** employers), **University of Utah One-U Responsible AI**, **SIU Carbondale** (PhD).

- Never write Stanford/JHU as employers, appointments, or Nexus sponsors.
- Degree: **PhD in Computer Science** with doctoral research in generative AI — never “PhD in Generative AI” or “PhD in LLMs.”
- Present-day work leads with **LLMs, agents, retrieval, evaluation**. Do not backdate LLMs into the doctorate.

### 5. Experience & metrics

- Use **start years** (“in applied AI since 2015”), never running “X years of experience.”
- **No** Google Scholar citation totals or publication counts (they go stale).
- Do not invent grants, awards, partners, or revenue. AI Utah 100 (2026) = **honoree**, not winner/#1.

### 6. NVIDIA credentials & language

This commercial site is **industry only**. Public title:

- **DLI Certified Instructor** → hosts industry workshops (NVIDIA sells seats)

**Do not publish** University Ambassador, free workshops, campus workshops, or academia as an audience. If asked in chat, stay on industry hosting — do not describe another program.

Never: NVIDIA partner, NVIDIA-sponsored, NVIDIA-endorsed, or any implication that NVIDIA endorses Nexus.

Only workshop Nexus delivers today: ***Building Agentic AI Applications With LLMs*** (8h). Do not list other NVIDIA catalog courses as Nexus offerings (linking to NVIDIA’s catalog as theirs is fine).

### 7. NVIDIA delivery model (lock this)

| Who | Does |
|-----|------|
| **NVIDIA** | Pricing, purchase, curriculum/content, cloud GPU VMs, assessment, certificate |
| **Nexus** | Hosts and teaches (in person or online); helps participants succeed |

- Customer needs **no** local GPUs / special compute.
- Nexus has **no control** over price, content, assessment, or certificate.
- **Never quote a dollar price** for the DLI workshop.
- Chat must never invent that Nexus sells seats or requires client hardware.
- **Never** mention a free workshop, campus delivery, or Ambassador program on this site.
- Custom training (`lib/training.ts`) ≠ DLI; no DLI certificate language there.
- Do not add a legal NVIDIA trademark disclaimer paragraph. Footer / training page may keep the short credential line (`TRADEMARK_SHORT`).
- Re-check NVIDIA URLs before editing the Resources link list (sibling paths 404 easily). Do not frame those links as “verify our claims.”

### 8. Design / copy voice

- Apple-like: one idea per section, short declarative lines, generous space.
- **No trailing periods in headlines.**
- Sky primary; NVIDIA green `#76b900` only for NVIDIA accents.
- Prefer editing existing sections over adding new homepage chrome (stats, partner strips, news widgets, etc.).

### 9. Chat / voice assistant

- Company assistant: Dr. MJ, an AI consultant agent (consulting only, no booking, no scheduling form). The hand-off to the founder is the approval-gated **`handOffToMajid`** tool → `submitInquiry` (`source: chat-handoff`, no visitor auto-reply). Email tools are approval-gated fixed templates and report "sent" or "not sent" honestly; never claim an email went out when it did not. Public teardown: `/how-it-works`.
- No em dashes or en dashes in any copy the model or a visitor can read (prompt, tool descriptions, card copy, emails, pages); the model mirrors prompt punctuation.
- **No live calendar** — never invent available times.
- End replies with `SUGGESTIONS: a | b | c` per `lib/assistant.ts`. Chips must be the next useful tap (answers to the question just asked, or a concrete next step). `lib/chat-suggestions.ts` sanitizes fluff and fills a fallback. UI strips the marker and never shows tool/channel tokens (`<|channel|>`, etc.).
- Same facts as the public site: keep `lib/assistant.ts` and the tool hints in `lib/chat-tools.ts` in sync when DLI or people change.

### 10. Market geography (owner rule, 2026-09-13)

**Utah is the home base, not the market boundary.** Nexus is based in Sandy, Utah and serves companies **across the United States**, in person at the client offices or online.

- Positioning copy says **the United States**: hero, page titles and meta descriptions, keywords, schema `areaServed` (`Country: United States`), chat and voice prompt geography, plan SEO intent.
- Never write "Utah AI consulting", "brought to Utah", "Utah-based" as the market, or any line that reads as a Utah-only service area.
- Delivery line to use: **in person at your offices anywhere in the US, or online**.

**Keep these factual Utah references** (credentials and real work, not market limits). Do not scrub them:

| Keep | Where |
|------|-------|
| Sandy UT business address + `PostalAddress` schema | `lib/site.ts`, `lib/seo.ts`, footer |
| 2026 AI Utah 100 honoree | `lib/majid.ts`, schema, FAQ |
| University of Utah One-U Responsible AI | founder bio / FAQ (per §4) |
| Utah public-sector collaborations (Gary R. Herbert Institute for Public Policy, Utah Office of Data Privacy, Utah Department of Health and Human Services) | `lib/collaborations.ts` |
| GridEye / PacifiCorp collaboration, Silicon Slopes community involvement | collaborations / bios |
| Team based in Utah's Salt Lake metro | `lib/faq.ts`, paired with the nationwide line |

UVU employment stays off this commercial site per §3; it lives on the personal site.

---

## People & headshots

| Person | Role | Display name | Photo |
|--------|------|--------------|-------|
| Majid Memari, PhD | Founder & CEO | `Majid Memari, PhD` | `public/team-majid-memari.jpg` |
| Hamid Memari | CTO | `Hamid Memari` | `public/team-hamid-memari.jpg` |
| Mohammad JN, PhD | CFO | Short UI name; legal `Mohammad Jafarinejad` in schema | `public/team-mohammad-jafarinejad.jpg` |

- Registry: `lib/people.ts` (`displayName` vs `schemaName`).
- Group master (outside repo): `~/Downloads/team-headshots-source.png`.
- Recipe: crop three panels → **640×640 JPEG q88**, head-and-shoulders. Do not scrape LinkedIn photos.
- Set `nvidiaCertified: true` only for the person who holds the NVIDIA instructor cert.

---

## Deploy checklist

```bash
cd /home/majid/Downloads/Sites/nexus-website
./node_modules/.bin/tsc --noEmit && npm run build
npx vercel deploy --prod --yes   # or push main after owner commits
```

- Vercel project: `nexus-website` on `memari-majids-projects`, region `iad1`.
- **Do not commit or push unless the owner asks.** Large working trees may already be live via CLI deploy but uncommitted — ask first.
- After content that affects SEO: remind owner to verify Search Console / request indexing (see `docs/PLAN.md`).

---

## Common tasks (recipes)

### Update a bio sentence

1. Edit `lib/majid.ts` / `hamid.ts` / `mohammad.ts`.
2. Confirm `lib/people.ts` still maps the right fields.
3. Grep for any leftover hardcoded string.
4. Skim chat knowledge / FAQ if the fact is customer-facing.

### Change DLI workshop copy

1. Edit **only** `lib/dli.ts`.
2. Update FAQ / `lib/assistant.ts` / `lib/chat-tools.ts` hints if they paraphrase the same fact.
3. Never invent a second workshop or a price.

### Add a team member

1. Add `lib/<name>.ts` with facts.
2. Register in `lib/people.ts` (slug, role, photo, links, schema names).
3. Add `public/team-*.jpg` (same crop recipe).
4. Confirm `/about` and `/about/<slug>` pick them up from the registry — avoid one-off page forks.

### Industry-only workshop language

- Public offer is **Certified Instructor + industry teams**.
- Do not reintroduce Ambassador, campus, academia, or a free workshop.
- Prior research institutions in bios may still be named per policy §3.

---

## Integrity

- Mark planned work vs shipped claims in `docs/PLAN.md`.
- Do not fabricate IRB, grants, partnerships, or metrics.
- Prefer small, accurate edits over marketing inflation.
