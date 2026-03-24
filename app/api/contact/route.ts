import { NextResponse } from "next/server";
import { Resend } from "resend";
import { SITE } from "@/lib/site";
import { classifyInquiry, fallbackInquiryResponse, type InquiryCategory } from "@/lib/inquiry-ai";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Smaller / cheaper model for classification (override with CONTACT_CLASSIFY_MODEL). */
const CLASSIFY_MODEL = process.env.CONTACT_CLASSIFY_MODEL ?? "gpt-4o-mini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const source = typeof body.source === "string" ? body.source : "contact-form";

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    let category: InquiryCategory = "general";
    let autoReply = fallbackInquiryResponse().autoReply;

    if (apiKey) {
      try {
        const classified = await classifyInquiry({
          name,
          message,
          apiKey,
          modelId: CLASSIFY_MODEL,
        });
        category = classified.category;
        autoReply = classified.autoReply;
      } catch (err) {
        console.error("[contact] classifyInquiry:", err);
        const fb = fallbackInquiryResponse();
        category = fb.category;
        autoReply = fb.autoReply;
      }
    }

    const to = process.env.CONTACT_TO_EMAIL ?? SITE.email;
    const subject = `[Nexus AI Website] [${category}] Message from ${name}`;

    if (resend) {
      const { error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "Nexus AI <onboarding@resend.dev>",
        to: [to],
        replyTo: email,
        subject,
        text: `From: ${name} <${email}>\nSource: ${source}\nAI category: ${category}\n\n${message}`,
      });
      if (error) {
        console.error("Resend error:", error);
        return NextResponse.json({ error: "Failed to send message. Please try again later." }, { status: 502 });
      }
    } else {
      console.info("[contact] RESEND_API_KEY not set — message logged only:", {
        name,
        email,
        source,
        category,
        messagePreview: message.slice(0, 200),
      });
    }

    return NextResponse.json({
      ok: true,
      dev: !resend,
      category,
      autoReply,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
