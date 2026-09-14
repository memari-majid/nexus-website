import { NextResponse } from "next/server";
import { clientIp } from "@/lib/chat-request";
import { submitInquiry } from "@/lib/inquiry";

/**
 * A bare POST into `submitInquiry`, which owns the metering: the classifier it
 * calls is a model call an anonymous visitor starts, so it is rate limited,
 * budgeted and logged there rather than here. The voice route reaches the same
 * function, and a gate in only one of the two routes is not a gate.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await submitInquiry({
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
      phone: typeof body.phone === "string" ? body.phone : "",
      message: typeof body.message === "string" ? body.message : "",
      source: typeof body.source === "string" ? body.source : "contact-form",
      // Same derivation as the chat and eval routes, so one visitor buckets the
      // same everywhere.
      clientIp: clientIp(request.headers),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      dev: result.dev,
      delivered: result.delivered,
      category: result.category,
      autoReply: result.autoReply,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
