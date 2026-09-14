import { Resend } from "resend";
import { ASSISTANT_NAME } from "@/lib/chat-persona";
import { SITE, SITE_URL } from "@/lib/site";

/**
 * Single email delivery path for the site. Everything that sends mail
 * (inquiry notifications, visitor confirmations, the workshop one-pager, the
 * consulting brief) goes through `sendEmail`, so there is one place that owns
 * the Resend client, the not-configured fallback, and the branded template.
 *
 * `delivered` means Resend accepted the message. Production has neither
 * `RESEND_API_KEY` nor `RESEND_FROM_EMAIL` today, so every caller must treat
 * `delivered: false` as the normal case and say "noted, not sent".
 */

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Passed to Resend only when non-empty. */
  cc?: string[];
};

export type SendResult = { ok: true; delivered: boolean } | { ok: false; error: string };

/**
 * Loose address check used inside tool `execute` functions. It stays out of
 * zod schemas on purpose: zod 4 turns `.email()` into `format: "email"` plus a
 * lookahead `pattern`, which some function-schema validators reject.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * First line of every visitor-addressed template. The assistant's name comes
 * from `lib/chat-persona.ts`: these are emails the agent sends, so they are
 * inside the chat surface (AGENTS.md 9.1).
 */
export const EMAIL_ORIGIN_NOTE = `You asked for this in a chat with the ${ASSISTANT_NAME}, the AI assistant on nexusaisolution.net, and approved it on screen before it was sent. If that was not you, you can ignore this message.`;

/**
 * info@nexusaisolution.net has no inbound MX, so every CC and reply-to uses
 * the founder's inbox. A CC to info@ would bounce and hurt the reputation of
 * a brand-new Resend domain.
 */
export function founderInbox(): string {
  return process.env.WORKSHOP_TO_EMAIL?.trim() || "memari.majid@hotmail.com";
}

/**
 * Both variables are required. With `RESEND_FROM_EMAIL` unset the From would
 * be onboarding@resend.dev, which Resend delivers only to the account owner.
 */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

/** Header-safe subject: no line breaks or tabs, bounded length. */
export function cleanSubject(s: string): string {
  return s.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 200);
}

/**
 * File and code suffixes that are not top-level domains, so "Node.js" in a
 * brief survives the scrub. A two-label match on one of these cannot resolve,
 * so it cannot carry a link; anything with more labels or a path is scrubbed.
 */
const NOT_A_TLD = new Set([
  "js", "jsx", "tsx", "json", "html", "css", "txt", "csv", "pdf", "xlsx", "docx", "pptx",
  "yaml", "yml", "toml", "sql", "ipynb", "cpp", "exe",
]);

/**
 * Strips links, bare domains on any TLD, obfuscated domains, email addresses,
 * and phone numbers from text that will be sent to a visitor-supplied
 * address, so a prompt-injected brief cannot carry a phishing payload from
 * the verified domain. Over-scrubbing is the right failure mode here: the
 * template fields never legitimately need a domain. Flattens whitespace as
 * well; every template field is a single line.
 */
export function scrubForEmail(s: string): string {
  return (
    s
      // "example (dot) com", "example[dot]com", "example dot com" are still domains.
      // Fullwidth and ideographic full stops are still dots.
      .replace(/[\uFF0E\u3002]/g, ".")
      .replace(/(?<=[a-z0-9])\s*[([{]\s*dot\s*[)\]}]\s*(?=[a-z0-9])/gi, ".")
      .replace(/(?<=[a-z0-9])\s+dot\s+(?=[a-z0-9])/gi, ".")
      // "example-dot-com", "example_dot_com", "exampleDOTcom".
      .replace(/(?<=[a-z0-9])\s*[-_]\s*dot\s*[-_]\s*(?=[a-z0-9])/gi, ".")
      .replace(/(?<=[a-z0-9])DOT(?=[a-z0-9])/g, ".")
      .replace(/\bhttps?:\/\/[^\s<>"')]+/gi, "[link removed]")
      .replace(/\bwww\.[^\s<>"')]+/gi, "[link removed]")
      .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[address removed]")
      .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,63}\b(?:\/[^\s<>"')]*)?/gi, (m) => {
        const [host, ...path] = m.split("/");
        const labels = host.split(".");
        const codeSuffix =
          labels.length === 2 && path.length === 0 && NOT_A_TLD.has(labels[1].toLowerCase());
        return codeSuffix ? m : "[link removed]";
      })
      // Bare IPv4 addresses with an optional port or path are links too.
      .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b(?::\d+)?(?:\/[^\s<>"')]*)?/g, "[link removed]")
      .replace(/\+?\(?\d[\d\s().-]{6,}\d/g, (m) =>
        (m.match(/\d/g) ?? []).length >= 7 ? "[phone removed]" : m,
      )
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

/**
 * Best-effort send. When email is not configured it logs a preview and
 * reports `delivered: false` so callers can be honest with the visitor.
 * Returns a result object rather than throwing so callers decide whether a
 * failure is fatal.
 */
export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const subject = cleanSubject(args.subject);
  const cc = (args.cc ?? []).map((c) => c.trim()).filter(Boolean);

  if (!isEmailConfigured()) {
    console.info("[email] not configured (RESEND_API_KEY and RESEND_FROM_EMAIL both required); logged only:", {
      to: args.to,
      cc,
      subject,
      preview: args.text.slice(0, 200),
    });
    return { ok: true, delivered: false };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL as string,
      to: [args.to],
      subject,
      text: args.text,
      ...(args.html ? { html: args.html } : {}),
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
      ...(cc.length ? { cc } : {}),
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error: "Email send failed." };
    }
    return { ok: true, delivered: true };
  } catch (err) {
    console.error("[email] Resend threw:", err);
    return { ok: false, error: "Email send failed." };
  }
}

/** Escapes `& < >` only. Never place visitor text inside a quoted attribute. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Minimal, email-client-safe branded wrapper: light background (dark emails
 * render poorly in many clients), inline styles only, NVIDIA-green accent, and
 * the accurate credential plus independence line in the footer. `bodyHtml` is
 * trusted HTML built by our own code; never interpolate raw visitor input
 * into it without `escapeHtml`.
 */
export function renderEmail({ heading, bodyHtml }: { heading: string; bodyHtml: string }): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:20px 28px;border-bottom:1px solid #e4e4e7;">
          <span style="font-size:16px;font-weight:700;">Nexus<span style="color:#5b8c00;"> AI</span> Solutions</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;font-size:19px;font-weight:600;">${esc(heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#3f3f46;">${bodyHtml}</div>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#71717a;">
          ${esc(SITE.name)} · <a href="${esc(SITE_URL)}/contact" style="color:#4f7a00;text-decoration:underline;">${esc(SITE_URL)}/contact</a><br/>
          ${esc(SITE.addressDisplay)}<br/>
          NVIDIA DLI Certified Instructor · independent, not endorsed by NVIDIA.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export { esc as escapeHtml };
