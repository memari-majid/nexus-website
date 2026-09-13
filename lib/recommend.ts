/**
 * Maps a visitor's stated need to the best-fit NVIDIA DLI workshop from the
 * typed catalog. This grounds the recommendation in real courses so the
 * assistant never invents a title, and gives a deterministic fallback when the
 * model is unsure. The model still phrases the final pitch; this returns the
 * pick, a short honest reason, and alternatives.
 */

export type CatalogWorkshop = {
  key: string;
  title: string;
  url: string;
  blurb: string;
  /** True only for the one Nexus currently hosts and teaches. */
  hosted?: boolean;
  /** Lowercase intent signals matched against the visitor's words. */
  keywords: readonly string[];
};

export type Recommendation = {
  workshop: CatalogWorkshop;
  why: string;
  hosted: boolean;
  alternatives: CatalogWorkshop[];
};

export type RecommendInput = {
  role?: string;
  need?: string;
  level?: string;
  text?: string;
};

function scoreOf(w: CatalogWorkshop, haystack: string): number {
  return w.keywords.reduce((s, k) => (haystack.includes(k.toLowerCase()) ? s + 1 : s), 0);
}

function reasonFor(w: CatalogWorkshop): string {
  return w.hosted
    ? `${w.title} is the workshop we host and teach in person — ${w.blurb}`
    : `${w.title} is the best fit — ${w.blurb} We can arrange it for your team.`;
}

export function recommendWorkshop(
  input: RecommendInput,
  catalog: readonly CatalogWorkshop[],
): Recommendation {
  const haystack = [input.role, input.need, input.level, input.text]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scored = catalog.map((w) => ({ w, score: scoreOf(w, haystack) }));
  const maxScore = scored.reduce((m, s) => Math.max(m, s.score), 0);

  let workshop: CatalogWorkshop;
  if (maxScore === 0) {
    // Nothing matched — lead with the flagship we actually teach.
    workshop = catalog.find((w) => w.hosted) ?? catalog[0];
  } else {
    const top = scored.filter((s) => s.score === maxScore);
    // Tie-break toward the workshop we host in person.
    workshop = (top.find((s) => s.w.hosted) ?? top[0]).w;
  }

  const alternatives = scored
    .filter((s) => s.w.key !== workshop.key)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.w);

  return {
    workshop,
    why: reasonFor(workshop),
    hosted: Boolean(workshop.hosted),
    alternatives,
  };
}
