import { Resend } from "resend";
import { SITE } from "@/lib/site";

/**
 * Single email delivery path for the site. Everything that sends mail
 * (inquiry notifications, visitor confirmations, workshop info) goes through
 * `sendEmail` so there is one place that owns the Resend client, the dev-mode
 * fallback, and the branded template.
 */

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

const FROM = process.env.RESEND_FROM_EMAIL ?? "Nexus AI <onboarding@resend.dev>";

/**
 * Best-effort send. In dev (no `RESEND_API_KEY`) it logs a preview and reports
 * success so local flows don't hard-fail. Returns a result object rather than
 * throwing so callers can decide whether a failure is fatal.
 */
export async function sendEmail(
  args: SendArgs,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info("[email] RESEND_API_KEY not set — logged only:", {
      to: args.to,
      subject: args.subject,
      preview: args.text.slice(0, 200),
    });
    return { ok: true };
  }

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: FROM,
    to: [args.to],
    subject: args.subject,
    text: args.text,
    ...(args.html ? { html: args.html } : {}),
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  });

  if (error) {
    console.error("[email] Resend error:", error);
    return { ok: false, error: "Email send failed." };
  }
  return { ok: true };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Minimal, email-client-safe branded wrapper: light background (dark emails
 * render poorly in many clients), inline styles only, NVIDIA-green accent, and
 * the accurate credential + independence line in the footer. `bodyHtml` is
 * trusted HTML built by our own code — never interpolate raw visitor input
 * into it without escaping (see `esc`).
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
          ${esc(SITE.name)} · <a href="mailto:${esc(SITE.email)}" style="color:#4f7a00;text-decoration:underline;">${esc(SITE.email)}</a><br/>
          ${esc(SITE.addressDisplay)}<br/>
          NVIDIA DLI Certified Instructor · independent, not endorsed by NVIDIA.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export { esc as escapeHtml };
