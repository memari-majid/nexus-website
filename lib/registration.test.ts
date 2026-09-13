import { describe, expect, it } from "vitest";
import {
  COHORT_MAX,
  SEAT_PRICE,
  STANDARD_MAX,
  deriveRegistration,
  nextField,
  priceLine,
  type Registration,
} from "@/lib/registration";

const base: Registration = { name: "Ada", email: "ada@acme.com" };

describe("constants", () => {
  it("uses the $500 seat rate, 20-seat standard tier, 40-seat cohort cap", () => {
    expect(SEAT_PRICE).toBe(500);
    expect(STANDARD_MAX).toBe(20);
    expect(COHORT_MAX).toBe(40);
  });
});

describe("deriveRegistration — required fields", () => {
  it("lists name and email as missing when empty", () => {
    const d = deriveRegistration({});
    expect(d.missingRequired).toEqual(["name", "email"]);
    expect(d.isComplete).toBe(false);
  });

  it("is complete once name and email are present", () => {
    const d = deriveRegistration({ ...base, headcount: 10 });
    expect(d.missingRequired).toEqual([]);
    expect(d.isComplete).toBe(true);
  });
});

describe("deriveRegistration — pricing tiers", () => {
  it("has no tier until headcount is known", () => {
    const d = deriveRegistration({ ...base });
    expect(d.pricingTier).toBe("pending");
    expect(d.estimatedTotal).toBeNull();
  });

  it("prices 1..20 seats at $500 each (standard)", () => {
    const d = deriveRegistration({ ...base, headcount: 10 });
    expect(d.pricingTier).toBe("standard");
    expect(d.estimatedTotal).toBe(5000);
    expect(d.needsQuote).toBe(false);
  });

  it("treats exactly 20 as the last standard-priced size", () => {
    const d = deriveRegistration({ ...base, headcount: 20 });
    expect(d.pricingTier).toBe("standard");
    expect(d.estimatedTotal).toBe(10000);
  });

  it("treats 21 as a quote (large group), no fixed total", () => {
    const d = deriveRegistration({ ...base, headcount: 21 });
    expect(d.pricingTier).toBe("quote");
    expect(d.estimatedTotal).toBeNull();
    expect(d.needsQuote).toBe(true);
    expect(d.needsMultipleCohorts).toBe(false);
  });

  it("keeps 40 a single-cohort quote", () => {
    const d = deriveRegistration({ ...base, headcount: 40 });
    expect(d.pricingTier).toBe("quote");
    expect(d.needsMultipleCohorts).toBe(false);
  });

  it("splits above 40 into multiple cohorts and still quotes", () => {
    const d = deriveRegistration({ ...base, headcount: 41 });
    expect(d.pricingTier).toBe("multi-cohort");
    expect(d.needsQuote).toBe(true);
    expect(d.needsMultipleCohorts).toBe(true);
  });
});

describe("nextField — ordered slot filling", () => {
  it("asks headcount first", () => {
    expect(nextField({})).toBe("headcount");
  });

  it("asks delivery once headcount is known", () => {
    expect(nextField({ headcount: 12 })).toBe("delivery");
  });

  it("returns null when the booking essentials are filled", () => {
    expect(
      nextField({ ...base, headcount: 12, delivery: "remote", timing: "November" }),
    ).toBeNull();
  });
});

describe("priceLine — user-facing copy", () => {
  it("shows a formatted standard total with thousands separator", () => {
    expect(priceLine({ ...base, headcount: 15 })).toBe(
      "$500/seat × 15 = $7,500 (invoiced by Nexus)",
    );
  });

  it("shows the round total at 20 seats", () => {
    expect(priceLine({ ...base, headcount: 20 })).toBe(
      "$500/seat × 20 = $10,000 (invoiced by Nexus)",
    );
  });

  it("invites a tailored quote for large groups", () => {
    expect(priceLine({ ...base, headcount: 30 })).toBe(
      "Group of 30 — we'll email you a tailored quote",
    );
  });

  it("mentions splitting into cohorts above 40", () => {
    expect(priceLine({ ...base, headcount: 60 })).toContain("more than 40 per cohort");
  });

  it("shows the base seat rate before headcount is known", () => {
    expect(priceLine({ ...base })).toBe("$500 per seat, invoiced by Nexus");
  });
});
