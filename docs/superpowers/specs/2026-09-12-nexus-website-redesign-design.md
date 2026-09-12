# Nexus website redesign — NVIDIA-green, dark-premium, workshop-led

**Date:** 2026-09-12
**Status:** Design — awaiting review
**Scope:** `Sites/nexus-website` — homepage + `/nvidia-dli-workshops` first, then roll out
**Related:** [2026-09-12-nexus-workshop-concierge-design.md](./2026-09-12-nexus-workshop-concierge-design.md)
(the smart/automated communication this redesign surfaces as the primary CTA)

## Problem

The site is clean but generic: monochrome zinc with a **sky-blue** accent, and
NVIDIA green deliberately held back to a tiny secondary accent. The owner wants
the site to read as **NVIDIA-first and premium** — the one thing a visitor needs
to take away is "this team is NVIDIA certified" — and to make the workshop the
headline offer with a self-serve, automated scheduling path (no phone call).

## Decisions (confirmed with owner)

1. **Trademark notice: keep a short, accurate one.** Do **not** remove it. Keep
   an NVIDIA® trademark attribution + a one-line independence/"certified
   instructor" statement. This keeps "NVIDIA certified" accurate and legally
   defensible (nominative fair use) even as we lean into NVIDIA green.
2. **Green intensity: bold accent on a dark premium theme.** NVIDIA green
   (`#76B900`) becomes the signature accent (CTAs, links, highlights,
   credential) on a dark zinc base. Not a full green-flooded theme (that reads
   as an official NVIDIA product).
3. **Scope/order: homepage + `/nvidia-dli-workshops` first.** Establish the new
   design system on the two conversion-critical pages, then roll to
   `/about`, `/about/[person]`, `/contact` in a follow-up.
4. **Terminology: "Academia", not "Universities".** Use *Academia* /
   *academic institutions* as the broader umbrella everywhere "universities"
   appears — the free-offer copy, the chat intake audience, and the classify
   prompt. Source of truth is `lib/dli.ts` `academia.heading` / `academia.text`,
   which both this spec and the concierge spec consume. Accuracy guardrail:
   keep it to U.S. **academic institutions** (the scope NVIDIA's University
   Ambassador program supports) — don't broaden so far it over-claims who gets
   it free.

## Goals

- A cohesive **NVIDIA-green + dark-premium** visual system, applied first to the
  homepage and workshop page.
- **NVIDIA-first messaging**: the credential and the one live workshop lead;
  everything else is secondary.
- The **scheduling concierge** (see related spec) is the primary call to action.
- Preserve every existing NVIDIA/founder **guardrail** and accessibility (WCAG
  AA contrast) — brighter brand, same accuracy.

## Current state (reference)

- **Tokens/utilities:** `app/globals.css` — `.btn-primary` (zinc-900 / inverts
  in dark), `.btn-secondary`, `.card`, `.text-link`, plus `.nvidia-mark` /
  `.link-nvidia` (already-darkened green shades for light mode) and
  `.gradient-text` (sky blue).
- **Theme:** `ThemeProvider` defaults to **dark**, `enableSystem`, class-based.
- **Accent today:** Tailwind `sky-*` used across NavBar ("Nexus **AI**"),
  ChatWidget, links, focus rings.
- **Homepage** (`app/components/HomePageContent.tsx`): hero (banner image,
  "Consulting and training for AI", CTAs *Get in touch* / *Training*, quiet
  `NvidiaBadge`) → Consulting → **Training** (NVIDIA logo, workshop card,
  delivery model, free-for-universities, custom training) → Team → footer
  (links, badge, contact, `TRADEMARK_SHORT`).
- **Workshop page** (`app/nvidia-dli-workshops/page.tsx`): hero + sections +
  "References" list + trademark notice.
- **NVIDIA components:** `NvidiaLogo` (monochrome `currentColor` eye-mark +
  `TRADEMARK_NOTICE` / `TRADEMARK_SHORT`), `NvidiaBadge` (credential, links to
  instructor directory), `NvidiaTrademark`.

## Design

### 1. Color system (`app/globals.css`)

Introduce a small **green accent scale** and repoint accents from sky → green.
Contrast is the key constraint: pure `#76B900` is only ~2.4:1 on white, but
~8.7:1 on zinc-950. Since dark is the default theme, green shines there; light
mode uses darker shades.

| Token | Dark theme | Light theme | Use |
|-------|-----------|-------------|-----|
| `--accent` | `#76B900` (brand) | `#4f7a00` | links, highlights, "AI" mark |
| `--accent-strong` | `#8ed000` | `#3f6200` | link hover, emphasis |
| button surface | `#76B900` | `#5b8c00` | primary CTA background |
| button text on green | **zinc-950** (near-black) | **zinc-950** | AA on green (~8:1); white-on-green fails, so CTAs use dark text |

- `.btn-primary` becomes **green with near-black text** (the NVIDIA-native look)
  in both themes, replacing the current zinc/inverting button.
- `.btn-secondary` stays neutral (outline) so the green primary stands out.
- `.text-link` / focus rings / `.gradient-text` move from sky → green
  (`--accent`). Existing `.nvidia-mark` and `.link-nvidia` shades fold into the
  new scale.
