import { clientIp } from "@/lib/chat-request";
import { submitInquiry } from "@/lib/inquiry";
import { assertTwilioSignature, readTwilioForm } from "@/lib/twilio-signature";
import { gather, hangup, MESSAGE_PROMPT, twiml, voiceUrl } from "@/lib/voice";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  const signed = await assertTwilioSignature(request, params);
  if (!signed) {
    return new Response("Forbidden", { status: 403 });
  }

  const speech = (params.SpeechResult ?? "").trim();
  const from = (params.From ?? "").trim();

  if (!speech) {
    return twiml(
      gather(voiceUrl("/api/voice/message"), MESSAGE_PROMPT) + hangup("Thank you. Goodbye."),
    );
  }

  const result = await submitInquiry({
    name: "Phone caller",
    phone: from || undefined,
    message: `Voice assistant message for Majid Memari (do not transfer; he will call back if he wants).\nCaller ID: ${from || "unknown"}\nTranscript:\n${speech}`,
    source: "voice-assistant",
    // Same derivation as every other route, so the classifier this reaches is
    // metered the same way. Twilio is the peer here, not the caller, so every
    // voice message shares one bucket: that is the point, since the phone line
    // is one funnel into the same model call and the caller's own network is
    // never visible to us.
    clientIp: clientIp(request.headers),
  });

  if (!result.ok) {
    console.error("[voice] submitInquiry:", result.error);
    return twiml(
      hangup(
        "I could not save that message. Please email info at nexus A I solution dot net.",
      ),
    );
  }

  return twiml(
    hangup(
      "Thank you. I have sent your message to Majid Memari. He will call you back if he wants to continue. Goodbye.",
    ),
  );
}
