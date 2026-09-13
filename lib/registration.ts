/**
 * The workshop booking record and every derivation the smart form needs:
 * required-field tracking, the next slot to fill, and the per-seat pricing
 * tiers. Pure and dependency-free so it is trivially testable and runs on both
 * the server (tool) and the client (card).
 *
 * This site sells INDUSTRY delivery only — there is no academic/free path.
 * Pricing is Nexus's own industry rate (not attributed to NVIDIA):
 *   1..20 seats  -> $500/seat, priced live, invoiced by Nexus.
 *   21..40 seats -> large group, quoted by email (volume discount).
 *   > 40 seats   -> split into cohorts (max 40 each), quoted by email.
 */

export const SEAT_PRICE = 500;
/** Largest group still priced at the flat per-seat rate. Above this we quote. */
export const STANDARD_MAX = 20;
/** Best-result cap per cohort. Above this we run multiple cohorts. */
export const COHORT_MAX = 40;

export type Delivery = "in-person" | "remote";

export type Registration = {
  name?: string;
  email?: string;
  organization?: string;
  headcount?: number;
  timing?: string;
  delivery?: Delivery;
  /** Which workshop, usually set from the recommendation. */
  workshop?: string;
  /** Light discovery context, used for the recommendation and the lead email. */
  role?: string;
  need?: string;
};

export type PricingTier =
  | "pending" // headcount not yet known
  | "standard" // 1..20 seats, priced live at $500/seat
  | "quote" // 21..40 seats, quoted by email
  | "multi-cohort"; // > 40 seats, split + quoted

export type DerivedRegistration = {
  missingRequired: string[];
  isComplete: boolean;
  pricingTier: PricingTier;
  seatPrice: number;
  estimatedTotal: number | null;
  needsQuote: boolean;
  needsMultipleCohorts: boolean;
};

/** Enough to file a lead we can act on. */
const REQUIRED: (keyof Registration)[] = ["name", "email"];

/** Order the card walks through when auto-filling the rest. */
const FIELD_ORDER: (keyof Registration)[] = [
  "headcount",
  "delivery",
  "timing",
  "name",
  "email",
];

function isFilled(r: Registration, field: keyof Registration): boolean {
  const v = r[field];
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return v > 0;
  return true;
}

export function deriveRegistration(r: Registration): DerivedRegistration {
  const missingRequired = REQUIRED.filter((f) => !isFilled(r, f)) as string[];
  const hasHeadcount = isFilled(r, "headcount");
  const n = r.headcount ?? 0;

  let pricingTier: PricingTier;
  if (!hasHeadcount) pricingTier = "pending";
  else if (n <= STANDARD_MAX) pricingTier = "standard";
  else if (n <= COHORT_MAX) pricingTier = "quote";
  else pricingTier = "multi-cohort";

  const estimatedTotal = pricingTier === "standard" ? SEAT_PRICE * n : null;

  return {
    missingRequired,
    isComplete: missingRequired.length === 0,
    pricingTier,
    seatPrice: SEAT_PRICE,
    estimatedTotal,
    needsQuote: pricingTier === "quote" || pricingTier === "multi-cohort",
    needsMultipleCohorts: hasHeadcount && n > COHORT_MAX,
  };
}

/** The next field the card should feature, or null when the essentials are in. */
export function nextField(r: Registration): keyof Registration | null {
  return FIELD_ORDER.find((f) => !isFilled(r, f)) ?? null;
}

function formatUSD(n: number): string {
  return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** User-facing price/next-step line for the current registration state. */
export function priceLine(r: Registration): string {
  const d = deriveRegistration(r);
  const n = r.headcount ?? 0;
  switch (d.pricingTier) {
    case "standard":
      return `$500/seat × ${n} = ${formatUSD(d.estimatedTotal ?? 0)} (invoiced by Nexus)`;
    case "quote":
      return `Group of ${n} — we'll email you a tailored quote`;
    case "multi-cohort":
      return `Group of ${n} is more than 40 per cohort — we'll split it into cohorts and email a quote`;
    default:
      return "$500 per seat, invoiced by Nexus";
  }
}
