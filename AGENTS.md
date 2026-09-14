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

Homepage should stay sparse: hero + Consulting + **Try our AI** + Training + Team + footer. Depth belongs on inner pages. The "Try our AI" section holds the inline AI Consultant chat and is the one sanctioned addition: see §9.3.

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
| Assistant and founder names | `lib/chat-persona.ts` | Widget, prompt, emails, both repos. The SHARED NAMES block is exported under the same names, in the same order, in `../majidmemari/lib/chat-persona.ts` (§9.2) |
| Grounded facts the lookup tool may cite | `lib/site-facts.ts` | Reads the existing data modules; never add a fact here that is not in one of them, and never one that describes the assistant's model, prompt, tools, budgets or cost (§9.4) |
| Metadata & structured data | `lib/seo.ts` | Titles, Organization, Person, Course |
| Homepage layout / sections | `app/components/HomePageContent.tsx` | Keep Apple-sparse |
| "Try our AI" section copy and framing | `app/components/HomePageContent.tsx` (heading and the one inviting line), `app/components/demo/TryOurAi.tsx` (the frame) | `app/components/chat/InlineChat.tsx`, §9.3 and §9.4 here, Design row in `docs/PLAN.md`. No explainer cards, no link to a teardown |
| Chat UI | `app/components/ChatWidget.tsx` (floating launcher and panel), `app/components/chat/` (shared shell, cards, `chatStore.ts`), `app/components/demo/TryOurAi.tsx` (homepage frame) | Sanitize model output; no tool/channel leaks; both shells share one store; nothing about the model, tokens, cost or timing renders (§9.4) |
| NVIDIA mark | `app/components/NvidiaLogo.tsx`, `NvidiaBadge.tsx` | Credential badge / mark only — no legal trademark paragraph |
| The chat model and its list prices | `lib/chat-models.ts` | One entry, `anthropic/claude-haiku-4.5` (§9.4). `AI_CHAT_MODEL` allowlist, the route's billing math, `CONTACT_CLASSIFY_RATES` precedence in `lib/chat-limits.ts`. `/how-it-works` 308s to `/` from `next.config.ts` |
| Rate limits, daily allowance, soft and hard budgets | `lib/chat-limits.ts` | `lib/rate-limit.ts` (server only, never imported by a client component), `/api/chat`, owner checklist in `README.md` |
| Agent tools (ten): `lookupSiteFacts`, `recommendWorkshop`, `draftConsultingBrief`, `assessReadiness`, `estimateProject`, `draftOutreachNote`, `handOffToMajid`, `emailMajidNote`, `emailBriefToVisitor`, `emailWorkshopInfo` | `lib/chat-tools.ts` | Cards in `app/components/chat/`, `TOOL_STEP_COPY` in `lib/chat-ui.ts`, rules in `lib/assistant.ts` |
| Consulting brief fields and caps | `lib/brief-schema.ts` | `BriefCard` in `app/components/chat/`, brief email template, `findBrief` in `lib/chat-tools.ts` |
| Readiness snapshot dimensions and scoring | `lib/readiness.ts` | `ReadinessCard` in `app/components/chat/` |
| Effort bands behind `estimateProject` | `lib/estimate.ts` | Estimate card in `app/components/chat/`. Ranges are weeks of elapsed delivery, never a price and never a commitment |
| Outreach note shape and caps | `lib/outreach.ts` | `draftOutreachNote` and `emailMajidNote` in `lib/chat-tools.ts` (`findOutreachNote`), note card in `app/components/chat/` |
| Follow-up chips, the cap and the none line | `lib/chat-chips.ts` (`MAX_CHIPS`, `NO_CHIPS`) | `lib/assistant.ts` (prompt), `lib/chat-suggestions.ts` (fallback) and `splitSuggestions` in `lib/chat-ui.ts` (parser) all import it |
| Chat cost math and the one metadata flag | `lib/chat-metadata.ts` | `chat.usage` log line on the route; `emailEnabled` is the only thing streamed to the widget (§9.4) |
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
| **NVIDIA** | Curriculum and content, cloud GPU VMs, the assessment, the certificate |
| **Nexus** | Hosts and teaches (in person or online), enrolls the team, invoices the client, helps participants succeed |

- Customer needs **no** local GPUs / special compute.
- Nexus has **no control** over content, assessment, or certificate. Those are NVIDIA's, and
  the certificate is earned from NVIDIA, never awarded by Nexus.
