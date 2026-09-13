/**
 * Follow-up chips, defined once. The system prompt (`lib/assistant.ts`) tells
 * the model to emit these lines, and the fallback (`lib/chat-suggestions.ts`)
 * uses the same lists when the model forgets, so the two can never drift.
 *
 * Every chip is under seven words and reads as something a visitor would tap.
 * Client-safe, dependency-free.
 */

/** Shown before the first message. */
export const OPENING_CHIPS = [
  "We're exploring where AI fits",
  "We have a project in mind",
  "We want to train our team",
] as const;

/** Early, while learning what they do. */
export const DISCOVERY_CHIPS = [
  "We build RAG apps",
  "We're new to agents",
  "Where does AI actually help?",
] as const;

/** After a substantive piece of advice. */
export const AFTER_ADVICE_CHIPS = [
  "Which training fits us?",
  "Would an FDE help?",
  "When should we skip AI?",
] as const;

/** When the picture is clear enough to structure. */
export const READY_CHIPS = [
  "Draft a consulting brief",
  "Rate our AI readiness",
  "Have Majid follow up",
] as const;

/** Right after the brief card appears. */
export const AFTER_BRIEF_CHIPS = [
  "Send it to Majid",
  "Email me the brief",
  "Rate our AI readiness",
] as const;

/**
 * Same moment, when outgoing email is not configured on the site: never
 * invite a path that ends in "not emailed". The route decides which list the
 * prompt and the fallback use.
 */
export const AFTER_BRIEF_CHIPS_NO_EMAIL = [
  "Send it to Majid",
  "Rate our AI readiness",
  "What should we fix first?",
] as const;

/** Right after the readiness snapshot appears. */
export const AFTER_SNAPSHOT_CHIPS = [
  "Draft a consulting brief",
  "What should we fix first?",
  "Have Majid follow up",
] as const;

/** After the hand-off went out (or was noted). */
export const AFTER_HANDOFF_CHIPS = [
  "What should we prepare?",
  "How does consulting work?",
  "What's covered?",
] as const;

/** Renders a list the way the prompt asks the model to emit it. */
export function chipLine(chips: readonly string[]): string {
  return chips.join(" | ");
}
