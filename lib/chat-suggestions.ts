/**
 * Follow-up chips for Dr. MJ. The model is asked to emit `SUGGESTIONS: a | b | c`.
 * This module sanitizes that line and fills in useful defaults when it is
 * missing or generic, so visitors always get a next step they can tap.
 */

import { nextField, type Registration } from "@/lib/registration";

export const OPENING_CHIPS = [
  "We're exploring where AI fits",
  "We have a project in mind",
  "We want to train our team",
] as const;

const GENERIC = [
  "tell me more",
  "anything else",
  "learn more",
  "thanks",
  "thank you",
  "ok",
  "okay",
  "got it",
  "sounds good",
  "what else",
  "more info",
  "more information",
  "yes",
  "no",
  "sure",
  "cool",
  "interesting",
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isGeneric(s: string): boolean {
  const n = norm(s);
  return n.length < 2 || GENERIC.includes(n);
}

function alreadyUsed(s: string, used: readonly string[]): boolean {
  const n = norm(s);
  return used.some((u) => {
    const un = norm(u);
    return un === n || un.includes(n) || n.includes(un);
  });
}

/** Keep three short, unused, non-fluff chips. */
export function sanitizeSuggestions(
  chips: readonly string[],
  used: readonly string[] = [],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of chips) {
    const s = raw.replace(/\s+/g, " ").trim();
    if (s.length < 2 || s.length > 42) continue;
    if (isGeneric(s) || alreadyUsed(s, used)) continue;
    const key = norm(s);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length === 3) break;
  }
  return out;
}

function pick(pool: readonly string[], used: readonly string[]): string[] {
  return sanitizeSuggestions(pool, used);
}

/**
 * Contextual chips when the model forgets the marker or only emits fluff.
 * Match on the last assistant turn (and last user turn) so the tap continues
 * the conversation instead of restarting it.
 */
export function fallbackSuggestions(opts: {
  lastAssistant?: string;
  lastUser?: string;
  used?: readonly string[];
}): string[] {
  const used = opts.used ?? [];
  const a = `${opts.lastAssistant ?? ""} ${opts.lastUser ?? ""}`.toLowerCase();

  if (/filed|on the way|inbox|follow up by email|request is in/.test(a)) {
    return pick(
      ["What should people prepare?", "How many people can join?", "What's covered?"],
      used,
    );
  }

  if (/name and email|your name|your email|email address/.test(a)) {
    return [];
  }

  if (/how many|headcount|participants|people/.test(a)) {
    return pick(["About 15 people", "About 25 people", "About 40 people"], used);
  }

  if (/in person or|on site or|remote|online or/.test(a)) {
    return pick(["In person", "Remote", "Not sure yet"], used);
  }

  if (/when|six weeks|date|schedule|lead time/.test(a) && /workshop|cohort|host/.test(a)) {
    return pick(["In about two months", "This quarter", "Just exploring for now"], used);
  }

  if (/consult|adopt|when not to|scoping/.test(a)) {
    return pick(
      ["When should we skip AI?", "Would the workshop help?", "Have Majid follow up"],
      used,
    );
  }

  if (/workshop|nvidia|dli|agentic|certificate/.test(a)) {
    return pick(
      ["What would you recommend?", "What's covered?", "Do we need our own GPUs?"],
      used,
    );
  }

  return pick(
    [
      "What can AI do for my team?",
      "How does consulting work?",
      "Have Majid follow up",
    ],
    used,
  );
}

/**
 * Chips driven by the booking record: each one is the next thing the form
 * needs, in the visitor's voice, so follow-ups always advance the current
 * workshop request instead of restarting it.
 */
export function suggestionsForRegistration(
  r: Registration,
  used: readonly string[] = [],
): string[] {
  const field = nextField(r);
  let pool: readonly string[];
  switch (field) {
    case null:
      pool = ["Looks good, book it", "Change a detail", "What should we prepare?"];
      break;
    case "headcount":
      pool = ["About 15 people", "About 30 people", "More than 40 people"];
      break;
    case "delivery":
      pool = ["In person", "Remote", "Not sure yet"];
      break;
    case "timing":
      pool = ["In about two months", "This quarter", "Just exploring"];
      break;
    default:
      pool = []; // name / email: the visitor types these, no chips
  }
  return sanitizeSuggestions(pool, used);
}

/**
 * Prefer form-state chips while a booking is active, then the model's own
 * chips, then contextual defaults.
 */
export function resolveSuggestions(
  modelChips: readonly string[],
  context: {
    lastAssistant?: string;
    lastUser?: string;
    used?: readonly string[];
    registration?: Registration;
  },
): string[] {
  const used = context.used ?? [];
  if (context.registration) {
    const stateChips = suggestionsForRegistration(context.registration, used);
    if (stateChips.length) return stateChips;
  }
  const fromModel = sanitizeSuggestions(modelChips, used);
  if (fromModel.length >= 2) return fromModel;
  const fallback = fallbackSuggestions({ ...context, used: [...used, ...fromModel] });
  return sanitizeSuggestions([...fromModel, ...fallback], used);
}
