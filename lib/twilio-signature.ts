import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "@/lib/site";

/** Origin used to rebuild the URL Twilio signed (must match the webhook they POST to). */
export function voicePublicOrigin(): string {
  const webhook = process.env.VOICE_WEBHOOK?.trim();
  if (webhook) {
    try {
      return new URL(webhook).origin;
    } catch {
      /* fall through */
    }
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, "");
}

export function twilioRequestUrl(request: Request): string {
  const incoming = new URL(request.url);
  return `${voicePublicOrigin()}${incoming.pathname}${incoming.search}`;
}

export function twilioAuthConfigured(): boolean {
  return Boolean(process.env.TWILIO_AUTH_TOKEN?.trim() && process.env.TWILIO_ACCOUNT_SID?.trim());
}

/**
 * Twilio request validation (HMAC-SHA1 of full URL + sorted POST params).
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function readTwilioForm(request: Request): Promise<Record<string, string>> {
  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = String(value);
  }
  return params;
}

export async function assertTwilioSignature(
  request: Request,
  params: Record<string, string>,
): Promise<boolean> {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token) {
    if (process.env.NODE_ENV === "production" && process.env.VOICE_ALLOW_INSECURE !== "1") {
      return false;
    }
    console.warn("[voice] TWILIO_AUTH_TOKEN missing — skipping signature check (dev only)");
    return true;
  }
  const signature = request.headers.get("x-twilio-signature") ?? "";
  return validateTwilioSignature(token, signature, twilioRequestUrl(request), params);
}
