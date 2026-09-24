# NVIDIA-Green Redesign Implementation Plan

> **SUPERSEDED IN PART (2026-09-13). Do NOT execute this plan as written.**
> This plan shipped on 2026-09-12 and is kept as a record. Two of its positioning
> decisions have since been reversed by the owner, so the copy in Task 7 and the
> academia tasks is stale. Current rules live in `AGENTS.md` and `docs/PLAN.md`.
>
> 1. **Market geography.** The hero copy below ("brought to Utah") and every
>    Utah-focused messaging note are reversed. Nexus is based in Sandy, Utah and
>    serves companies **across the United States**, in person at the client offices
>    or online. The shipped hero now reads "AI consulting and training, across the
>    United States". See `AGENTS.md` section 10.
> 2. **Free for academia.** Reversed. The site is **industry-only**. Never call
>    consulting or training free.
>
> The color system, CTA wiring, and contact-channel tasks here still describe what
> shipped.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the nexus-website homepage and `/nvidia-dli-workshops` page into an NVIDIA-green, dark-premium, community-contribution site where the chatbot is the only contact channel.

**Architecture:** Introduce a Tailwind v4 `brand` green color scale in `globals.css`, repoint all `sky-*` accents to `brand-*`, and restyle the shared utility classes (buttons/links). Rewrite the homepage hero + section order and the workshop page around NVIDIA-first, free-for-academia, Utah-focused messaging. Wire every "Schedule the workshop" CTA to open the existing `ChatWidget` via a decoupled `window` CustomEvent, and remove the traditional contact form / displayed email + phone.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v4 (`@import "tailwindcss"` + `@theme`), `next-themes` (dark default), TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-12-nexus-website-redesign-design.md`
(related: `docs/superpowers/specs/2026-09-12-nexus-workshop-concierge-design.md`)

## Global Constraints

- **No unit-test framework exists** (scripts: `next dev|build|start|lint`). The per-task "test cycle" is: `npm run lint` + `npm run build` clean, plus the stated visual/grep check. Do **not** add a test framework.
- **Verify commands:** `npm run lint` and `npm run build` must both pass at the end of every task. Run `npm run dev` for visual checks.
- **Contrast (WCAG AA):** text ≥ 4.5:1, large text / UI ≥ 3:1, in **both** themes. **White text on brand green is prohibited** (~2.5:1). Green CTAs use near-black (`zinc-950`) text.
- **Trademark stays:** a short accurate NVIDIA trademark + independence notice must remain on every page showing the NVIDIA mark (`NvidiaTrademark` / footer).
- **NVIDIA guardrails (verbatim):** never "NVIDIA partner", "NVIDIA-sponsored", or "endorsed by NVIDIA"; never imply NVIDIA endorses Nexus. NVIDIA owns pricing/content/curriculum/assessment/certificate; Nexus only hosts + teaches.
- **"University Ambassador" is an NVIDIA credential/program name — never rename it.** The academia-terminology change touches ONLY customer-facing "free for universities" offer copy. Never rename real institutions (University of Pennsylvania/Utah, SIU) or the "University Ambassador Program".
- **No non-profit claim:** community/mission framing only; never state Nexus is a non-profit or "makes no profit" (it is an LLC).
- **Utah is emphasis, not eligibility:** the free academic offer stays scoped to U.S. academic institutions per the Ambassador program.
- **Contact = chatbot only:** no contact form, no displayed email/phone; keep one quiet `info@nexusaisolution.net` fallback for when chat can't load, and keep the Sandy, UT address.

---

## File Structure

- **Create** `lib/chat-events.ts` — shared event contract to open the chat from anywhere (`OPEN_CHAT_EVENT` + `openChat()`).
- **Create** `app/components/ScheduleButton.tsx` — `"use client"` reusable CTA button that calls `openChat()`; usable inside Server Components.
- **Modify** `app/globals.css` — `@theme` brand green scale; restyle `.btn-primary`, `.gradient-text`, `.text-link`, focus; align `.nvidia-mark`/`.link-nvidia`.
- **Modify** `app/components/ChatWidget.tsx` — green accent; listen for `OPEN_CHAT_EVENT`; remove "Prefer a form?" link; add `info@` fallback line; update quick prompts.
- **Modify** `app/components/NvidiaLogo.tsx` — refine `TRADEMARK_SHORT` copy.
- **Modify** `lib/dli.ts`, `lib/faq.ts`, `app/nvidia-dli-workshops/page.tsx` — academia-terminology offer copy.
- **Modify** `app/components/NavBar.tsx` — "AI" accent → brand; CTA → "Schedule the workshop" (opens chat); "Contact" → "Schedule".
- **Modify** `app/components/HomePageContent.tsx` — NVIDIA-first/community/Utah hero, section reorder, workshop card restyle, footer drops email/phone, CTAs open chat.

Each task ends with `npm run lint && npm run build` passing and a commit.

> **Note on working tree:** this repo has extensive pre-existing uncommitted changes in these files. Each commit will stage **only the files that task touches**; pre-existing edits in those same files ride along — that is expected and acceptable per the repo's current state.

---

### Task 1: Brand green scale + design-system classes

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: Tailwind color utilities `*-brand-{50..950}` (e.g. `text-brand-500`, `bg-brand-500`); restyled `.btn-primary` (green, near-black text). Later tasks use `brand-*` utilities in place of `sky-*`.

- [ ] **Step 1: Add the brand scale in an `@theme` block**

After `@import "tailwindcss";` and the `@custom-variant dark (...)` line in `app/globals.css`, add:

```css
@theme {
  --color-brand-50: #f2f9e6;
  --color-brand-100: #e2f0c8;
  --color-brand-200: #c7e293;
  --color-brand-300: #a9d157;
  --color-brand-400: #8ed000; /* dark-mode hover / bright accent */
  --color-brand-500: #76b900; /* NVIDIA brand green */
  --color-brand-600: #5b8c00; /* light-mode button surface */
  --color-brand-700: #4f7a00; /* light-mode link text (AA on white) */
  --color-brand-800: #3f6200;
  --color-brand-900: #2f4a00;
  --color-brand-950: #1a2900;
}
```

- [ ] **Step 2: Repoint `.btn-primary` to green with near-black text (both themes)**

Replace the `.btn-primary` and `.dark .btn-primary` rules so the primary button is brand green with `zinc-950` text in both themes (white-on-green is prohibited):

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: #76b900;
  padding: 0.75rem 1.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #09090b; /* zinc-950 — AA (~8:1) on brand green */
  transition: background 0.2s ease;
}
.btn-primary:hover { background: #8ed000; }
.dark .btn-primary { background: #76b900; color: #09090b; }
.dark .btn-primary:hover { background: #8ed000; }
```

