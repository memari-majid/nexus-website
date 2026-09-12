# Nexus AI chat: NVIDIA workshop concierge + automated visitor email

**Date:** 2026-09-12
**Status:** Design — awaiting review
**Scope:** `Sites/nexus-website`

> **Cross-reference (redesign decision 6):** the traditional contact **form**
> and the displayed email/phone are being retired — the chat is the **only**
> communication channel. The inquiry/email **backend** in this spec
> (`submitInquiry`, classify, Resend) stays: it now serves the chat tools only.
> The in-chat email fallback becomes a quiet last resort, not a promoted CTA.
> See `2026-09-12-nexus-website-redesign-design.md`.

## Problem

The site chat and contact pipeline are functional but under-automated:

- A visitor who books in chat or submits the contact form gets **nothing in
  their inbox**. `submitInquiry` generates a personalized acknowledgment
  (`autoReply`) and shows it on screen, but only emails the *team*.
- The chat's one action (`requestAppointment`) captures a free-text `topic`
  only. Workshop requests arrive under-specified, so the team has to chase the
  basics by email before anything can be scheduled.
- The assistant does not lead clearly with the one thing that sells the
  workshop: **we are NVIDIA certified** (DLI Certified Instructor + University
  Ambassador), and the single live workshop.

The owner's goal: make the chat an **NVIDIA-first, self-serve workshop
concierge** and make visitor communication **as automated as possible** —
ideally the team's only manual step is confirming a date with NVIDIA.

### Guiding principle — no call, read at NVIDIA, just collect scheduling info

- **No "book a call."** There is no phone-call CTA and the bot never promises a
  call-back. The whole interaction is self-serve and resolved by email.
- **Full detail lives at NVIDIA.** For curriculum, prerequisites, pricing, and
  the certificate, the bot points visitors to NVIDIA's own pages (course
  outline, catalog, `DLI.references`) rather than exhaustively explaining or
  routing to a human.
- **The bot's job is the scheduling intake.** Its one concrete task is to
  gather exactly what's needed to schedule the workshop, file it, and confirm
  by email.

## Goals

1. **Self-serve scheduling intake.** The tool collects exactly the facts needed
   to schedule a workshop, conversationally, and files a complete,
   ready-to-schedule request — no call.
2. **Automated visitor confirmation.** Every filed inquiry with an email address
   triggers a branded confirmation email to the visitor, automatically — the
   message says the team will follow up **by email** to confirm the date.
3. **"Email me the NVIDIA details" action.** The bot can email a branded
   one-pager about the workshop on request, built from real `DLI` data, with
   the official NVIDIA links for full detail.

## Non-goals (explicitly out of scope)

- No live calendar / instant-slot booking (NVIDIA scheduling runs on a ~6-week
  lead; owner declined a calendar integration).
- No model upgrade (stays on the AI Gateway model already configured).
- No lead scoring, multi-inbox routing, or automated follow-up cron.
- No knowledge-base/RAG rewrite — the existing inline system prompt stays; we
  only add the NVIDIA-first framing and the new tool.

## Current architecture (reference)

- `app/api/chat/route.ts` — `streamText` via AI Gateway; one tool
  `requestAppointment` → `submitInquiry`.
- `lib/assistant.ts` — `nexusAssistantSystem()` (shared facts) +
  `nexusChatSystem()` (chat voice, booking rules, suggestion chips).
- `lib/inquiry.ts` — `submitInquiry()`: validates, classifies
  (`classifyInquiry`), emails the **team** via Resend, returns `autoReply`.
- `lib/inquiry-ai.ts` — `classifyInquiry()` → `{ category, autoReply }`.
- `lib/dli.ts` — typed NVIDIA workshop data (title, length, summary, what
  NVIDIA vs Nexus provide, logistics, `academia` free-for-universities note,
  `references`). Six-week lead time lives here (`logistics`, `academia.text`).
- `lib/site.ts` — `SITE` (name, email `info@nexusaisolution.net`, phone).
- Email today is inlined in `inquiry.ts` using `Resend` directly; dev mode
  (no `RESEND_API_KEY`) logs instead of sending.

## Design

### Component 1 — Shared email helper: `lib/email.ts`