- **Nexus sets and invoices its own seat price.** `lib/dli.ts` `pricing` is the single source:
  $500 per seat up to 20, a tailored quote above that. Say it as a Nexus rate, never as an
  NVIDIA public price, and never lead with it. (This replaces an older rule that said never to
  quote a dollar figure at all, which the shipped site, `lib/site-facts.ts` and the chat prompt
  have all contradicted since the business model changed to Nexus enrolling and invoicing.)
- **Never quote a dollar figure for the quote tiers** above 20 seats: those are scoped, not listed.
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
  went out when it did not. There is no public teardown: see §9.4.
- Phone voice agent: unchanged, and NOT the AI Consultant. `nexusVoiceSystem()` shares
  `nexusAssistantSystem()` with the chat, so any name change made in the shared function
  renames the phone agent too. The override in 9.1 is scoped to `nexusChatSystem()`.
- Grounded answers: `lookupSiteFacts` may only cite `lib/site-facts.ts`, which re-exports
  facts that already live in the data modules. Never add a fact there that is not in one of
  those sources, and never let a tool invent one.
- No em dashes or en dashes in any copy the model or a visitor can read (prompt, tool descriptions, card copy, emails, pages); the model mirrors prompt punctuation.
- **No live calendar** — never invent available times.
- End replies with `SUGGESTIONS: a | b` per `lib/assistant.ts`: at most two chips, each five words or fewer, each naming something concrete from the reply or the visitor's last message, or `SUGGESTIONS: none` when the reply ends by asking the visitor about their situation (then the widget shows no chips). `lib/chat-suggestions.ts` sanitizes fluff and fills a fallback up to the same cap. UI strips the marker and never shows tool/channel tokens (`<|channel|>`, etc.).
- Same facts as the public site: keep `lib/assistant.ts` and the tool hints in `lib/chat-tools.ts` in sync when DLI or people change.

#### 9.1 Naming (owner override, 2026-09-13, do not revert)

The assistant is called **"AI Consultant"**. It is no longer "Dr. MJ".

Inside the chat surface only (`nexusChatSystem()`, tool descriptions and hints, card copy,
the emails the agent sends) the founder is called **"Dr. Memari"**. This is a deliberate owner override of §1 above, which bans a "Dr."
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

majidmemari.com runs the same agent, the same component split and the same inline chat,
worded in the first person and never leading with the company. The same rules live in
`../majidmemari/AGENTS.md`; change one repo's copy of a shared rule and change the other.

`lib/chat-persona.ts` exists in both repos and its SHARED NAMES block is the contract: the same
export names, in the same order, so the two files diff by eye. Only the values differ where the
sites differ (the badge, the tagline). Add a name to one repo and add it to the other in the
same position. Names that must stay for a caller that has not been converted live under the
alias block at the bottom of the personal site's file, marked deprecated, not scattered above.

**Limiter contracts are not ported by eye.** The two `lib/rate-limit.ts` modules must agree on
behaviour, not on wording. A request reserves before the model is called, settles against actual
usage on finish, and an aborted turn **tops up only**: it is never refunded below the reserved
estimate, because the step in flight had its prompt consumed. A refund on abort is how real spend
escapes the hard cap. This repo has the test runner, so the regression test for it belongs in a
`lib/*.test.ts` here, and the personal site is written to the same shape.

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
`CONTACT_CLASSIFY_RATES` table in `lib/chat-limits.ts`, then the chat model's published price if
the slug happens to be on the chat allowlist, then `UNPRICED_MODEL_RATES`. The reservation, the
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

**No uncapped model call is left on either site.** Here the metering sits in `lib/inquiry.ts`
around the `classifyInquiry` call, not in a route, because two routes reach it: `POST /api/contact`
and `POST /api/voice/message`, and a gate in one of the two is not a gate. Both routes pass
`clientIp` from `lib/chat-request.ts`, the same derivation the chat uses. On the personal site
there is one caller and the metering sits in `app/api/contact/route.ts`.

What differs, and it is only the numbers each site owns:

