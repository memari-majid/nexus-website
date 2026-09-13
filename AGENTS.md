# AGENTS — How to update nexusaisolution.net

Instructions for AI assistants working in this repo. **Read this before editing copy, people, NVIDIA/DLI content, or chat prompts.**

| | |
|---|---|
| **Live** | https://nexusaisolution.net |
| **Repo** | https://github.com/memari-majid/nexus-website |
| **Ops plan (one file)** | [`docs/PLAN.md`](docs/PLAN.md) — status, deploy, SEO clicks, phone |
| **Sibling site** | `../majidmemari` (majidmemari.com). Its [`AGENTS.md`](../majidmemari/AGENTS.md) carries the same 9.1, 9.2, 9.3 and 10 rules for that repo |
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

Homepage should stay sparse: hero + Consulting + **Try our AI** + Training + Team + footer. Depth belongs on inner pages. The "Try our AI" section holds the inline AI Consultant demo and is the one sanctioned addition: see §9.3.

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
| Chat / voice personality & facts | `lib/assistant.ts` (prompt), `lib/chat-tools.ts` (tools), `lib/chat-chips.ts` (chips) | `/api/chat`, `/api/voice/*`. `nexusAssistantSystem()` takes the founder naming rule as a parameter (`"chat"` or `"site"`), so each surface renders exactly one; never add a second rule that overrides an earlier one |
| Assistant and founder names | `lib/chat-persona.ts` | Widget, prompt, emails, `/how-it-works`, both repos. The SHARED NAMES block is exported under the same names, in the same order, in `../majidmemari/lib/chat-persona.ts` (§9.2) |
| Grounded facts the lookup tool may cite | `lib/site-facts.ts` | Reads the existing data modules and the eval artifact; never add a fact here that is not in one of them |
| Metadata & structured data | `lib/seo.ts` | Titles, Organization, Person, Course |
| Homepage layout / sections | `app/components/HomePageContent.tsx` | Keep Apple-sparse |
| "Try our AI" section copy and framing | `app/components/demo/TryOurAi.tsx` | `app/components/chat/InlineChat.tsx`, `EvalPanel.tsx`, §9.3 here, Design row in `docs/PLAN.md` |
| Chat UI | `app/components/ChatWidget.tsx` (floating launcher and panel), `app/components/chat/` (shared shell, cards, `chatStore.ts`), `app/components/demo/` (homepage demo section, `EvalPanel.tsx`) | Sanitize model output; no tool/channel leaks; both shells share one store |
| NVIDIA mark | `app/components/NvidiaLogo.tsx`, `NvidiaBadge.tsx` | Credential badge / mark only — no legal trademark paragraph |
| How the AI Consultant works page (`/how-it-works`) | `app/how-it-works/page.tsx` | `lib/seo.ts` (`PAGE_COPY.howItWorks`, `INDEXABLE_PATHS`, `HOW_IT_WORKS_BREADCRUMBS`), footer link in `HomePageContent.tsx`. Publishes model list prices and the bake-off, never the limit or budget constants |
| Picker models, list prices, default model | `lib/chat-models.ts` | `/how-it-works` price table, widget picker, `evals/bakeoff.ts`, `AI_CHAT_MODEL` allowlist |
| Inline demo default model | `app/components/chat/chatStore.ts` | Section copy on the homepage, AGENTS.md 9.3 |
| Rate limits, daily allowance, soft and hard budgets | `lib/chat-limits.ts` | `lib/rate-limit.ts` (server only, never imported by a client component), `/api/chat`, owner checklist in `README.md` |
| Live eval run caps, judge model and sub-budget | `lib/chat-limits.ts` | `app/api/evals/run/route.ts`, `vercel.json` functions map |
| Agent tools (ten): `lookupSiteFacts`, `recommendWorkshop`, `draftConsultingBrief`, `assessReadiness`, `estimateProject`, `draftOutreachNote`, `handOffToMajid`, `emailMajidNote`, `emailBriefToVisitor`, `emailWorkshopInfo` | `lib/chat-tools.ts` | Cards in `app/components/chat/`, `TOOL_STEP_COPY` in `lib/chat-ui.ts`, rules in `lib/assistant.ts`, `evals/tool-smoke.ts`, tool list on `/how-it-works` |
| Eval results shown to visitors | `evals/results/bakeoff-latest.json` | `lib/evals.ts` schema, `lib/evals.test.ts`, `EvalPanel` in `app/components/demo/`, `/how-it-works`. Never hand-edit a score |
| Consulting brief fields and caps | `lib/brief-schema.ts` | `BriefCard` in `app/components/chat/`, brief email template, `findBrief` in `lib/chat-tools.ts` |
| Readiness snapshot dimensions and scoring | `lib/readiness.ts` | `ReadinessCard` in `app/components/chat/` |
| Effort bands behind `estimateProject` | `lib/estimate.ts` | Estimate card in `app/components/chat/`, tool list on `/how-it-works`. Ranges are weeks of elapsed delivery, never a price and never a commitment |
| Outreach note shape and caps | `lib/outreach.ts` | `draftOutreachNote` and `emailMajidNote` in `lib/chat-tools.ts` (`findOutreachNote`), note card in `app/components/chat/` |
| Follow-up chips | `lib/chat-chips.ts` | `lib/assistant.ts` (prompt) and `lib/chat-suggestions.ts` (fallback) both import it |
| Per-reply stats (model, time to first token, tokens, cost) | `lib/chat-metadata.ts` | `StatLine` in `app/components/chat/`, `chat.usage` log line |
| Visitor email templates (brief, NVIDIA one-pager) | `lib/workshop-email.ts`, `lib/email.ts` | Fixed templates only, scrubbed fields, `WORKSHOP_TO_EMAIL` as CC and reply-to |
| Prompt punctuation | `lib/plain-punctuation.ts` | Every rendered system prompt passes through it; `lib/prompt-punctuation.test.ts`; sweep copy for U+2014 and U+2013 before shipping |

