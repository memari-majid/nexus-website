import { deriveRegistration, priceLine, type Registration } from "@/lib/registration";
import { submitInquiry } from "@/lib/inquiry";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Deterministic filing for the in-chat booking card. The card posts here
 * directly (rather than trusting the model to re-file), so a request can never
 * be lost. Everything routes to the workshop inbox (Dr. Memari) via the shared
 * inquiry pipeline, which also sends the visitor a branded confirmation.
 */
export async function POST(req: Request) {
  let body: Registration;
  try {
    body = (await req.json()) as Registration;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  if (!name || !email) {
    return json({ error: "Name and email are required." }, 400);
  }

  const d = deriveRegistration(body);
  const lines = [
    body.workshop ? `Workshop: ${body.workshop}` : null,
    body.need ? `Need: ${body.need}` : null,
    body.role ? `Role: ${body.role}` : null,
    body.organization ? `Organization: ${body.organization}` : null,
    body.headcount ? `Team size: ${body.headcount}` : null,
    body.delivery ? `Delivery: ${body.delivery}` : null,
    body.timing ? `Timing: ${body.timing}` : null,
    `Pricing: ${priceLine(body)}${d.needsQuote ? "  <-- QUOTE NEEDED" : ""}`,
  ].filter(Boolean);

  const result = await submitInquiry({
    name,
    email,
    message: `[Chat workshop request]\n${lines.join("\n")}`,
    source: "chat-workshop",
  });

  if (!result.ok) {
    return json({ error: result.error }, result.status);
  }
  return json({ ok: true });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
