import { Resend } from "resend";
import { SITE } from "@/lib/site";
import { classifyInquiry, fallbackInquiryResponse, type InquiryCategory } from "@/lib/inquiry-ai";

const CLASSIFY_MODEL = process.env.CONTACT_CLASSIFY_MODEL ?? "openai/gpt-oss-20b";

export type InquiryInput = {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  source?: string;
};

export type InquirySuccess = {
  ok: true;
  dev: boolean;
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
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Invalid email address.", status: 400 };
  }

  let category: InquiryCategory = "general";
  let autoReply = fallbackInquiryResponse().autoReply;

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

  const to = process.env.CONTACT_TO_EMAIL ?? SITE.email;
  const subject = isVoice
    ? `[Nexus voice] Message for Majid from ${name}${phone ? ` (${phone})` : ""}`
    : `[Nexus AI Website] [${category}] Message from ${name}`;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const identity = [name, email && `<${email}>`, phone && `phone ${phone}`].filter(Boolean).join(" ");

  if (resend) {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Nexus AI <onboarding@resend.dev>",
      to: [to],
      ...(email ? { replyTo: email } : {}),
      subject,
      text: `From: ${identity}\nSource: ${source}\nAI category: ${category}\n\n${message}`,
    });
    if (error) {
      console.error("Resend error:", error);
      return { ok: false, error: "Failed to send message. Please try again later.", status: 502 };
    }
  } else {
    console.info("[inquiry] RESEND_API_KEY not set — message logged only:", {
      name,
      email: email || undefined,
      phone: phone || undefined,
      source,
      category,
      messagePreview: message.slice(0, 200),
    });
  }

  return { ok: true, dev: !resend, category, autoReply };
}
