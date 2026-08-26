import { convertToModelMessages, gateway, streamText, type UIMessage } from "ai";
import { nexusAssistantSystem } from "@/lib/assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const uiMessages = body.messages as UIMessage[];
  const modelMessages = await convertToModelMessages(uiMessages);
  const modelId = process.env.AI_CHAT_MODEL ?? "openai/gpt-oss-20b";

  try {
    const result = streamText({
      model: gateway(modelId),
      system: nexusAssistantSystem(),
      messages: modelMessages,
      providerOptions: {
        gateway: {
          tags: ["site:nexus", "feature:chat", `env:${process.env.VERCEL_ENV ?? "dev"}`],
        },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat request failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
