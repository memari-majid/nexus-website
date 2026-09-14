# Nex — Smart Workshop Assistant (consult → recommend → book)

Status: **Design — approved in chat, building.** Owner: Majid Memari.
Date: 2026-09-12. Supersedes the booking-only parts of
`2026-09-12-nexus-workshop-concierge-design.md`.

## 1. Goal

Turn the site chatbot **Nex** into a genuinely smart AI assistant that
*is* the proof of expertise. It should:

1. Give real, useful **AI consulting** in-chat (including "you may not
   need AI for this").
2. **Discover** what the visitor does and needs, then **recommend the
   NVIDIA DLI workshop that fits** — from NVIDIA's real, current
   catalog.
3. Make **booking effortless** via an AI-assisted inline "smart form"
   that auto-fills from the conversation.

This replaces filling NVIDIA's long Cvent form with a conversation that
collects only what Nexus needs to arrange a cohort.

## 2. Scope — three capabilities, one funnel

- **A. Consult.** Answer AI questions crisply; ask discovery questions
  (role, what they build, current pain, team skill level, goal,
  timeline). Never invent numbers, ROI, or client names.
- **B. Recommend.** Map the discovered need to the best-fit workshop in
  the NVIDIA Gen AI catalog. Say plainly which one **Nexus currently
  hosts and teaches** (Building Agentic AI Applications With LLMs), and
  that for other catalog courses Nexus arranges delivery via NVIDIA's
  enterprise **request-training** path (reseller) or points to NVIDIA /
  another certified instructor. Note NVIDIA **adds new workshops
  regularly**.
- **C. Book.** Assisted inline "smart form" that captures the lead and
  files it (existing inquiry pipeline). No live calendar, no in-chat
  payment.

## 3. Business & pricing rules (the guardrails, updated)

These **reverse** the old "no price / NVIDIA bills" stance per owner
direction (2026-09-12):

- **Nexus resells and invoices** the workshop (industry). NVIDIA still
  owns curriculum, cloud labs, assessment, and the certificate.
- **Industry pricing, using NVIDIA's public rate:**
  - **1–20 seats → $500/seat.** Show the live running total.
  - **21–40 seats (large group) → do not quote a fixed total.** Tell
    them **we'll email a tailored quote** (volume discount handled
    off-line). No direct sales handoff in chat.
  - **> 40 → multiple cohorts.** Offer to split; still "we'll email a
    quote."
- **Academia (US) → free**, always. Never charge students/faculty —
  required by the University Ambassador program. No price shown.
- **Max 40 per cohort** for best results.
- Trademark rules unchanged: never "NVIDIA partner / sponsored /
  endorsed." Titles allowed: **DLI Certified Instructor**, **University
  Ambassador**. One *hosted* workshop; the rest are *catalog* items
  Nexus can arrange, not claim to personally teach.

## 4. Data model

### 4.1 `lib/dli.ts` additions (typed source of truth)

- `pricing`: `{ seatPrice: 500, standardMax: 20, cohortMax: 40, currency: "USD",
  academiaFree: true, note: "…" }`
- `catalog`: verified array `{ title, url, blurb, track }[]` of current
  NVIDIA Gen AI workshops (populated from the catalog PDF +
  learn.nvidia.com, HTTP-verified). `hosted: true` flag on the Agentic
  workshop.
- `alwaysNew`: one accurate sentence about NVIDIA's ongoing releases.
- `reseller`: short internal-grounding text on the request-training
  path + `requestTrainingUrl`.

### 4.2 `lib/registration.ts` — new, pure, tested

The form's single source of truth + all derivations.

```
type Audience = "industry" | "academia";
type Delivery = "in-person" | "remote";
type Registration = {
  name?, email?, audience?, organization?, headcount?,
  timing?, delivery?, workshop?, role?, need?
};
```

Pure functions (unit-tested):
- `deriveRegistration(r)` →
  `{ missingRequired, nextField, isComplete, isFreeAcademic,
     pricingTier: "free" | "standard" | "quote" | "multi-cohort",
     seatPrice, estimatedTotal | null, needsSales, needsMultipleCohorts }`
  - required = name, email, audience (+ headcount to price).
  - academia → tier "free", total null.
  - industry headcount ≤ 20 → "standard", total = 500 × n.
  - 21–40 → "quote", total null, needsSales.
  - > 40 → "multi-cohort", needsSales, needsMultipleCohorts.
- `nextField(r)` → ordered next missing field for the card control.

### 4.3 Recommendation — `lib/recommend.ts` — new, pure, tested

`recommendWorkshop({ role, need, level })` → `{ workshop, why, hosted }`
using a small keyword/intent map over `DLI.catalog` (e.g. agents/LLM
apps → Agentic; RAG/knowledge → Adding New Knowledge / RAG; multimodal
→ Multimodal Models; inference/scale → Deploying & Optimizing
Inference; diffusion/images → Diffusion Models). Always returns a
best-fit + honest "why", and whether Nexus hosts it.

## 5. Conversation flow & tool architecture

