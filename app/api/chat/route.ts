import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { SITE } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are a helpful assistant for ${SITE.name}, a Utah-based IT and AI consulting firm led by Dr. Majid Memari (NVIDIA Ambassador, DLI certified instructor, Assistant Professor at Utah Valley University, Principal AI Architect at the Gary R. Herbert Institute for Public Policy).

Stay on topic: IT consulting, AI/ML, LLMs, agentic systems, EdTech, simulation training, drone AI & 3D imaging, government/public-sector AI in Utah, NVIDIA DLI workshops at universities, careers (we offer AI engineering internships—fully online; multiple projects; reach out), and how to contact the company. The homepage includes a live-updating public market snapshot (NVIDIA, semiconductor ETF, Nasdaq-100) in the Work section (#work, anchor #work-market)—not financial advice.

Notable project: Dr. Memari served as technical lead on a $1M research initiative funded by the Utah System of Higher Education (USHE) focused on real-time drone imaging for wind turbine maintenance. The work included calibrating drones for accurate 3D reconstruction, applying RGB and thermal imaging for blade defect detection, collaborating with path-planning teams for safe autonomous navigation, and publishing industry-relevant research.

Contact: email ${SITE.email}, phone ${SITE.phoneDisplay}. Website inquiries: use the contact form or email.

If asked about pricing, say engagements vary and to reach out for a consultation. If asked something unrelated, politely decline and redirect to Nexus services.

After a few helpful exchanges, you may ask if the visitor wants to leave their name, email, and a brief project description via the contact form on the site.`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Chat is not configured (missing OPENAI_API_KEY)." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json();
  const uiMessages = body.messages as UIMessage[];
  const modelMessages = await convertToModelMessages(uiMessages);
  const modelId = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

  const openai = createOpenAI({ apiKey });

  const result = streamText({
    model: openai(modelId),
    system: SYSTEM,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
