import { voicePublicOrigin } from "@/lib/twilio-signature";
import { SITE } from "@/lib/site";

export const MAX_VOICE_TURNS = 3;
export const VOICE_FALLBACK =
  "I am having trouble answering right now. Please say your name, a callback number, and a short message, and I will send that to Majid Memari.";
export const MESSAGE_PROMPT =
  "I will take a message for Majid Memari. Please say your name, the best number to reach you, and your message. He will call you back if he wants to continue.";

type HistoryTurn = { role: "user" | "assistant"; content: string };

export function openingGreeting(): string {
  return `Hello, you've reached Majid Memari. This is his A I personal assistant at ${SITE.name}. He is not on this line. I can answer a brief question about who he is or A I consulting and team training, or I can take a message and email it to him. How can I help?`;
}

export function wantsMessage(text: string): boolean {
  return /\b(leave a message|take a message|voicemail|voice mail|call me back|callback|call back)\b/i.test(
    text,
  );
}

export function wantsGoodbye(text: string): boolean {
  return /\b(goodbye|good bye|that's all|that is all|hang up|no thanks|no thank you|nothing else)\b/i.test(
    text,
  );
}

export function forSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#>-]+/g, " ")
    .replace(/https?:\/\/\S+/gi, "our website")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function twiml(inner: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export function say(text: string): string {
  const voice = process.env.VOICE_SAY_VOICE ?? "Polly.Matthew";
  return `<Say voice="${escapeXml(voice)}">${escapeXml(forSpeech(text))}</Say>`;
}

export function gather(action: string, prompt: string): string {
  const hints = "Nexus AI,Majid Memari,consulting,workshop,training,leave a message,callback";
  return `<Gather input="speech" action="${escapeXml(action)}" method="POST" speechTimeout="auto" timeout="6" language="en-US" enhanced="true" hints="${escapeXml(hints)}">${say(prompt)}</Gather>`;
}

export function voiceUrl(path: string, query: Record<string, string | number | undefined> = {}): string {
  const url = new URL(path, `${voicePublicOrigin()}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function encodeHistory(turns: HistoryTurn[]): string {
  const compact = turns.slice(-4).map((t) => `${t.role === "user" ? "u" : "a"}:${t.content.slice(0, 180)}`);
  return Buffer.from(JSON.stringify(compact), "utf8").toString("base64url");
}

export function decodeHistory(raw: string | undefined): HistoryTurn[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (typeof item !== "string" || item.length < 3) return [];
      const role = item.startsWith("u:") ? "user" : item.startsWith("a:") ? "assistant" : null;
      if (!role) return [];
      return [{ role, content: item.slice(2) }];
    });
  } catch {
    return [];
  }
}

export function hangup(text: string): string {
  return `${say(text)}<Hangup/>`;
}