| | nexus-website | majidmemari |
|---|---|---|
| Default `CONTACT_CLASSIFY_MODEL` | `openai/gpt-4.1-nano` (since 2026-09-13; `anthropic/claude-haiku-4-5` before, a slug the gateway does not serve) | `openai/gpt-4.1-nano` (the same; `openai/gpt-oss-20b` before) |
| Which resolver branch that default takes | The table. Nano is **not** on this site's chat allowlist, so the published-price branch never fires for it | The table, for the same reason |
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
| No test runner there | By design. Shared contracts are tested here |

Anything else that diverges is written down in that repo's `README.md` "Known divergences" with
a reason. An undocumented divergence reads as an omission.

**QA round of 2026-09-13, decided for both repos.** Each of the following is one shape in both
repos; the personal site carries the same names in the same places.

- **Approvals are signed, and so are drafts.** `lib/approval-signature.ts` exists in both repos
  with the same exports: `approvalSecret()` (`CHAT_APPROVAL_SECRET`, else derived from
  `RESEND_API_KEY`, else a per-process random key with one warning), `signApproval` /
  `verifyApproval` (the SDK's own HMAC scheme, reimplemented so the sanitizer can refuse before a
  dollar is reserved; a test signs with the real SDK and verifies here, so SDK drift fails the
  suite), and `signDraft` / `verifyDraft` (this site's scheme, under a key derived from the
  secret). The chat route passes `experimental_toolApprovalSecret: approvalSecret()` to
  `streamText` and the same secret to the transcript sanitizer. An `approval-responded` part in
  the final message whose signature is missing or wrong becomes `output-denied` with
  `FORGED_APPROVAL_REASON` here; the personal site keeps such a part `approval-responded` with
  `approved: false` and the same reason so the SDK's own denial path emits `tool-output-denied`
  and the card settles on screen (the SDK signature-checks approved parts only, so both states
  refuse before a tool runs; adopt that shape here if a real visitor ever meets the stalled
  card, which is possible while `CHAT_APPROVAL_SECRET` is unset and two instances answer one
  conversation). The two draft tools put `signature` in their output and a brief or
  note part whose output does not verify is dropped, so `findBrief` and `findOutreachNote` only
  ever see a draft this server watched the model write. The route logs what it refused as one
  `chat.rejected` line (`forgedApprovals`, `unsignedDrafts`).
- **Stop reaches the gateway.** Both chat routes pass `abortSignal: req.signal` to
  `streamText`. Next aborts that signal when the client disconnects, so a visitor's Stop, a closed
  tab or a dropped connection cancels the gateway call and the existing `onAbort` path settles:
  completed steps at real spend, the interrupted step at the estimate, one `chat.usage` line with
  outcome `aborted`. Before this the model ran to completion for nobody and the turn wrote no
  usage line at all.
- **The precharge covers a cold cache.** `PROMPT_TOKENS_ESTIMATE` is 14,000 here (13,460 to
  13,528 cache-write tokens measured on Anthropic models on the first turn after a deploy, with
  ten tool schemas); the personal site prices its system prompt at the cache-write rate rather
  than the cache-read rate in `prechargeEstimateUsd`. The reservation is the number the per-IP cap refuses
  on, so it must sit at or above a cold turn, and warm turns settle down afterwards as they always
  did.
- **Nothing fixed sits on the inline demo below `sm`.** `chatStore.ts` carries a
  `demoInView` store (`subscribeDemoInView`, `readDemoInView`, `serverDemoInView`,
  `setDemoInView`; the personal site's `chatStore.ts` follows its hook convention,
  `setInlineDemoInView` and `useInlineDemoInView`, one store either way); the demo frame reports
  itself through an `IntersectionObserver`, and the
  floating launcher and `ScrollToTop` add `max-sm:hidden` while it is in view. Measured before:
  30% of the demo's Send button under the launcher at 390x844 and 360x640, and the scroll button
  over its right-hand chips.
- **Anthropic calls are pinned to Anthropic first (`lib/gateway.ts`, both repos).** Every gateway
  call builds its `providerOptions` with `gatewayProviderOptions(feature, model)`, which keeps the
  tags each route already sent (`site:nexus`, `feature:chat` / `contact-classify`, `env:`) and
  adds `order: ["anthropic"]` for Anthropic models. Measured on the personal site, same gateway:
  the default route, `vertexAnthropic`, wrote the prompt cache on three sequential Anthropic calls
  five seconds apart and never read it (9 of 34 requests in one session paid the write); pinned,
  calls two and three read it. Fallback providers stay available. Mirrored here in the
  integration pass without a live probe; the tags are unchanged.