- Keep zinc as the neutral base; dark theme leans into near-black
  (`zinc-950/black`) surfaces with green accents for the "premium" feel.

**Accessibility:** every green-on-surface and text-on-green pairing must hit
WCAG AA (4.5:1 text / 3:1 large text + UI). White text is never placed on brand
green. Verified pairings are encoded as the tokens above.

### 2. Shared chrome

- **NavBar** (`app/components/NavBar.tsx`): "Nexus **AI**" accent sky → green;
  primary nav CTA changes from *Get in Touch* to **"Schedule the workshop"**
  (opens the concierge chat / links to the workshop page), matching the no-call
  direction. Scrolled-state blur/border stays.
- **Footer** (in `HomePageContent.tsx`): keep the short trademark notice
  (decision 1); green link hovers; keep `NvidiaBadge`.
- **ChatWidget** (`app/components/ChatWidget.tsx`): accent sky → green; the
  "Powered by AI" pill and send button adopt green; quick-prompt/copy updates
  come from the concierge spec.

### 3. Homepage (`HomePageContent.tsx`)

- **Hero, NVIDIA-first.** Lead with the credential, not a generic tagline:
  promote `NvidiaBadge` from a quiet footnote to a prominent position near the
  top, headline centered on the workshop ("Official NVIDIA DLI workshops,
  taught by a certified instructor"), with the primary CTA **"Schedule the
  workshop"** (concierge) and a secondary "See the workshop". Keep the banner
  image but tune the gradient to the darker palette.
- **Order & emphasis.** Training (NVIDIA) section moves up to just under the
  hero; consulting becomes secondary. Green used for eyebrows, the workshop
  "Available now" status, and section accents.
- **Workshop card.** Restyle the existing DLI card as the visual centerpiece —
  green status chip, NVIDIA mark, title/length/summary, and the
  free-for-universities callout highlighted.
- **Team & footer.** Keep structure; apply the new accent and spacing polish.
- Replace `new Date().getFullYear()` footer year with a build-safe value if the
  page is static (minor; verify it doesn't break prerender).

### 4. Workshop page (`/nvidia-dli-workshops`)

- Apply the green/dark system; make the NVIDIA mark + credential the anchor of
  the hero.
- Keep the factual "NVIDIA provides / Nexus provides" split, six-week note, and
  the **References** list already cleaned up.
- Primary CTA → **"Schedule the workshop"** (concierge), not "Request a private
  workshop via a call".
- Keep `NvidiaTrademark` visible (required wherever the mark appears).

### 5. Trademark copy (`app/components/NvidiaLogo.tsx`)

Refine `TRADEMARK_SHORT` so the kept notice also carries the positive, accurate
credential — e.g.: *"NVIDIA® and the NVIDIA logo are trademarks of NVIDIA
Corporation. Majid Memari is an NVIDIA DLI Certified Instructor & University
Ambassador; Nexus AI Solutions is independent and not endorsed by NVIDIA."*
`TRADEMARK_NOTICE` (full form) stays as-is. `NvidiaTrademark` keeps rendering on
every page that shows the mark.

### 6. Communication path

The redesign does not re-implement comms; it **surfaces** the concierge from the
related spec: the hero/nav/workshop CTAs all route to the scheduling chat, which
collects audience / when (≥6 wks) / in-person-or-remote / headcount (≤40) and
auto-confirms by email. No phone-call CTA anywhere.

## Non-goals

- Full green-flooded theme; any wording/branding implying NVIDIA partnership or
  endorsement (guardrails preserved verbatim).
- Redesigning `/about`, `/about/[person]`, `/contact` in this pass (follow-up).
- Re-implementing the chat/email backend (covered by the concierge spec).
- New dependencies or a UI framework swap — stay on Tailwind v4 + the existing
  utility-class approach.

## Accessibility & quality checks

- Contrast-audit every new green pairing (text, links, buttons, focus rings) in
  **both** themes; white-on-green is prohibited.
- Preserve focus-visible rings, reduced-motion behavior (`Reveal`), and the
  existing safe-area/scroll-padding handling.
- Keep Lighthouse a11y ≥ current; no regressions in keyboard nav.

## Files touched

- **Changed:** `app/globals.css` (green scale + button/link/accent repoint),
  `app/components/NavBar.tsx` (accent + CTA), `app/components/HomePageContent.tsx`
  (NVIDIA-first hero, reorder, workshop card, footer), `app/components/ChatWidget.tsx`
  (accent), `app/nvidia-dli-workshops/page.tsx` (palette + CTA),
  `app/components/NvidiaLogo.tsx` (`TRADEMARK_SHORT` copy).
- **Possibly:** `app/components/NvidiaBadge.tsx` (prominence/variant for the hero).

## Verification

- `npm run build` + typecheck/lint clean.
- Manual pass in light **and** dark themes at mobile + desktop widths:
  hero, workshop card, CTAs, nav, footer, chat widget.
- Confirm the trademark notice renders on the homepage footer and workshop page.
- Confirm CTAs open the concierge / reach the workshop page (no call CTA left).

## Open defaults (chosen; change if desired)

- Primary CTA label: **"Schedule the workshop"**.
- Green primary buttons use **near-black text** (required for AA on green).
- Consulting is demoted below Training on the homepage.
