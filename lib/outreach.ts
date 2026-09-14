/**
 * The outreach note: a short, written note the assistant drafts for the
 * visitor to take away, and the one thing `emailMajidNote` is allowed to send.
 *
 * Same shape as the consulting brief: the tool's INPUT is the note, so the
 * card renders `part.input` while it streams and the email tool re-reads it
 * from message history (`findOutreachNote`) instead of asking the model to
 * write it twice. Caps are deliberately tight: an echoed note is billed on
 * every later turn.
 *
 * Client-safe: type-only `ai` import, zod only.
 */

import type { ModelMessage } from "ai";
import { z } from "zod";
import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";

/** Who the note is written to. The audience changes the voice, not the length. */
export const OUTREACH_AUDIENCES = ["leadership", "team", "founder"] as const;
export type OutreachAudience = (typeof OUTREACH_AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<OutreachAudience, string> = {
  leadership: "Your leadership",
  team: "Your team",
  founder: FOUNDER_CHAT_NAME,
};

export const outreachNoteSchema = z.object({
  audience: z
    .enum(OUTREACH_AUDIENCES)
    .describe(
      `Who reads it: leadership (the person who funds it), team (the people who would build it), or founder (a note to send to ${FOUNDER_CHAT_NAME})`,
    ),
  subject: z
    .string()
    .min(1)
    .max(120)
    .describe("Subject line, under 60 characters, specific to their situation"),
  paragraphs: z
    .array(z.string().min(1).max(400))
    .min(1)
    .max(4)
    .describe(
      "Two or three short paragraphs, under 60 words each: the problem in their words, what you would do first, and what it would take. No greeting and no sign-off",
    ),
  ask: z
    .string()
    .min(1)
    .max(200)
    .describe("The single ask that closes the note, under 25 words"),
});

export type OutreachNote = z.infer<typeof outreachNoteSchema>;

export const OUTREACH_TOOL_NAME = "draftOutreachNote";

export function audienceLabel(audience: unknown): string {
  return typeof audience === "string" && audience in AUDIENCE_LABEL
    ? AUDIENCE_LABEL[audience as OutreachAudience]
    : "Your reader";
}

/** Rough length, so the card and the tool output can say how long the note is. */
export function noteWordCount(note: OutreachNote): number {
  return [...note.paragraphs, note.ask].join(" ").split(/\s+/).filter(Boolean).length;
}

type Scrub = (value: string) => string;
const identity: Scrub = (value) => value;

/**
 * Plain text of the note, one paragraph per line. `scrub` is applied per
 * paragraph rather than to the whole note, because the scrubber flattens
 * whitespace and would otherwise collapse the note into one block.
 */
export function renderNoteText(note: OutreachNote, scrub: Scrub = identity): string {
  return [
    `Subject: ${scrub(note.subject)}`,
    "",
    ...note.paragraphs.map((p) => scrub(p)),
    "",
    scrub(note.ask),
  ].join("\n");
}

/**
 * Finds the drafted note in the `ModelMessage[]` the SDK hands to a tool's
 * `execute`: the call with the given id, or the latest one. Message history is
 * untrusted, so the input is re-validated before it is returned. A note
 * drafted in the same step as the caller is not visible yet and returns null.
 */
export function findOutreachNote(
  messages: readonly ModelMessage[],
  toolCallId?: string,
): OutreachNote | null {
  let latest: OutreachNote | null = null;
  for (const message of messages) {
    if (message.role !== "assistant" || typeof message.content === "string") continue;
    for (const part of message.content) {
      if (part.type !== "tool-call" || part.toolName !== OUTREACH_TOOL_NAME) continue;
      const parsed = outreachNoteSchema.safeParse(part.input);
      if (!parsed.success) continue;
      if (toolCallId && part.toolCallId === toolCallId) return parsed.data;
      latest = parsed.data;
    }
  }
  return latest;
}
