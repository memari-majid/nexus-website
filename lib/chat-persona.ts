/**
 * Assistant and founder names, defined once.
 *
 * Owner override, 2026-09-13 (AGENTS.md 9.1): the assistant is the "AI
 * Consultant". Inside the chat surface only (the chat system prompt, tool
 * descriptions and hints, card copy, and the emails the agent sends) the
 * founder is called "Dr. Memari". Everywhere else on the site, in metadata,
 * in JSON-LD, in alt text, and in the phone voice prompt, he stays
 * "Majid Memari, PhD".
 *
 * Nothing may hardcode these strings in a component, a prompt, a test, or a
 * doc. Never rename by blanket substitution either: the tool keys
 * `handOffToMajid` and `emailMajidNote`, the module `lib/majid.ts`, and the
 * domain majidmemari.com all contain the old string and must not change.
 *
 * PARITY (AGENTS.md 9.2). majidmemari.com carries the same module. The SHARED
 * NAMES block below is exported under the same names, in the same order, in
 * both repos, so the two files diff by eye; only the values differ where the
 * sites differ (the badge, the tagline). Add a name to one repo and add it to
 * the other in the same position, even when the value is the same.
 *
 * Client-safe: constants and pure functions, no imports, no env.
 */

/* ---------------------------------------------------------------- *
 * SHARED NAMES. Same export names, same order, in both repos.       *
 * ---------------------------------------------------------------- */

/** The assistant's name, in the chat and in copy about the chat. */
export const ASSISTANT_NAME = "AI Consultant";

/** Sentence form, for lines like "the AI Consultant is an AI". */
export const ASSISTANT_THE = `the ${ASSISTANT_NAME}`;

/** One line under the name, for the launcher and the panel header. */
export const ASSISTANT_TAGLINE = "AI consulting agent";

/**
 * Widget badge. It sits beside the assistant name in the panel header, so it
 * must never repeat the word "Consultant". majidmemari.com uses "Majid's AI".
 */
export const WIDGET_BADGE = "Nexus AI";

/** The founder, inside the chat surface only. */
export const FOUNDER_CHAT_NAME = "Dr. Memari";

/** Possessive form of the chat name, so no caller has to build it by hand. */
export const FOUNDER_CHAT_POSSESSIVE = `${FOUNDER_CHAT_NAME}'s`;

/** The founder, everywhere else: website copy, metadata, the voice prompt. */
export const FOUNDER_SITE_NAME = "Majid Memari, PhD";

/** The founder without the postnominal, for running prose outside the chat. */
export const FOUNDER_PLAIN_NAME = "Majid Memari";

/* ---------------------------------------------------------------- *
 * SITE-LOCAL. Nothing below is expected to match the other repo.    *
 * ---------------------------------------------------------------- */

/**
 * Nothing yet. majidmemari.com additionally exports `ASSISTANT_INTRO` and
 * `ASSISTANT_DISCLAIMER`, which are first-person demo copy rather than names;
 * this site renders the equivalent lines in
 * `app/components/chat/ConversationView.tsx`. Copy stays where it is rendered,
 * so a second source of truth cannot drift from the screen.
 */
