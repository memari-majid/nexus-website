import { createHash } from "node:crypto";
import {
  convertToModelMessages,
  gateway,
  stepCountIs,
  streamText,
  type SystemModelMessage,
} from "ai";
import { nexusChatSystem } from "@/lib/assistant";
import { ASSISTANT_NAME } from "@/lib/chat-persona";
import { chatTools, type NexusUIMessage } from "@/lib/chat-tools";
import { MAX_OUTPUT_TOKENS, MAX_STEPS, STREAM_TIMEOUT_MS, prechargeUsd } from "@/lib/chat-limits";
import {
  abortedBilledUsd,
  billedUsd,
  costUsd,
  tokenBreakdown,
  type ChatMessageMetadata,
} from "@/lib/chat-metadata";
import {
  defaultModel,
  fallbackModel,
  findModel,
  resolveModel,
  type ChatModel,
} from "@/lib/chat-models";
import { INVALID, clientIp, parseChatBody, settleOnce } from "@/lib/chat-request";
import { isEmailConfigured } from "@/lib/email";
import { getRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
/**
 * Literal on purpose: Next reads segment config statically. Mirrors
 * `MAX_DURATION_SECONDS` in lib/chat-limits.ts and `vercel.json`. The SDK
 * timeout (`STREAM_TIMEOUT_MS`) fires first so `onAbort` can settle the bill.
 */
export const maxDuration = 180;

/**
 * Production runs Claude Opus 5 via `AI_CHAT_MODEL`. A value outside the
 * picker allowlist is ignored with one warning at module load, never
 * silently: routing to an unpriced model would break the budget math.
 */
const DEFAULT_MODEL: ChatModel = (() => {
  const env = process.env.AI_CHAT_MODEL;
  const found = findModel(env);
  if (env && !found) {
    console.warn(
      `[chat] AI_CHAT_MODEL "${env}" is not in the picker allowlist (lib/chat-models.ts); using ${defaultModel().id}`,
    );
  }
  return found ?? defaultModel();
})();

type RenderedPrompt = { system: SystemModelMessage; emailEnabled: boolean };
let rendered: RenderedPrompt | undefined;

/**
 * Rendered once per instance, on the first request so `RESEND_*` is read at
 * runtime rather than at build. Sent as a system message with an Anthropic
 * cache breakpoint: the prompt plus tool schemas are about 4k stable tokens,
 * so every request after the first reads them at a tenth of the input price.
 * Other vendors ignore the `anthropic` key. With email unconfigured (all of
 * production today) the prompt declares the email tools off and the widget is
 * told via `emailEnabled` so it can pick chips that do not invite an email.
 */
function renderedPrompt(): RenderedPrompt {
  if (!rendered) {
    const emailEnabled = isEmailConfigured();
    rendered = {
      emailEnabled,
      system: {
        role: "system",
        content: nexusChatSystem({ emailEnabled }),
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
    };
  }
  return rendered;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Logs never carry a raw visitor IP. */
function ipHash(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** True when `a` lists dearer than `b` on input or output, so a swap actually saves money. */
function isDearer(a: ChatModel, b: ChatModel): boolean {
  return a.inputPerM > b.inputPerM || a.outputPerM > b.outputPerM;
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const ip = clientIp(req.headers);
  const limiter = getRateLimiter();

  const rate = await limiter.checkRequestRate(ip);
  if (!rate.allowed) {
    return json(429, {
      error: "You're sending messages pretty fast. Give it a few seconds and try again.",
    });
  }

  // Bound the raw payload before parsing: echoed tool parts add up quickly.
  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return json(400, { error: INVALID });
  }
  // Caps, the part-shape whitelist, and the stale-approval rewrite (lib/chat-request.ts).
  const body = parseChatBody(rawText);
  if (!body.ok) return json(body.status, { error: body.error });

  // `tools` routes historical tool results through `toModelOutput` (compact
  // text, optional chaining on untrusted output); `ignoreIncompleteToolCalls`
  // keeps a transcript stopped mid-call from 400ing.
  let modelMessages;
  try {
    modelMessages = await convertToModelMessages(body.messages, {
      tools: chatTools,
      ignoreIncompleteToolCalls: true,
    });
  } catch (err) {
    console.warn("[chat] convertToModelMessages rejected the transcript:", err);
    return json(400, { error: INVALID });
  }

  // Reserve the estimate on both day counters before the model runs; refused
  // requests are refunded inside the limiter. Beyond the soft budget the
  // request still runs, on the fallback model. Echoed tool payloads count
  // toward the estimate; only text counts toward the conversation cap.
  const requested = resolveModel(body.model, DEFAULT_MODEL);
  const precharge = prechargeUsd(requested, body.prechargeChars);
  const budget = await limiter.reserveBudget(ip, precharge);
  if (!budget.ok) {
    if (budget.reason === "ip") {
      return json(429, {
        error:
          "This network has used today's chat allowance. Please use the contact form, or come back tomorrow.",
      });
    }
    return json(503, {
      error: `The ${ASSISTANT_NAME} has reached today's usage limit. Please use the contact form, or try again tomorrow.`,
    });
  }
  // Past the soft budget, dearer picks run on the fallback model. A pick that
  // already costs no more than the fallback (Gemini, GPT-5.6 Sol) stays put:
  // swapping it would raise the bill, not lower it.
  const budgetFallback = budget.fallback && isDearer(requested, fallbackModel());
  const model = budgetFallback ? fallbackModel() : requested;
  const { reservation } = budget;
  const turns = body.messages.length;
  const prompt = renderedPrompt();

  let firstTokenAt: number | undefined;
  let stepCount = 0;
  let toolCallCount = 0;

  const logUsage = (fields: Record<string, unknown>) =>
    console.log(
      JSON.stringify({
        event: "chat.usage",
        site: "nexus",
        model: model.id,
        requestedModel: requested.id,
        budgetFallback,
        ip: ipHash(ip),
        turns,
        prechargeUsd: round6(precharge),
        ttftMs: firstTokenAt === undefined ? null : firstTokenAt - startedAt,
        totalMs: Date.now() - startedAt,
        backend: limiter.backend,
        globalSpentUsd: round6(budget.globalSpentUsd),
        ...fields,
      }),
    );

  // One settlement and one usage line per request: the SDK calls `onFinish`
  // after `onAbort` whenever a step had completed before the abort.
  const settle = settleOnce(
    async (outcome: "aborted" | "finished", billed: number, fields: Record<string, unknown>) => {
      if (outcome === "aborted") await limiter.topUpBudget(reservation, billed);
      else await limiter.settleBudget(reservation, billed);
      logUsage({ outcome, billedUsd: round6(billed), ...fields });
    },
  );

  const result = streamText({
    model: gateway(model.id),
    system: prompt.system,
    messages: modelMessages,
    tools: chatTools,
    // Brief + snapshot + reply fits with one spare step; approvals end the turn early.
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeout: { totalMs: STREAM_TIMEOUT_MS },
    // The only clean way to hand the client IP to module-scope tools.
    experimental_context: { ip },
    providerOptions: {
      gateway: {
        tags: ["site:nexus", "feature:chat", `env:${process.env.VERCEL_ENV ?? "dev"}`],
      },
    },
    onError: ({ error }) => {
      console.error("[chat] model error:", error);
    },
    // Abort (timeout or visitor stop): only ever top up, never refund. The
    // step in flight had its prompt consumed, so it is charged at the estimate.
    onAbort: async ({ steps }) => {
      await settle("aborted", abortedBilledUsd(model, steps.map((s) => s.usage), precharge), {
        steps: steps.length,
      });
    },
    // Settle the reservation against actual usage and write one JSON line so
    // cost per conversation can be graphed from Vercel logs.
    onFinish: async ({ steps, totalUsage, finishReason }) => {
      const tokens = tokenBreakdown(totalUsage);
      await settle("finished", billedUsd(model, steps.map((s) => s.usage), precharge), {
        inputTokens: tokens.input,
        cacheReadTokens: tokens.cacheRead,
        cacheWriteTokens: tokens.cacheWrite,
        outputTokens: tokens.output,
        reasoningTokens: tokens.reasoning,
        totalTokens: tokens.total,
        costUsd: round6(costUsd(model, tokens)),
        steps: steps.length,
        toolCalls: steps.reduce((n, s) => n + s.toolCalls.length, 0),
        finishReason,
      });
    },
  });

  return result.toUIMessageStreamResponse<NexusUIMessage>({
    // Never stream provider error text to visitors; log it and show a plain fallback.
    onError: (error) => {
      console.error("[chat] stream error:", error);
      return `The ${ASSISTANT_NAME} is unavailable right now. Please use the contact form instead.`;
    },
    // Streamed in pieces and merged on the client: model on start, time to
    // first token with the first text delta, totals on finish.
    messageMetadata: ({ part }): ChatMessageMetadata | undefined => {
      switch (part.type) {
        case "start":
          return {
            model: model.id,
            modelLabel: model.label,
            budgetFallback,
            emailEnabled: prompt.emailEnabled,
          };
        case "text-delta":
          if (firstTokenAt !== undefined) return undefined;
          firstTokenAt = Date.now();
          return { ttftMs: firstTokenAt - startedAt };
        case "tool-call":
          toolCallCount += 1;
          return undefined;
        case "finish-step":
          stepCount += 1;
          return undefined;
        case "finish": {
          const tokens = tokenBreakdown(part.totalUsage);
          return {
            ttftMs: firstTokenAt === undefined ? undefined : firstTokenAt - startedAt,
            totalMs: Date.now() - startedAt,
            tokens,
            costUsd: round6(costUsd(model, tokens)),
            steps: stepCount,
            toolCalls: toolCallCount,
            finishReason: part.finishReason,
          };
        }
        default:
          return undefined;
      }
    },
  });
}
