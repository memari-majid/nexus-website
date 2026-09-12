/**
 * Nexus-designed training — distinct from the official NVIDIA DLI catalog in
 * `lib/dli.ts`. Custom curriculum is ours, so it carries no NVIDIA branding,
 * no DLI certificate, and must never be described as an NVIDIA workshop.
 */

export const CUSTOM_TRAINING = {
  title: "Custom training",
  summary: "When the catalog does not fit, we build the curriculum around your stack and your data.",
  points: [
    "Scoped to your tools and use cases",
    "Half-day, full-day, or a short series",
    "On site or virtual",
  ],
  /** Honest boundary: our own curriculum, so no DLI certificate. */
  note: "Custom sessions are Nexus curriculum. The NVIDIA DLI certificate applies only to the official workshop above.",
} as const;