- [ ] **Step 3: Repoint `.gradient-text` and `.text-link` accents to brand green**

```css
.gradient-text { color: #4f7a00; }
.dark .gradient-text { color: #8ed000; }
```

Leave `.text-link` structure but change its hover/decoration to use brand tones (`text-decoration-color: #a9d157;` on hover in light, `#5b8c00` in dark). Leave `.nvidia-mark` / `.link-nvidia` as-is (already accessible green shades).

- [ ] **Step 4: Verify lint + build pass**

Run: `npm run lint && npm run build`
Expected: both succeed, no type/lint errors.

- [ ] **Step 5: Visual check**

Run `npm run dev`, open `/`. Expected: primary buttons are green with near-black text in both light and dark (toggle via the theme button). No white text on green anywhere.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "feat(design): add NVIDIA brand green scale and green primary buttons"
```

---

### Task 2: Chat open-event contract + ScheduleButton

**Files:**
- Create: `lib/chat-events.ts`
- Create: `app/components/ScheduleButton.tsx`

**Interfaces:**
- Produces: `OPEN_CHAT_EVENT: "nexus:open-chat"`, `openChat(): void`, and `<ScheduleButton variant?: "primary" | "secondary">{children}</ScheduleButton>`. Tasks 3, 6, 7 consume these; Task 3 (ChatWidget) listens for `OPEN_CHAT_EVENT`.

- [ ] **Step 1: Create the event helper**

Create `lib/chat-events.ts`:

```ts
/** Decoupled signal to open the site chat widget from any component. */
export const OPEN_CHAT_EVENT = "nexus:open-chat";

