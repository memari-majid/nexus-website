/**
 * Follow-up chips, defined once. The system prompt (`lib/assistant.ts`) tells
 * the model to emit these lines, and the fallback (`lib/chat-suggestions.ts`)
 * uses the same lists when the model forgets, so the two can never drift.
 *
 * A chip is visitor-facing chat copy, so the founder is `FOUNDER_CHAT_NAME`
 * here (AGENTS.md 9.1), read from `lib/chat-persona.ts` and never spelled out.
 *
 * The model may emit at most `MAX_CHIPS` per reply, each five words or fewer
 * and each naming something concrete from the reply or the visitor's last
 * message, or the `NO_CHIPS` line when the reply ends by asking the visitor
 * about their situation. The lists below are the prompt's worked examples and
 * the fallback's pool; every entry fits that rule. Client-safe.
 *
 * Nexus is based in Utah and works with companies across the United States, so
 * no chip may name a state, a region, or a travel radius, or invite a visitor
 * to wonder whether their location qualifies.
 */

import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";

/** Most chips one reply may carry. The prompt, the parser and the fallback all read this. */
export const MAX_CHIPS = 2;

/** What the model writes after the marker when the reply should carry no chips. */
export const NO_CHIPS = "none";

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
  `Have ${FOUNDER_CHAT_NAME} follow up`,
] as const;

/** Right after the brief card appears. */
export const AFTER_BRIEF_CHIPS = [
  `Send it to ${FOUNDER_CHAT_NAME}`,
  "Email me the brief",
  "Rate our AI readiness",
] as const;

/**
 * Same moment, when outgoing email is not configured on the site: never
 * invite a path that ends in "not emailed". The route decides which list the
 * prompt and the fallback use.
 */
export const AFTER_BRIEF_CHIPS_NO_EMAIL = [
  `Send it to ${FOUNDER_CHAT_NAME}`,
  "Rate our AI readiness",
  "What should we fix first?",
] as const;

/** Right after the readiness snapshot appears. */
export const AFTER_SNAPSHOT_CHIPS = [
  "Draft a consulting brief",
  "What should we fix first?",
  `Have ${FOUNDER_CHAT_NAME} follow up`,
] as const;

/** After the hand-off went out (or was noted). */
export const AFTER_HANDOFF_CHIPS = [
  "What should we prepare?",
  "How does consulting work?",
  "What's covered?",
] as const;

/** Renders a list the way the prompt asks the model to emit it: the first `MAX_CHIPS` only. */
export function chipLine(chips: readonly string[]): string {
  return chips.slice(0, MAX_CHIPS).join(" | ");
}
