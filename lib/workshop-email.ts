import { DLI, DLI_REFERENCE_LINKS } from "@/lib/dli";
import { renderEmail, escapeHtml } from "@/lib/email";

/**
 * Branded "here are the NVIDIA workshop details" email, built entirely from the
 * typed DLI data so it can never drift from the site or the guardrails.
 * Industry delivery only — do not add a campus / free variant.
 */
export function workshopInfoEmail(opts: {
  name: string;
}): { subject: string; text: string; html: string } {
  const name = opts.name || "there";
  const w = DLI.workshop;
  const offerText = `${DLI.industry.heading} (${DLI.industry.role}): ${DLI.industry.text} ${DLI.logistics}`;

  const text = [
    `Hi ${name},`,
    ``,
    `Here are the details on the NVIDIA Deep Learning Institute workshop we host for industry teams as a Certified Instructor:`,
    ``,
    `${w.title} — ${w.length}`,
    w.summary,
    ``,
    offerText,
    ``,
    `What's covered:`,
    ...DLI.outline.map((m) => `• ${m.title}: ${m.text}`),
    ``,
    `NVIDIA provides: ${DLI.nvidiaProvides.items.join("; ")}.`,
    `Nexus provides: ${DLI.weProvide.items.join("; ")}.`,
    ``,
    `Official NVIDIA pages:`,
    ...DLI_REFERENCE_LINKS.map((r) => `• ${r.label}: ${r.href}`),
    ``,
    `Reply with your timing (we need about six weeks' notice), in person or remote, and how many people (up to 40 per cohort) — and we'll get it scheduled.`,
  ].join("\n");

  const liText = (items: readonly string[]) =>
    `<ul style="margin:8px 0;padding-left:20px;">${items
      .map((i) => `<li>${escapeHtml(i)}</li>`)
      .join("")}</ul>`;

  const bodyHtml = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Here are the details on the NVIDIA Deep Learning Institute workshop we host for industry teams as a Certified Instructor:</p>
    <p style="margin:16px 0 4px;"><strong>${escapeHtml(w.title)}</strong> — ${escapeHtml(w.length)}</p>
    <p style="margin:0 0 12px;">${escapeHtml(w.summary)}</p>
    <p style="margin:12px 0;padding:10px 14px;background:#f2f9e6;border-radius:8px;">
      <strong>${escapeHtml(DLI.industry.heading)} — ${escapeHtml(DLI.industry.role)}.</strong> ${escapeHtml(DLI.industry.text)} ${escapeHtml(DLI.logistics)}
    </p>
    <p style="margin:16px 0 4px;"><strong>What's covered</strong></p>
    ${liText(DLI.outline.map((m) => `${m.title}: ${m.text}`))}
    <p style="margin:16px 0 4px;"><strong>NVIDIA provides</strong></p>
    ${liText(DLI.nvidiaProvides.items)}
    <p style="margin:16px 0 4px;"><strong>Nexus provides</strong></p>
    ${liText(DLI.weProvide.items)}
    <p style="margin:16px 0 4px;"><strong>Official NVIDIA pages</strong></p>
    <ul style="margin:8px 0;padding-left:20px;">${DLI_REFERENCE_LINKS
      .map(
        (r) =>
          `<li><a href="${escapeHtml(r.href)}" style="color:#4f7a00;">${escapeHtml(r.label)}</a></li>`,
      )
      .join("")}</ul>
    <p style="margin-top:16px;">Reply with your timing (about six weeks' notice), in person or remote, and how many people (up to 40 per cohort) — and we'll get it scheduled.</p>
  `;

  return { subject: `NVIDIA DLI workshop — ${w.title}`, text, html: renderEmail({ heading: w.title, bodyHtml }) };
}