/** Dispatch from a click handler to open the ChatWidget. No-op during SSR. */
export function openChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}
```

- [ ] **Step 2: Create the reusable CTA button**

Create `app/components/ScheduleButton.tsx`:

```tsx
"use client";

import { openChat } from "@/lib/chat-events";

export function ScheduleButton({
  children = "Schedule the workshop",
  variant = "primary",
  className = "",
}: {
  children?: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openChat}
      className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} ${className}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Verify lint + build pass**

Run: `npm run lint && npm run build`
Expected: both succeed (component is unused so far — that's fine).

- [ ] **Step 4: Commit**

```bash
git add lib/chat-events.ts app/components/ScheduleButton.tsx
git commit -m "feat(chat): add open-chat event + reusable ScheduleButton CTA"
```

---

### Task 3: ChatWidget — green accent, open-event, chatbot-only copy

**Files:**
- Modify: `app/components/ChatWidget.tsx`

**Interfaces:**
- Consumes: `OPEN_CHAT_EVENT` from `lib/chat-events.ts`.

- [ ] **Step 1: Listen for the open-chat event**

Add the import `import { OPEN_CHAT_EVENT } from "@/lib/chat-events";` and, inside `ChatWidget`, an effect that opens the panel when the event fires:

```tsx
useEffect(() => {
  const onOpen = () => setOpen(true);
  window.addEventListener(OPEN_CHAT_EVENT, onOpen);
  return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
}, []);
```

- [ ] **Step 2: Repoint accents sky → brand green**

In `ChatWidget.tsx`, replace sky accent utilities with brand equivalents:
- launcher button: `bg-sky-600 … hover:bg-sky-500 … focus:ring-sky-400` → `bg-brand-500 … hover:bg-brand-400 … focus:ring-brand-500` (keep near-black icon: add `text-zinc-950`).
- "Powered by AI" pill, quick-prompt hovers, suggestion-chip hovers, input focus ring, the `[&_a]` link color: swap `sky-*` → `brand-*` (use `brand-700` in light, `brand-400` in dark for text/links).

- [ ] **Step 3: Update quick prompts + remove the form link + add fallback**

Replace `QUICK_PROMPTS` with scheduling-first, academia wording:

```tsx
const QUICK_PROMPTS = [
  "Schedule the NVIDIA workshop",
  "Is it free for academia?",
  "Can you host it for my team?",
];
```

Remove the "Prefer a form? / Contact page" block at the bottom of the panel and replace it with a quiet fallback line:

```tsx
<p className="text-center text-[11px] text-zinc-500 dark:text-zinc-600">
  Trouble with chat? Email{" "}
  <a href="mailto:info@nexusaisolution.net" className="underline hover:text-zinc-800 dark:hover:text-zinc-300">
    info@nexusaisolution.net
  </a>
</p>
```

- [ ] **Step 4: Verify lint + build + visual**

Run: `npm run lint && npm run build`
Then `npm run dev`: open `/`, click the launcher → panel opens; green accents; quick prompts updated; no "Contact page" link; fallback email shows.

- [ ] **Step 5: Commit**

```bash
git add app/components/ChatWidget.tsx
git commit -m "feat(chat): green accent, open-event listener, chatbot-only copy + info@ fallback"
```

---

### Task 4: Trademark short notice copy

**Files:**
- Modify: `app/components/NvidiaLogo.tsx:15-16`

- [ ] **Step 1: Refine `TRADEMARK_SHORT`**

Replace the `TRADEMARK_SHORT` value with a short, accurate notice that also carries the credential:

```ts
export const TRADEMARK_SHORT =
  "NVIDIA® and the NVIDIA logo are trademarks of NVIDIA Corporation. Majid Memari is an NVIDIA DLI Certified Instructor & University Ambassador; Nexus AI Solutions LLC is independent and not endorsed by NVIDIA.";
```

Leave `TRADEMARK_NOTICE` (full form) unchanged.

- [ ] **Step 2: Verify + confirm render**

Run: `npm run lint && npm run build`. Then `npm run dev`, scroll to the homepage footer and confirm the new notice renders.

- [ ] **Step 3: Commit**

```bash
git add app/components/NvidiaLogo.tsx
git commit -m "copy: trademark notice keeps attribution + certified-instructor credential"
```

---

### Task 5: Academia-terminology offer copy

**Files:**
- Modify: `lib/dli.ts:70-71`
- Modify: `lib/faq.ts:25-26`
- Modify: `app/nvidia-dli-workshops/page.tsx:176-177`

> Scope: ONLY the customer-facing "free for universities" offer wording. Do NOT touch "University Ambassador", "University Ambassador Program", or real institution names.

- [ ] **Step 1: Update `lib/dli.ts` academia heading + text**

```ts
  academia: {
    heading: "Free for academia",
    text: "We teach this workshop at no cost to academic institutions in the United States — students, faculty, and researchers. Just give us six weeks' notice.",
  },
```

- [ ] **Step 2: Update the FAQ free-workshop Q/A (`lib/faq.ts:25-26`)**

```ts
    q: "Do you offer free workshops for academia?",
    a: "Yes. We teach the NVIDIA DLI workshop at no cost to academic institutions in the United States — students, faculty, and researchers. Scheduling and lab access run through NVIDIA's University Ambassador Program, so give us at least six weeks' notice and we will arrange it.",
```

- [ ] **Step 3: Update workshop page body copy (`app/nvidia-dli-workshops/page.tsx:176-177`)**

Change "Universities can bring the same workshop to faculty, researchers, and students…" to "Academic institutions can bring the same workshop to faculty, researchers, and students through the DLI University Ambassador Program." (Keep the "University Ambassador Program" name intact.)

- [ ] **Step 4: Verify no stray credential renames**

Run: `grep -n "academia\|academic institutions" lib/dli.ts lib/faq.ts` → shows the new copy.
Run: `grep -n "University Ambassador" lib/dli.ts app/nvidia-dli-workshops/page.tsx` → credential/program name still present and unchanged.
Run: `npm run lint && npm run build`.

- [ ] **Step 5: Commit**

```bash
git add lib/dli.ts lib/faq.ts app/nvidia-dli-workshops/page.tsx
git commit -m "copy: use 'academia' umbrella for the free-workshop offer"
```

---

### Task 6: NavBar — brand accent + Schedule CTA

**Files:**
- Modify: `app/components/NavBar.tsx`

**Interfaces:**
- Consumes: `openChat` from `lib/chat-events.ts`.

- [ ] **Step 1: Repoint the "AI" accent**

`app/components/NavBar.tsx:44`: change `text-sky-600 dark:text-sky-400` → `text-brand-600 dark:text-brand-400`.

- [ ] **Step 2: Swap the desktop + mobile CTA to open chat**

Import `openChat`. Replace both `<Link href="/contact" className="btn-primary …">Get in Touch</Link>` CTAs (desktop ~line 59-64, mobile ~line 99-105) with a button that opens the chat:

```tsx
<button type="button" onClick={() => { setMenuOpen(false); openChat(); }} className="btn-primary btn-compact">
  Schedule the workshop
</button>
```

(Desktop version: omit `setMenuOpen(false)`; use `onClick={openChat}`.)

- [ ] **Step 3: Change the "Contact" nav item to "Schedule" (opens chat)**

In `NAV_ITEMS`, replace `{ label: "Contact", href: "/contact" }` with a "Schedule" entry rendered as a button that calls `openChat()` (render nav items that have no `href` as buttons), OR simplest: drop "Contact" from `NAV_ITEMS` and rely on the CTA button. Choose the drop-from-NAV_ITEMS approach to avoid mixing links and buttons in the map.

- [ ] **Step 4: Verify lint + build + visual**

Run: `npm run lint && npm run build`. Then `npm run dev`: nav "AI" is green; the nav CTA reads "Schedule the workshop" and opens the chat on desktop and mobile; no "Contact" link remains.

- [ ] **Step 5: Commit**

```bash
git add app/components/NavBar.tsx
git commit -m "feat(nav): brand-green accent, 'Schedule the workshop' CTA opens chat"
```

---

### Task 7: Homepage — NVIDIA-first / community / Utah

**Files:**
- Modify: `app/components/HomePageContent.tsx`

**Interfaces:**
- Consumes: `<ScheduleButton>` (Task 2). Add `import { ScheduleButton } from "@/app/components/ScheduleButton";`.

- [ ] **Step 1: Rewrite the hero (lines ~75-106)**

Replace the hero inner content so it leads with the credential + community/Utah message and opens the chat. Use this copy:

```tsx
<div className="relative z-10 mx-auto max-w-3xl text-center">
  <Reveal>
    <div className="flex justify-center">
      <NvidiaBadge variant="outline" />
    </div>
  </Reveal>
  <Reveal delay={80}>
    <h1 className="mt-8 text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-7xl sm:leading-[1.05]">
      NVIDIA AI workshops, <span className="gradient-text">brought to Utah</span>
    </h1>
  </Reveal>
  <Reveal delay={160}>
    <p className="mx-auto mt-8 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
      We host and teach NVIDIA&apos;s Deep Learning Institute workshop as a certified instructor —
      <strong className="font-semibold text-zinc-800 dark:text-zinc-200"> free for academia</strong>, and hosted for industry teams.
      NVIDIA provides the curriculum, GPU labs, and certificate; we bring it to the Utah community.
    </p>
  </Reveal>
  <Reveal delay={220}>
    <div className="mt-12 flex flex-wrap justify-center gap-3">
      <ScheduleButton>Schedule the workshop</ScheduleButton>
      <Link href="/nvidia-dli-workshops" className="btn-secondary">See the workshop</Link>
    </div>
  </Reveal>
</div>
```

(The `NvidiaBadge` import already exists in this file.)

- [ ] **Step 2: Reorder — Training (NVIDIA) leads; demote Consulting**

Move the entire `#training` section to directly follow the hero (above `#consulting`). Keep the `#consulting` section but place it after training. No copy change required in consulting beyond accent inheritance.

- [ ] **Step 3: Restyle the workshop card's status as a green chip**

In the training section, change the "Available now" status line (`{DLI.workshop.status}`) into a green chip:

```tsx
<span className="inline-flex items-center rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
  {DLI.workshop.status}
</span>
```

Change the training-section CTA `<Link href="/contact" className="btn-primary">Request a workshop</Link>` to `<ScheduleButton>Schedule the workshop</ScheduleButton>`.

- [ ] **Step 4: Footer — drop email/phone, keep address + trademark**

In the footer (lines ~240-247), remove the `<p>` containing the `mailto:` + `phoneDisplay`. Keep the `<address>` (Sandy, UT) and the `© … {TRADEMARK_SHORT}` line. Keep `NvidiaBadge`.

- [ ] **Step 5: Verify lint + build + visual**

Run: `npm run lint && npm run build`. Then `npm run dev`, open `/`:
- hero leads with the NVIDIA credential badge + "brought to Utah" + free-for-academia line;
- Training section appears right under the hero; Consulting is below it;
- green "Available now" chip; hero + training CTAs open the chat;
- footer has the address + trademark, **no email/phone**.
Toggle dark/light — contrast holds, no white-on-green.

- [ ] **Step 6: Commit**

```bash
git add app/components/HomePageContent.tsx
git commit -m "feat(home): NVIDIA-first community/Utah hero, training-led order, chat CTAs, footer trims contact"
```

---

### Task 8: Workshop page — palette + chat CTA

**Files:**
- Modify: `app/nvidia-dli-workshops/page.tsx`

**Interfaces:**
- Consumes: `<ScheduleButton>` (Task 2).

- [ ] **Step 1: Repoint accents + the NVIDIA logo color**

Replace any `text-sky-*` / `decoration-sky-*` accents on this page with `brand-*` equivalents. The NVIDIA logo mark may keep `text-[#76b900]` (brand green).

- [ ] **Step 2: Primary CTA opens the chat**

Replace the page's primary CTA `<Link href="/contact" className="btn-primary">Request a private workshop</Link>` (near line 226-229) with `<ScheduleButton>Schedule the workshop</ScheduleButton>`. Add `import { ScheduleButton } from "@/app/components/ScheduleButton";`. Keep the "All training" secondary link.

- [ ] **Step 3: Confirm trademark notice stays**

Verify the `{TRADEMARK_NOTICE}` block near the page bottom (line ~238-240) remains.

- [ ] **Step 4: Verify lint + build + visual**

Run: `npm run lint && npm run build`. Then `npm run dev`, open `/nvidia-dli-workshops`: green accents; primary CTA opens the chat; References list + trademark notice intact.

- [ ] **Step 5: Commit**

```bash
git add app/nvidia-dli-workshops/page.tsx
git commit -m "feat(workshop): brand palette + 'Schedule the workshop' chat CTA"
```

---

### Task 9: Full verification pass

**Files:** none (QA only)

- [ ] **Step 1: Clean build + lint**

Run: `npm run lint && npm run build`. Expected: both pass with no errors.

- [ ] **Step 2: Grep for leftover sky accents in touched files**

Run: `grep -rn "sky-" app/components/NavBar.tsx app/components/ChatWidget.tsx app/components/HomePageContent.tsx app/nvidia-dli-workshops/page.tsx`
Expected: no brand/accent `sky-*` left (any remaining must be intentional non-accent use).

- [ ] **Step 3: Manual QA matrix**

In `npm run dev`, check `/` and `/nvidia-dli-workshops` at mobile (375px) and desktop widths, in **both** themes:
- green accents + green primary buttons (near-black text), no white-on-green;
- every "Schedule the workshop" CTA (hero, nav, training, workshop page) opens the chat;
- no contact form, no displayed email/phone; `info@` fallback present in chat; address + trademark present;
- keyboard focus rings visible; `Reveal` animations still run.

- [ ] **Step 4: Final commit (if any QA fixes were needed)**

```bash
git add -A
git commit -m "fix(redesign): QA pass adjustments"
```

---

## Self-Review

- **Spec coverage:** color system → T1; chat-as-contact + CTAs → T2/T3/T6/T7/T8; trademark kept/refined → T4; academia terminology → T5; NVIDIA-first/community/Utah hero + reorder + footer trim → T7; workshop page → T8; accessibility/verification → every task + T9. Positioning guardrails (no non-profit claim, Utah-as-emphasis, NVIDIA-owns-product) are encoded in the hero/offer copy and Global Constraints.
- **Placeholders:** none — every step has exact code, copy, or commands.
- **Type/name consistency:** `OPEN_CHAT_EVENT` / `openChat` (T2) are consumed verbatim in T3/T6; `ScheduleButton` (T2) consumed in T6/T7/T8; `brand-*` utilities (T1) used in T3/T6/T7/T8.
- **Deferred (separate plan):** concierge backend (new chat tools, richer intake, auto-reply email, `lib/email.ts`) per the concierge spec; `/contact` page repurpose/retire; rolling the palette to `/about` + `/about/[person]`.