Extract email delivery into one module so all three paths share it.

```
type SendArgs = { to: string; subject: string; text: string; html?: string; replyTo?: string };
async function sendEmail(args: SendArgs): Promise<{ ok: true } | { ok: false; error: string }>
```

- Constructs the `Resend` client from `RESEND_API_KEY`; `from` =
  `RESEND_FROM_EMAIL` (same default as today).
- **Dev mode:** when no key, logs a structured preview and returns `{ ok: true }`
  (matches current behavior — local dev never hard-fails on email).
- A small, reusable branded HTML wrapper `renderEmail({ heading, bodyHtml })`:
  Nexus header, the body, and a footer line with company name, site URL,
  contact email/phone, and a one-line "NVIDIA DLI Certified Instructor &
  University Ambassador" note. Plain, professional, inline-styled (email-safe),
  no external CSS/images. Every HTML email ships with a `text` fallback.

`inquiry.ts` is refactored to send the **team** notification through
`sendEmail` (behavior unchanged), so there is a single email code path.

### Component 2 — Automated visitor confirmation (in `submitInquiry`)

After the team notification is sent successfully, **and** if the visitor
provided an email:

- Send the visitor a branded confirmation via `sendEmail`:
  - `subject`: e.g. `"We got your message — Nexus AI Solutions"`
  - `html`/`text`: the `autoReply` already produced by `classifyInquiry`,
    wrapped in the branded template, plus a short "what happens next" line that
    says the team will follow up **by email** to confirm the workshop date —
    never "we'll call you".
  - `replyTo`: `SITE.email` (visitor replies reach the team inbox).
- **Best-effort:** failure is logged and ignored — it never changes the
  function's return value. The team was already notified; the confirmation is a
  bonus, not a gate.
- Voice/phone-only inquiries (no email) are skipped automatically.

No signature change to `submitInquiry`; the contact route and chat tool keep
working unchanged.

### Component 3 — Smart workshop capture (upgrade `requestAppointment`)

Keep a **single booking tool** (per decision). Extend its input schema with
optional, structured workshop fields. For a plain "book a call" these stay
empty; for a workshop the bot fills them:

| Field | Type | Notes |
|---|---|---|
| `name` | string, required | existing |
| `email` | string email, required | existing |
| `audience` | enum `industry` \| `academia`, optional | drives the free-for-US-universities path |
| `workshop` | string, optional | defaults to the one live workshop title |
| `when` | string, optional | requested date/timeframe; bot enforces **≥ 6 weeks** notice |
| `delivery` | enum `in-person` \| `remote`, optional | |
| `headcount` | integer, optional, **max 40** | bot caps at 40 per cohort |
| `phone` | string, optional | existing |
| `organization` | string, optional | existing |

- The tool composes these into a structured message for `submitInquiry`
  (`source: "chat-workshop"`), so the team email arrives complete and
  ready-to-schedule. This files a **scheduling request**, not a call-back.
- `headcount` is capped at 40 in the schema; the prompt tells the bot to note
  the 40-seat-per-cohort limit and offer multiple cohorts for larger groups
  (so it never sends > 40).
- The tool result note stays: confirm briefly **by email**, never invent a
  calendar slot and never promise a phone call.

### Component 4 — "Email me the NVIDIA details" action (new tool `emailWorkshopInfo`)

New chat tool the bot calls when a visitor asks to be sent information (or when
the bot offers and they accept).

```
input: { name: string; email: string; audience?: "industry" | "academia" }
```

- Builds a branded one-pager from **typed `DLI` data** (never hard-coded):
  workshop title, "Eight hours · hands-on", what's covered (`summary` /
  `outline`), "NVIDIA provides everything / Nexus hosts + teaches"
  (`nvidiaProvides` / `weProvide`), the **free-for-US-universities + 6-week**
  note when `audience = academia`, and the official NVIDIA links
  (`DLI.references`, `courseUrl`).
- Emails it to the visitor via `sendEmail` (branded HTML + text), `replyTo`
  = `SITE.email`.
- Also sends the team a light heads-up ("X requested workshop info via chat")
  so the warm lead is captured. This path does **not** go through
  `classifyInquiry`/`autoReply`, so the visitor never gets a duplicate
  confirmation email.
