import { EMAIL_ORIGIN_NOTE, escapeHtml, renderEmail, scrubForEmail } from "@/lib/email";
import { effortLabel, pathLabel, renderBriefText } from "@/lib/brief-prompt";
import type { ConsultingBrief } from "@/lib/brief-schema";

/**
 * The visitor's copy of the consulting brief. A fixed template whose only
 * variables are the scrubbed name and the schema-validated, scrubbed brief
 * fields; no model free text reaches a visitor-supplied address. Every
 * interpolated value goes through `escapeHtml`, and none sits inside a quoted
 * attribute. Majid is CC'd by the caller.
 */

export const BRIEF_EMAIL_SUBJECT = "Your consulting brief from Nexus AI Solutions";

const INTRO =
  "Here is the consulting brief Dr. MJ drafted with you. Majid Memari is copied on this email and will follow up.";
const CLOSING = "Reply to this email to reach Majid Memari.";

export function briefEmail(opts: { name: string; brief: ConsultingBrief }): {
  subject: string;
  text: string;
  html: string;
} {
  const name = scrubForEmail(opts.name).slice(0, 80) || "there";
  const b = opts.brief;
  const s = scrubForEmail;

  const text = [
    EMAIL_ORIGIN_NOTE,
    "",
    `Hi ${name},`,
    "",
    INTRO,
    "",
    renderBriefText(b, s),
    "",
    CLOSING,
    "",
    "Nexus AI Solutions",
  ].join("\n");

  const section = (title: string, inner: string) =>
    `<p style="margin:16px 0 4px;"><strong>${escapeHtml(title)}</strong></p>${inner}`;
  const para = (value: string) => `<p style="margin:0;">${escapeHtml(s(value))}</p>`;
  const list = (items: string[]) =>
    `<ul style="margin:6px 0;padding-left:20px;">${items
      .map((i) => `<li>${escapeHtml(i)}</li>`)
      .join("")}</ul>`;

  const bodyHtml = [
    `<p style="font-size:12px;color:#71717a;">${escapeHtml(EMAIL_ORIGIN_NOTE)}</p>`,
    `<p>Hi ${escapeHtml(name)},</p>`,
    `<p>${escapeHtml(INTRO)}</p>`,
    section("Who you are", para(b.organization)),
    section("Goal", para(b.goal)),
    section("Where you are today", para(b.currentState)),
    section(
      "Opportunities",
      list(b.opportunities.map((o) => `${s(o.title)} (${effortLabel(o.effort)}): ${s(o.why)}`)),
    ),
    section("Risks", list(b.risks.map((r) => `${s(r.title)}: ${s(r.mitigation)}`))),
    section("Keep with people", list(b.keepWithPeople.map((k) => s(k)))),
    section(
      "Recommended path",
      para(`${pathLabel(b.recommendedPath.path)}: ${b.recommendedPath.reason}`),
    ),
    section("First step", para(b.firstStep)),
    section("Open questions", list(b.openQuestions.map((q) => s(q)))),
    `<p style="margin-top:16px;">${escapeHtml(CLOSING)}</p>`,
  ].join("\n");

  return {
    subject: BRIEF_EMAIL_SUBJECT,
    text,
    html: renderEmail({ heading: "Your consulting brief", bodyHtml }),
  };
}
