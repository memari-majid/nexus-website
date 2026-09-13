import { SITE } from "@/lib/site";
import { classifyInquiry, fallbackInquiryResponse, type InquiryCategory } from "@/lib/inquiry-ai";
import {
  EMAIL_RE,
  cleanSubject,
  escapeHtml,
  founderInbox,
  renderEmail,
  sendEmail,
} from "@/lib/email";

const CLASSIFY_MODEL = process.env.CONTACT_CLASSIFY_MODEL ?? "anthropic/claude-haiku-4-5";

export type InquiryInput = {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  source?: string;
};

export type InquirySuccess = {
  ok: true;
  /** True when email is not configured and the inquiry was only logged. */
  dev: boolean;
  /** True when Resend accepted the notification to the team. */
  delivered: boolean;
  category: InquiryCategory;
  autoReply: string;
};

export type InquiryFailure = {
  ok: false;
  error: string;
  status: number;
};

export async function submitInquiry(input: InquiryInput): Promise<InquirySuccess | InquiryFailure> {
  const source = input.source?.trim() || "contact-form";
  const isVoice = source === "voice-assistant";
  const isHandoff = source === "chat-handoff";
  const name = input.name.trim() || (isVoice ? "Phone caller" : "");
  const email = input.email?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const message = input.message.trim();

  if (!message) {
    return { ok: false, error: "Message is required.", status: 400 };
  }
  if (!isVoice && (!name || !email)) {
    return { ok: false, error: "Name, email, and message are required.", status: 400 };
  }
  if (isVoice && !phone && !email) {
    return { ok: false, error: "A callback number or email is required for phone messages.", status: 400 };
  }
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, error: "Invalid email address.", status: 400 };
  }

  let category: InquiryCategory = isHandoff ? "consulting" : "general";
  let autoReply = fallbackInquiryResponse().autoReply;

  // The chat hand-off is already structured by the assistant and never sends a
  // visitor confirmation, so it skips the classifier call entirely.
  if (!isHandoff) {
    try {
      const classified = await classifyInquiry({
        name,
        message,
        modelId: CLASSIFY_MODEL,
      });
      category = classified.category;
      autoReply = classified.autoReply;
    } catch (err) {
      console.error("[inquiry] classifyInquiry:", err);
      const fb = fallbackInquiryResponse();
      category = fb.category;
      autoReply = fb.autoReply;
    }
  }

  // The consultation hand-off is the one source that goes to the founder's
  // inbox; everything else goes to the shared contact inbox.
  const to = isHandoff ? founderInbox() : process.env.CONTACT_TO_EMAIL ?? SITE.email;
  const subject = cleanSubject(
    isVoice
      ? `[Nexus voice] Message for Majid from ${name}${phone ? ` (${phone})` : ""}`
      : isHandoff
        ? `[Nexus consultation] Hand-off from ${name}`
        : `[Nexus AI Website] [${category}] Message from ${name}`,
  );
  const identity = [name, email && `<${email}>`, phone && `phone ${phone}`]
    .filter(Boolean)
    .join(" ");

  // 1) Notify the team. This send is load-bearing: a failure fails the inquiry.
  const team = await sendEmail({
    to,
    subject,
    ...(email ? { replyTo: email } : {}),
    text: `From: ${identity}\nSource: ${source}\nAI category: ${category}\n\n${message}`,
  });
  if (!team.ok) {
    return { ok: false, error: "Failed to send message. Please try again later.", status: 502 };
  }

  // 2) Confirm to the visitor. Best-effort: a failure here never fails the
  //    inquiry. Skipped for the chat hand-off, whose body would carry
  //    model-generated text to a visitor-supplied address.
  if (email && !isHandoff) {
    const confirm = await sendEmail({
      to: email,
      subject: "We got your message, Nexus AI Solutions",
      replyTo: founderInbox(),
      text: `${autoReply}\n\nWe'll follow up by email to confirm the details. No need to call. You can reply straight to this message.\n\nNexus AI Solutions`,
      html: renderEmail({
        heading: "We've got your request",
        bodyHtml: `<p>${escapeHtml(autoReply)}</p><p style="margin-top:14px;">We'll follow up by email to confirm the details. No need to call. You can reply straight to this message.</p>`,
      }),
    });
    if (!confirm.ok) {
      console.error("[inquiry] visitor confirmation email failed (non-fatal)");
    }
  }

  return { ok: true, dev: !team.delivered, delivered: team.delivered, category, autoReply };
}