**Do not** hardcode person names, workshop titles, or NVIDIA claims in random components. Read from the libs above.

---

## Hard policies (do not break)

### 1. Founder naming

- Correct: **`Majid Memari, PhD`**
- Never: `Dr. Majid Memari`, `Dr. Majid Memari, PhD`, or `Ph.D.` with periods
- **One scoped exception, §9.1:** inside the chat surface the assistant calls him **`Dr. Memari`** (owner override, 2026-09-13). Everywhere else on the site this rule stands unchanged.

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
- Prefer editing existing sections over adding new homepage chrome (stats, partner strips, news widgets, etc.). One sanctioned exception: the "Try our AI" demo section, §9.3.

### 9. Chat / voice assistant

- Company assistant: **the AI Consultant**, an AI consulting agent (consulting only, no
  booking, no scheduling form). Ten tools, defined once in `lib/chat-tools.ts`. The
  hand-off to the founder is the approval-gated **`handOffToMajid`** tool, and a visitor
  can also send a composed note with the approval-gated **`emailMajidNote`**. Every email
  tool is a fixed template and reports "sent" or "not sent" honestly; never claim an email
  went out when it did not. Public teardown: `/how-it-works`.
- Phone voice agent: unchanged, and NOT the AI Consultant. `nexusVoiceSystem()` shares
  `nexusAssistantSystem()` with the chat, so any name change made in the shared function
  renames the phone agent too. The override in 9.1 is scoped to `nexusChatSystem()`.
- Grounded answers: `lookupSiteFacts` may only cite `lib/site-facts.ts`, which re-exports
  facts that already live in the data modules and in the published eval artifact. Never add
  a fact there that is not in one of those sources, and never let a tool invent one.
- No em dashes or en dashes in any copy the model or a visitor can read (prompt, tool descriptions, card copy, emails, pages); the model mirrors prompt punctuation.
- **No live calendar** — never invent available times.
- End replies with `SUGGESTIONS: a | b | c` per `lib/assistant.ts`. Chips must be the next useful tap (answers to the question just asked, or a concrete next step). `lib/chat-suggestions.ts` sanitizes fluff and fills a fallback. UI strips the marker and never shows tool/channel tokens (`<|channel|>`, etc.).
- Same facts as the public site: keep `lib/assistant.ts` and the tool hints in `lib/chat-tools.ts` in sync when DLI or people change.

#### 9.1 Naming (owner override, 2026-09-13, do not revert)