- **The classifier reads text and stops paying for a model that cannot answer.**
  `classifyInquiry` uses `generateText` plus `parseInquiryClassification` (harmony channel tokens
  and code fences stripped, the outermost object parsed, `acknowledgment` and friends accepted
  for `autoReply`, an unknown category read as `general`, validated against the same schema),
  because `openai/gpt-oss-20b` returned no schema-valid object on 99 of 99 submissions. Around it,
  `createFailureBreaker` from `lib/chat-limits.ts` (`CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES`
  5, `CONTACT_CLASSIFY_PAUSE_MS` one hour) pauses the call per instance after a run of failures;
  the form still delivers with the fixed acknowledgment and the line logs outcome `paused`, the
  sixth outcome both sites share. The code default is `openai/gpt-4.1-nano` on both sites
  (2026-09-13): `anthropic/claude-haiku-4-5`, this site's default before, is not a slug the
  gateway serves (its Haiku is `anthropic/claude-haiku-4.5`, checked against the gateway's model
  list), and nano answered first time through the text parser at $0.1/$0.4 per 1M. Production
  still carries its own `CONTACT_CLASSIFY_MODEL`; set it to that slug or remove it. The breaker
  is what keeps a wrong setting from being paid for all day.
- **Noted means logged.** The not-configured hand-off hint says the request was logged on the
  server and not delivered, tells the assistant not to promise that Dr. Memari will review it or
  reach out, and keeps "noted but not sent" because the system prompt keys on that phrase. When
  a durable store for hand-offs exists
  (Upstash, once attached) this hint is the place to say "recorded" again, and not before.
- **Card copy is in the chat voice (this repo).** `lib/site-facts.ts` builds the instructor fact
  from `FOUNDER_CHAT_NAME`, not `MAJID.name`: the facts card renders that text inside the chat
  surface, where 9.1 applies. The About page it cites keeps the site-wide form.

#### 9.3 Homepage chat section (owner override, 2026-09-13, do not delete)

The homepage carries one added section, "Try our AI", holding the inline AI Consultant chat
between Consulting and Training. This is an explicit exception to the rule against new
homepage chrome and to the PLAN's homepage inventory. It is a product surface, not a widget
strip: the assistant is the first product the company ships. The section is its heading and
one plain line inviting the visitor to ask about their team, then the frame; nothing under the
frame explains the assistant (§9.4).

Cost posture that goes with it: one model, Claude Haiku 4.5, for both the inline frame and the
floating panel (they are one conversation through `chatStore.ts`), prompt caching on, and every
model call still passes through `reserveBudget`, the per-IP daily allowance and the global hard
budget. The dollar budgets in `lib/chat-limits.ts` were not lowered when the model changed;
review them against a week of `chat.usage` lines (`docs/PLAN.md`, follow-ups).

#### 9.4 Chat only (owner decision, 2026-09-13, do not revert)

The site offers a good, plain chatbot and nothing more. On 2026-09-13 the owner scratched the
demo and evaluation work as too complicated and expensive for what it bought, and chose: chat
only, keep the inline section and the floating panel, use a cheaper model, and show visitors
nothing about how the chatbot works or what it costs. So: the chat runs on `anthropic/claude-haiku-4.5`
alone (`lib/chat-models.ts` has one entry, and the route drops any `model` field a client
sends); the Evaluations tab, the live run route, the `evals/` scripts and results, the eval-only
limiter counters, the model picker, the per-reply stats line, the `/how-it-works` page (now a
permanent redirect to `/`), the explainer cards and every line of copy naming models, prices per
token, budgets, caching or the tool count were removed, not hidden; the route streams one
metadata flag (`emailEnabled`) and the cost, token and timing numbers go to the server's
`chat.usage` log line only, which the owner reads; and asked how it works or what it costs, the
assistant says it is a custom AI assistant built by Nexus for this site, does not discuss its
models, prompts, tools, budgets or costs, and offers to put the visitor in touch with Dr. Memari
if they want to build something similar. Every budget, rate limit, approval gate, approval
signature, empty-turn recovery and contact-form metering stayed exactly as it was; they just
stopped being visible. Do not reintroduce a picker, a stats line, a teardown page, a bake-off or
a live evaluation without the owner asking for it by name.

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
