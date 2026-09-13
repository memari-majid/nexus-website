/**
 * The model mirrors the punctuation of its prompt. The typed data files the
 * prompt interpolates carry a few dozen em and en dashes between them, so
 * every rendered system prompt passes through this before it leaves the
 * server. Ranges keep their meaning ("2 to 4"), a dash at the start of a line
 * becomes a plain bullet, and every other dash becomes a comma.
 *
 * Client-safe, dependency-free.
 */

const DASH = "[—–―]";

export function plainPunctuation(text: string): string {
  return (
    text
      // Numeric ranges: 2–4 sentences, 9:00–17:00.
      .replace(new RegExp(`(\\d)[ \\t]*${DASH}[ \\t]*(\\d)`, "g"), "$1 to $2")
      // A dash opening a line is a bullet.
      .replace(new RegExp(`(^|\\n)[ \\t]*${DASH}[ \\t]*`, "g"), "$1- ")
      // Everything else reads as a comma clause.
      .replace(new RegExp(`[ \\t]*${DASH}[ \\t]*`, "g"), ", ")
      // Tidy the seams the substitution can leave behind.
      .replace(/,[ \t]+\n/g, ",\n")
      .replace(/,\s*,/g, ",")
      .replace(/,\s*([.!?])/g, "$1")
      .replace(/([.!?])\s*,\s+/g, "$1 ")
  );
}

export function hasDash(text: string): boolean {
  return new RegExp(DASH).test(text);
}