The assistant is called **"AI Consultant"**. It is no longer "Dr. MJ".

Inside the chat surface only (`nexusChatSystem()`, tool descriptions and hints, card copy,
the emails the agent sends, `/how-it-works` when quoting the agent) the founder is called
**"Dr. Memari"**. This is a deliberate owner override of §1 above, which bans a "Dr."
prefix for Majid.

Outside the chat, in all website copy, metadata, JSON-LD, headings, alt text **and in the
phone voice prompt**, he stays **"Majid Memari, PhD"**. That rule is unchanged.

Names live in `lib/chat-persona.ts` and nowhere else. Do not hardcode the assistant name in
a component, a prompt, a test, or a doc. Never rename by blanket substitution: the tool keys
`handOffToMajid` and `emailMajidNote`, the module `lib/majid.ts` and the domain
majidmemari.com all contain the string and must not change.

**One naming rule per prompt.** `nexusAssistantSystem(founderNaming)` renders either the
site-wide rule or the chat rule, never both: `nexusChatSystem()` asks for `"chat"` and
`nexusVoiceSystem()` for `"site"`. Do not restate the other rule further down and rely on
ordering to settle it. A prompt that carries two rules is a prompt that can pick the wrong one.

Widget badge must not repeat the word "Consultant": it is `Nexus AI` here and `Majid's AI`
on majidmemari.com.

**Historical documents are exempt.** Dated design notes under `docs/superpowers/specs/` record
what was decided on the day they were written and still name the old assistant ("Nex"). Do not
rewrite them, and exclude that directory when grepping for the old name; the rename covers
shipped copy, prompts, components and tests.

#### 9.2 Site parity (owner rule, 2026-09-13)

majidmemari.com runs the same agent, the same component split, the same inline demo and an
evaluations panel built from the same three scripts, worded in the first person and never
leading with the company. The same rules live in `../majidmemari/AGENTS.md`; change one repo's
copy of a shared rule and change the other.

`lib/chat-persona.ts` exists in both repos and its SHARED NAMES block is the contract: the same
export names, in the same order, so the two files diff by eye. Only the values differ where the
sites differ (the badge, the tagline). Add a name to one repo and add it to the other in the
same position. Names that must stay for a caller that has not been converted live under the
alias block at the bottom of the personal site's file, marked deprecated, not scattered above.

**Limiter contracts are not ported by eye.** The two `lib/rate-limit.ts` modules must agree on
behaviour, not on wording. A run reserves before the model is called, settles against actual
usage, and a cancelled or abandoned run **settles upward only**: it is never refunded below the
reserved estimate. A refund on abandon is how real spend escapes both the eval sub-budget and
the hard cap. This repo has the test runner, so the regression test for it belongs in a `lib/*.test.ts`
here, and the personal site is written to the same shape.

**Transcript scroller keyboard access, both repos.** `app/components/chat/ConversationView.tsx`
in each repo gives the transcript scroller `tabIndex={0}`, `role="log"`, `aria-live="off"`, an
`aria-label` built from `ASSISTANT_NAME`, and an inset focus ring. The scroller holds no focusable
descendant, so without the tab stop a keyboard-only or switch-access visitor can send a message and
then never scroll back to read the reply. `aria-live="off"` is load-bearing: the role carries an
implicit polite live region and the frame already announces each finished reply, so dropping it
reads a streamed reply out twice. The ring is applied at the call site rather than folded into
`TRANSCRIPT_SCROLLER`, because not every consumer of that constant is meant to become a tab stop.
Only the palette token differs (`brand-500` here, `sky-500` there).

**Classifier pricing, one resolver (both repos, closed 2026-09-13).** The contact-form classifier
resolves its rates once: explicit `CONTACT_CLASSIFY_RATES` from the environment first, then the
`CONTACT_CLASSIFY_RATES` table in `lib/chat-limits.ts`, then the picker's published price if the
slug happens to be on the chat allowlist, then `UNPRICED_MODEL_RATES`. The reservation, the
failure floor and the settle all read that one pair, so a post cannot be reserved at one price and
settled at another. Every exit path settles: a success at the real token counts, a failure at a
floor of the input tokens the prompt sent plus the whole output cap, because a visitor who controls
the message can choose to make the call fail. The pricing helpers carry the same export names in
the same order in both `lib/chat-limits.ts` files, so they diff by eye.

