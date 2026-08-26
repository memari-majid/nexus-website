import { NextResponse } from "next/server";
import { submitInquiry } from "@/lib/inquiry";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await submitInquiry({
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
      phone: typeof body.phone === "string" ? body.phone : "",
      message: typeof body.message === "string" ? body.message : "",
      source: typeof body.source === "string" ? body.source : "contact-form",
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      dev: result.dev,
      category: result.category,
      autoReply: result.autoReply,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
}
