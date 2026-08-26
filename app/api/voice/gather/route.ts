import { gateway, generateText } from "ai";
import { nexusVoiceSystem } from "@/lib/assistant";
import { assertTwilioSignature, readTwilioForm, twilioAuthConfigured } from "@/lib/twilio-signature";
import {
  decodeHistory,
  encodeHistory,
  gather,
  hangup,
  MAX_VOICE_TURNS,
  MESSAGE_PROMPT,
  say,
  twiml,
  VOICE_FALLBACK,
  voiceUrl,
  wantsGoodbye,
  wantsMessage,
} from "@/lib/voice";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const params = await readTwilioForm(request);
  const signed = await assertTwilioSignature(request, params);
  if (!signed) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const turn = Number(url.searchParams.get("turn") ?? "0");
  const misses = Number(url.searchParams.get("misses") ?? "0");
  const history = decodeHistory(url.searchParams.get("hist") ?? undefined);
  const speech = (params.SpeechResult ?? "").trim();

  if (!speech) {
    if (misses >= 1) {
      return twiml(
        gather(voiceUrl("/api/voice/message"), MESSAGE_PROMPT) +
          hangup("Thank you for calling. Goodbye."),
      );
    }
    return twiml(
      gather(
        voiceUrl("/api/voice/gather", { turn, misses: misses + 1, hist: url.searchParams.get("hist") ?? undefined }),
        "Sorry, I did not catch that. I can answer a brief question, or you can leave a message for Dr. Memari.",
      ) + hangup("Thank you for calling Nexus A I Solutions. Goodbye."),
    );
  }

  if (wantsGoodbye(speech)) {
    return twiml(
      gather(voiceUrl("/api/voice/message"), MESSAGE_PROMPT) +
        hangup("Thank you for calling Nexus A I Solutions. Goodbye."),
    );
  }

  if (wantsMessage(speech) || turn >= MAX_VOICE_TURNS) {
    return twiml(
      gather(voiceUrl("/api/voice/message"), MESSAGE_PROMPT) + hangup("Thank you. Goodbye."),
    );
  }

  if (!twilioAuthConfigured() && process.env.NODE_ENV === "production") {
    return twiml(hangup(VOICE_FALLBACK));
  }

  let reply = VOICE_FALLBACK;
  try {
    const modelId = process.env.VOICE_CHAT_MODEL ?? process.env.AI_CHAT_MODEL ?? "openai/gpt-oss-20b";
    const result = await generateText({
      model: gateway(modelId),
      system: nexusVoiceSystem(),
      messages: [...history, { role: "user", content: speech }],
      maxOutputTokens: 120,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(10_000),
      providerOptions: {
        gateway: {
          tags: ["site:nexus", "feature:voice", `env:${process.env.VERCEL_ENV ?? "dev"}`],
        },
      },
    });
    reply = result.text.trim() || VOICE_FALLBACK;
  } catch (err) {
    console.error("[voice] generateText:", err);
  }

  const nextHist = encodeHistory([
    ...history,
    { role: "user", content: speech },
    { role: "assistant", content: reply },
  ]);

  return twiml(
    gather(
      voiceUrl("/api/voice/gather", { turn: turn + 1, misses: 0, hist: nextHist }),
      `${reply} I can take a message for Dr. Memari whenever you are ready. Name, callback number, and a short note.`,
    ) + say("Thank you for calling Nexus A I Solutions. Goodbye."),
  );
}