One rule was stricter here for an afternoon and is now in **both** repos: a success whose usage
comes back zero or unparsable is charged the same floor a failure is. `settleBudget` reads a zero
as "spend nothing" and refunds the whole reservation, so a provider that answers without a usage
block would make every classification free and take the form back out of the cap it was just put
inside. `lib/inquiry.ts` guards it here and `../majidmemari/app/api/contact/route.ts` guards it
there. Both log it as its own `unmeasured` outcome rather than folding it into `classified`: a run
of those lines is a provider that stopped reporting usage, not a cheap day, and the two settle at
the same number so the cost alone cannot tell them apart.

**One reply, one judge (both repos, decided 2026-09-13).** `evals/judge.ts` picks the judge **per
row**, ruling out only the model that wrote that reply, so every reply is scored by a model that
did not write it and a bake-off may race every model on the allowlist. Picking one judge for the
whole table is the bug this replaced: it needed a model nobody had entered, so a four-model
bake-off of four allowlisted models could not be scored at all, which is exactly how the personal
site refused to run. Because different rows carry different judges, the pairing is published per
row: here the `Scored ... by` note in `evals/results/bakeoff-latest.json` names every pairing, and
on the personal site each verdict in `judge-latest.json` carries `judgeModel` and `judgeLabel` at
`schemaVersion` 2 with no top-level judge field. The panel names the judge in the row rather than
one judge under the table, and the reader drops any verdict whose judge is the model that wrote the
reply. Do not reintroduce a single top-level judge name in either repo: a summary that can disagree
with the rows is how "no model scored its own reply" stops being checkable.

**The judge output cap covers the judge's reasoning (both repos, 2026-09-13).**
`EVAL_JUDGE_MAX_OUTPUT_TOKENS` here and `EVAL_JUDGE_OUTPUT_TOKENS` there are 1,500 for a verdict
that is about 150 tokens of text. Measured: at 700, `google/gemini-3.8-flash` spent 619 tokens
reasoning and left 66 for the answer, so the object came back truncated, the published table
published no scores, and a visitor's live run would have reported "the judge did not return a
score this time" nearly every time, because the script and the route read the same constant. Both
scripts and both routes now treat `NoObjectGeneratedError` the way they already treated
`NoOutputGeneratedError`: one row left unscored, the rest of the run intact. The same arithmetic
applies to the contestant cap, which is why `MAX_OUTPUT_TOKENS` is 2,500 on both sites: at 2,000
Gemini returned an empty reply on the bake-off's second turn.

**No uncapped model call is left on either site.** Here the metering sits in `lib/inquiry.ts`
around the `classifyInquiry` call, not in a route, because two routes reach it: `POST /api/contact`
and `POST /api/voice/message`, and a gate in one of the two is not a gate. Both routes pass
`clientIp` from `lib/chat-request.ts`, the same derivation chat and evals use. On the personal site
there is one caller and the metering sits in `app/api/contact/route.ts`.

What differs, and it is only the numbers each site owns:

| | nexus-website | majidmemari |
|---|---|---|
| Default `CONTACT_CLASSIFY_MODEL` | `anthropic/claude-haiku-4-5` | `openai/gpt-oss-20b` |
| Which resolver branch that default takes | The table. Haiku is **not** on this site's picker allowlist, so the published-price branch never fires for it | The table, for the same reason |
| Budget constants the reservation lands on | `PER_IP_DAILY_USD`, `GLOBAL_SOFT_DAILY_USD`, `GLOBAL_HARD_DAILY_USD`, `PER_IP_REQUESTS_PER_MINUTE` | `IP_DAILY_BUDGET_USD`, `GLOBAL_HARD_BUDGET_USD` and that repo's own per-minute limit |
| Limiter call shape | `checkRequestRate` / `reserveBudget` returning a decision, settled with `limiter.settleBudget(reservation, usd)` | `checkRate` / `reserveBudget` returning a reservation that settles itself |
| What a rate refusal does | Skips the classifier and **still delivers** with the fixed acknowledgment. Three callers funnel here, one of them a phone line whose whole traffic shares Twilio's IP, and the email costs no model money | Answers 429 and drops the submission. One caller, a browser form the visitor can retry |
| `site` in the `contact.usage` line | `"nexus"` | `"majidmemari"` |

