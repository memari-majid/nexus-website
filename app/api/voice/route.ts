import { twilioAuthConfigured, assertTwilioSignature, readTwilioForm } from "@/lib/twilio-signature";
import { gather, hangup, MESSAGE_PROMPT, openingGreeting, twiml, voiceUrl } from "@/lib/voice";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Incoming-call webhook for a hidden programmable (Twilio) answering line.
 * Retained for existing integrations. The public website offers email contact.
 */
export async function GET() {
  return Response.json({
    ok: true,
    engine: "twilio-twiml",
    role: "personal-assistant",
    twilioConfigured: twilioAuthConfigured(),
    hiddenTwilioNumberSet: Boolean(process.env.TWILIO_PHONE_NUMBER?.trim()),
    webhook: process.env.VOICE_WEBHOOK ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://nexusaisolution.net"}/api/voice`,
    note: "Personal assistant: answers brief questions, takes name + callback + message, emails Majid. Never transfers or rings his cell. Google Voice has no webhook; a hidden Twilio number is required for the AI to physically pick up.",
  });
}

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  const signed = await assertTwilioSignature(request, params);
  if (!signed) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!twilioAuthConfigured()) {
    return twiml(
      hangup(
        "This Nexus phone assistant is not fully configured. Please send us a message through the contact page at nexus A I solution dot net.",
      ),
    );
  }

  const attempt = Number(new URL(request.url).searchParams.get("attempt") ?? "1");
  if (attempt >= 2) {
    return twiml(
      gather(voiceUrl("/api/voice/message"), MESSAGE_PROMPT) +
        hangup("Thank you for calling Nexus A I Solutions. Goodbye."),
    );
  }

  return twiml(
    gather(voiceUrl("/api/voice/gather", { turn: 0, misses: 0 }), openingGreeting()) +
      `<Redirect method="POST">${voiceUrl("/api/voice", { attempt: attempt + 1 })}</Redirect>`,
  );
}