`useChat` (`@ai-sdk/react@3`) + `streamText` (`ai@6`) via AI Gateway.

- **`recommendWorkshop`** — server tool (execute): returns the mapped
  recommendation so Nex can speak it. Grounded in `DLI.catalog`.
- **`collectRegistration`** — **client-side interaction tool** (no
  `execute`). Nex calls it with the fields gathered so far; the client
  renders `RegistrationCard` from the `tool-collectRegistration` part
  (`state: input-available`), showing captured fields + the control for
  the next missing field. User input → `addToolOutput({ tool,
  toolCallId, output })`; `sendAutomaticallyWhen:
  lastAssistantMessageIsCompleteWithToolCalls` continues the loop. The
  client **accumulates** state across tool parts so partial model
  updates never lose fields.
- **`requestAppointment`** — existing server tool (execute). Final
  submit → `submitInquiry` → inbox. Extended with `workshop`, and
  large-group/quote requests routed to sales.

Flow: consult/discover → `recommendWorkshop` → offer to book →
`collectRegistration` (assisted card auto-filled from the chat) →
`requestAppointment`. Any step can be entered directly (e.g. "just book
the agentic one for 12 people").

## 6. The smart-form card (UX = "inline field cards, assisted")

One evolving card: a compact "captured so far" summary (each field
editable) + one interactive control for the next missing field:
- audience → `Industry` / `University` buttons
- headcount → stepper (1–40) with live price/tier line
- timing → date/window picker (≈6 weeks lead-time hint)
- delivery → `In person` / `Remote` toggle
- name/email/org → inline text
Price line: standard → "$500/seat × N = $X, invoiced by Nexus";
quote → "Group of N — Dr. JN will send a better quote"; academia →
"Free — University Ambassador program". Submit control appears when
required fields are present.

## 7. State-aware follow-ups (explicit owner requirement)

Replace the regex fallback in `lib/chat-suggestions.ts` with logic
driven by the **registration snapshot**: chips = the next missing
field's options in the visitor's voice, never repeating captured
fields, always advancing toward Submit. The model still emits
`SUGGESTIONS:`; the client reconciles against real known/missing state
so chips can't misfire. During consult/recommend, chips advance the
discovery ("We build RAG apps", "We're new to agents", "Recommend a
workshop").

## 8. Routing

- **All workshop leads → one inbox: `memari.majid@hotmail.com`** (the
  existing `WORKSHOP_TO_EMAIL` default) via `source: "chat-workshop"`.
  Large-group/quote requests go to the same inbox — Majid replies with
  a quote and gets back to them. No separate sales address, no
  user-facing Dr. JN handoff.
- The lead email includes the tier (standard / quote / multi-cohort) so
  Majid knows a quote is needed.
- Visitor confirmation email unchanged (branded, "we'll get back to you
  by email").

## 9. Files

**Add:** `lib/registration.ts`, `lib/recommend.ts`,
`app/components/RegistrationCard.tsx`, Vitest + `*.test.ts` for the pure
libs.
**Change:** `lib/dli.ts` (pricing, catalog, reseller, salesContact),
`lib/assistant.ts` (consult/discover/recommend prompt + tool
instructions + pricing tiers), `app/api/chat/route.ts` (add
`recommendWorkshop` + `collectRegistration`; extend `requestAppointment`
routing + `sendAutomaticallyWhen`), `app/components/ChatWidget.tsx`
(render tool card, `addToolOutput`), `lib/chat-suggestions.ts`
(state-driven), `lib/workshop-email.ts` (tiered pricing copy). All leads
keep routing through the existing `chat-workshop` → `WORKSHOP_TO_EMAIL`
path in `lib/inquiry.ts` (no change needed there).
**Reuse:** inquiry pipeline, email, streaming, SUGGESTION marker.

## 10. Model

Assistant quality depends on the Gateway model. Tool-calling +
extraction + recommendation need a capable model; `gpt-oss-20b` is too
weak (it leaks harmony tokens and slot-fills poorly). Recommend setting
`AI_CHAT_MODEL` to a strong Anthropic model on Vercel (e.g.
`anthropic/claude-haiku-4-5` minimum, `sonnet` for best consult
quality). Confirm exact id against the Gateway model list at build.

## 11. Testing

- **Unit (Vitest):** `deriveRegistration` (tiers, pricing, free,
  multi-cohort, next field), `recommendWorkshop` (intent → workshop),
  state-driven suggestion resolver.
- **Typecheck + lint + `next build`** clean.
- **Manual on preview:** consult path, recommend path, industry ≤20
  (price), 21–40 (Dr. JN quote), academia (free), >40 (multi-cohort),
  tool-failure → email fallback.

## 12. Deployment

Commit only this feature's files (owner's redesign WIP stays
untouched). Local verify → **Vercel preview** → owner clicks through →
promote to **production** only after sign-off. Never deploy the
half-seen redesign to prod blind.

## 13. Out of scope (v1)

Cvent API / in-chat payment (Stripe), live calendar/availability,
Twilio voice booking, authoring new catalog data beyond verified NVIDIA
titles.