- On failure, the tool returns an error note and the bot falls back to giving
  `SITE.email` (same pattern as the booking tool today).

### Component 5 — NVIDIA-first prompt updates (`lib/assistant.ts`)

- `nexusChatSystem()`: open by establishing **we are NVIDIA certified** (DLI
  Certified Instructor + University Ambassador) and the single live workshop;
  keep other services secondary ("they only need to know about NVIDIA").
- **No call CTA.** The bot never offers or promises a phone call. Its job is to
  collect the scheduling info and confirm by email. For full detail
  (curriculum, prerequisites, pricing, certificate), point visitors to NVIDIA's
  own pages (`courseUrl`, catalog, `DLI.references`) — don't recite everything.
- Add scheduling guidance: for a workshop, gather **audience
  (industry/academia), when (≥ 6 weeks), in person or remote, and how many
  (≤ 40)** before calling `requestAppointment` — asking two at a time, staying
  light. Tell U.S. academic audiences the workshop is free with six weeks'
  notice.
- Describe the new `emailWorkshopInfo` action (offer to email details; collect
  name + email first; do not promise attachments beyond the email itself).
- All existing guardrails are preserved verbatim (never "NVIDIA
  partner/sponsored", NVIDIA owns pricing/content/certificate, no invented
  workshops, founder-bio rules, etc.).

### Component 6 — Chat UI copy (`app/components/ChatWidget.tsx`)

Remove the call-first framing so the UI matches the no-call flow:

- `QUICK_PROMPTS`: replace `"Book a call"` with a scheduling prompt, e.g.
  `"Schedule the NVIDIA workshop"`; keep the workshop and free-for-universities
  prompts.
- Empty-state greeting: replace "Want to set up a call? Tell me what you
  need…" with scheduling-first copy (tell me when, in person or remote, and how
  many, and I'll get it scheduled).

## Data flow

```
Visitor → chat
  ├─ asks to schedule the workshop
  │     bot gathers audience/when/delivery/headcount (+name/email)
  │     → requestAppointment tool → submitInquiry
  │           → team email (complete request)   [Resend via lib/email]
  │           → visitor confirmation email        [best-effort]
  │
  └─ asks "email me the details"
        bot gathers name/email (+audience)
        → emailWorkshopInfo tool
              → visitor one-pager email            [lib/email]
              → team heads-up email                [lib/email]

Contact form → /api/contact → submitInquiry
        → team email → visitor confirmation email  [best-effort]
```

## Error handling

- Team notification failure → inquiry returns failure (unchanged today).
- Visitor confirmation / info-email / team heads-up failures → logged,
  best-effort, never block the primary action.
- Dev mode (no `RESEND_API_KEY`) → all sends log a preview and report success.
- Tool-level failures surface a short apology + `SITE.email` fallback.

## Testing

- **`lib/email.ts`**: dev-mode returns ok and logs; builds HTML + text; applies
  `from`/`replyTo`. (Resend client mocked.)
- **`submitInquiry`**: with email present → two sends (team + visitor);
  phone-only → team only; visitor-send failure → still returns `ok: true`.
- **`requestAppointment`**: composes workshop fields into the message; rejects
  `headcount > 40`; omitting workshop fields still files a general request.
- **`emailWorkshopInfo`**: academia vs industry produces the right content;
  sends visitor + team; content derives from `DLI` (snapshot/string checks).
- Manual: run the chat locally (dev mode) and confirm logged previews for a
  workshop booking and an info request.

## Files touched

- **New:** `lib/email.ts`, `lib/workshop-email.ts` (one-pager content builder),
  tests alongside.
- **Changed:** `lib/inquiry.ts` (use `sendEmail`; add visitor confirmation),
  `app/api/chat/route.ts` (extend `requestAppointment`; add `emailWorkshopInfo`),
  `lib/assistant.ts` (NVIDIA-first framing, no-call + scheduling guidance),
  `app/components/ChatWidget.tsx` (remove call-first copy).

## Open defaults (chosen, change if desired)

- Confirmation subject line wording.
- 40 is a hard per-cohort cap in the schema (larger groups → multiple cohorts).
- Team heads-up on info requests is on (cheap lead capture); can be dropped.
