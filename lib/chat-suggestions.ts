/**
 * Follow-up chips for the assistant. The model is asked to emit `SUGGESTIONS: a | b | c`.
 * This module sanitizes that line and fills in useful defaults when it is
 * missing or generic, so visitors always get a next step they can tap.
 *
 * The chip lists themselves live in `lib/chat-chips.ts`, shared with the
 * prompt, so the model's chips and the fallback chips cannot drift. This is a
 * consulting-only site: nothing here ever offers headcount, delivery format,
 * or timing chips, which belong to a booking flow that no longer exists.
 */

import {
  AFTER_ADVICE_CHIPS,
  AFTER_BRIEF_CHIPS,
  AFTER_BRIEF_CHIPS_NO_EMAIL,
  AFTER_HANDOFF_CHIPS,
  AFTER_SNAPSHOT_CHIPS,
  MAX_CHIPS,
} from "@/lib/chat-chips";

export { OPENING_CHIPS } from "@/lib/chat-chips";

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

/** Keep at most `MAX_CHIPS` short, unused, non-fluff chips. */
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
    if (out.length === MAX_CHIPS) break;
  }
  return out;
}

function pick(pool: readonly string[], used: readonly string[]): string[] {
  return sanitizeSuggestions(pool, used);
}

/**
 * The assistant just produced the brief card. Matches "I drafted your brief",
 * "here's the brief", "your brief is above"; must NOT match an offer such as
 * "want me to draft the brief?".
 */
export const BRIEF_DRAFTED_RE =
  /\b(?:drafted|prepared|put together|pulled together|wrote up)\b[^.?!]{0,40}\bbrief\b(?![^.?!]*\?)|\bbrief\b[^.?!]{0,30}\b(?:is ready|is above|is below|is drafted|above)\b(?![^.?!]*\?)|\bhere(?:'s| is) (?:your|the|a) (?:consulting |quick |short )?brief\b(?![^.?!]*\?)/i;

/** The readiness snapshot card just appeared. */
export const SNAPSHOT_SHOWN_RE =
  /\breadiness snapshot\b|\breadiness (?:comes out|lands|scores?|is) (?:at|around|about)?\s*\d|\b(?:scored|rated) (?:your|their|the) readiness\b/i;

/** A chip that invites an email; hidden while outgoing email is off. */
const EMAIL_CHIP_RE = /\bemail\b/i;

export type SuggestionContext = {
  lastAssistant?: string;
  lastUser?: string;
  used?: readonly string[];
  /**
   * False when the route reports outgoing email is not configured
   * (`emailEnabled` in the start metadata), so no chip invites an email
   * that would end in "not sent". Defaults to true.
   */
  emailEnabled?: boolean;
};

/**
 * Contextual chips when the model forgets the marker or only emits fluff.
 * Match on the last assistant turn (and last user turn) so the tap continues
 * the conversation instead of restarting it.
 */
export function fallbackSuggestions(opts: SuggestionContext): string[] {
  const used = opts.used ?? [];
  const assistant = opts.lastAssistant ?? "";
  const a = `${assistant} ${opts.lastUser ?? ""}`.toLowerCase();
  const afterBrief = opts.emailEnabled === false ? AFTER_BRIEF_CHIPS_NO_EMAIL : AFTER_BRIEF_CHIPS;

  if (BRIEF_DRAFTED_RE.test(assistant)) return pick(afterBrief, used);
  if (SNAPSHOT_SHOWN_RE.test(assistant)) return pick(AFTER_SNAPSHOT_CHIPS, used);

  if (/filed|on the way|inbox|follow up by email|request is in|noted but not sent|hand-off|handoff/.test(a)) {
    return pick(AFTER_HANDOFF_CHIPS, used);
  }

  if (/name and email|your name|your email|email address/.test(a)) {
    return [];
  }

  if (/consult|adopt|when not to|scoping/.test(a)) {
    return pick(AFTER_ADVICE_CHIPS, used);
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
 * Prefer the model's own chips, then contextual defaults. With email off,
 * any chip that invites an email is dropped before the fallback fills in.
 */
export function resolveSuggestions(
  modelChips: readonly string[],
  context: SuggestionContext,
): string[] {
  const used = context.used ?? [];
  const candidates =
    context.emailEnabled === false ? modelChips.filter((c) => !EMAIL_CHIP_RE.test(c)) : modelChips;
  const fromModel = sanitizeSuggestions(candidates, used);
  if (fromModel.length >= MAX_CHIPS) return fromModel;
  const fallback = fallbackSuggestions({ ...context, used: [...used, ...fromModel] });
  return sanitizeSuggestions([...fromModel, ...fallback], used);
}