The shared helper names (`contactClassifyRates`, `parseClassifyRates`,
`contactClassifyResolvedRates`, `contactClassifyFloorUsd`, `contactClassifyPrechargeUsd`,
`contactClassifyCostUsd`, `CONTACT_CLASSIFY_NAME_CHARS`, `CONTACT_CLASSIFY_MESSAGE_CHARS`,
`CONTACT_CLASSIFY_OUTPUT_TOKENS`, `UNPRICED_MODEL_RATES`) are the contract, like the SHARED NAMES
block above: add one to a repo and add it to the other in the same position. This repo has the test
runner, so their regression tests live in `lib/chat-limits.test.ts` and `lib/inquiry.test.ts` here.

Deliberate differences, each justified, none to be "fixed":

| Difference | Why |
|---|---|
| `emailWorkshopInfo` exists only here | NVIDIA-catalog specific |
| `offerOfficeHours` exists only there | UVU specific, and UVU detail belongs on the personal site (§3) |
| No `/how-it-works` route there | The personal site's teardown surface is the inline demo's "What it does" tab. Porting the route is optional, not owed: if it ever lands there, add it to that repo's `INDEXABLE_PATHS` in append-only position and link it from the widget toolbar and the demo header |
| No test runner there | By design. Shared contracts are tested here |
| Different eval artifact shape | Same three scripts (`bakeoff.ts`, `judge.ts`, `tool-smoke.ts`), different files on disk. Here `judge.ts` writes rubric scores back into `evals/results/bakeoff-latest.json`, so one file carries `rubricScores` per row; there the judge keeps its own `judge-latest.json` beside `bakeoff-latest.json` and the two are joined when the page reads them. Both publish one row per generation, and in both a score that no judge measured is `null` rather than a plausible number |

Anything else that diverges is written down in that repo's `README.md` "Known divergences" with
a reason. An undocumented divergence reads as an omission.

#### 9.3 Homepage demo section (owner override, 2026-09-13, do not delete)

The homepage carries one added section, "Try our AI", holding the inline AI Consultant demo
between Consulting and Training. This is an explicit exception to the rule against new
homepage chrome and to the PLAN's homepage inventory. It is a product surface, not a widget
strip: the assistant is the first product the company ships.

Cost posture that goes with it, and do not change one without the other: the page opens on
the cheaper model (`chatStore.ts` seeds `FALLBACK_MODEL_ID`, the picker still offers all
four), live evaluation runs have their own `GLOBAL_EVAL_USD_PER_DAY` sub-budget inside the
existing soft budget, and every model call still passes through `reserveBudget`.

Two rules about the live run, because each is a way a visitor can spend money the caps do not
see:

- **`EVAL_RUNS_PER_IP_PER_DAY` is spent at the start of a run, not at the end.** The count goes
  up when the run is reserved, before the first contestant call, and it stays up whether the
  visitor waits for the result, closes the tab, or the route errors. A cap that only counts runs
  reaching the done frame is not a cap: one visitor can replay it all day on the whole site's
  budget.
- **A cancelled or abandoned run settles upward only.** Settling never lowers the reserved
  amount, because the calls the visitor walked away from were still billed. A visitor may stop a
  run; stopping ends the stream and the accounting, and never returns the money. The settle
  runs once, so a contestant or judge leg that lands after the cancellation raises the charge
  itself through `chargeAtLeast` / `chargeEvalAtLeast`, which are repeatable and only ever add.

**A budget refusal returns the run; a run that called a model keeps it.** Both refusal paths
(`reserveBudget`, `reserveEvalBudget`) happen before the first contestant call, so nothing ran,
nothing was billed, and the visitor gets their one run of the day back with `releaseEvalRun`.
Past that point the rule inverts and never softens: any run that reached a model keeps both the
count and the money, however it ended. Refusing a visitor a run that never happened is a bug,
not a safety margin; handing back a run that did happen is how the cap stops being a cap.

All three rules hold in `../majidmemari` as well (§9.2). The regression tests for them belong in
this repo's `lib/*.test.ts`, which is the only place either site has a test runner.

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
