import { createHash } from "node:crypto";
import {
  InvalidToolApprovalSignatureError,
  convertToModelMessages,
  gateway,
  stepCountIs,
  streamText,
  type SystemModelMessage,
} from "ai";
import { approvalSecret } from "@/lib/approval-signature";
import { nexusChatSystem } from "@/lib/assistant";
import { ASSISTANT_NAME } from "@/lib/chat-persona";
import { activeChatTools, chatTools, type NexusUIMessage } from "@/lib/chat-tools";
import { MAX_OUTPUT_TOKENS, MAX_STEPS, STREAM_TIMEOUT_MS, prechargeUsd } from "@/lib/chat-limits";
import {
  abortedBilledUsd,
  billedUsd,
  costUsd,
  tokenBreakdown,
  type ChatMessageMetadata,
} from "@/lib/chat-metadata";
import { defaultModel, fallbackModel, findModel, type ChatModel } from "@/lib/chat-models";
import { INVALID, clientIp, parseChatBody, settleOnce } from "@/lib/chat-request";
import { isEmailConfigured } from "@/lib/email";
import { gatewayProviderOptions } from "@/lib/gateway";
import { getRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
/**
 * Literal on purpose: Next reads segment config statically. Mirrors
 * `MAX_DURATION_SECONDS` in lib/chat-limits.ts and `vercel.json`. The SDK
 * timeout (`STREAM_TIMEOUT_MS`) fires first so `onAbort` can settle the bill.
 */
export const maxDuration = 180;

/**
 * Production runs Claude Haiku 4.5 via `AI_CHAT_MODEL`. A value outside the
 * allowlist in lib/chat-models.ts is ignored with one warning at module load,
 * never silently: routing to an unpriced model would break the budget math.
 * The request body carries no model choice; whatever a client sends there is
 * dropped by the body schema.
 */
const CHAT_MODEL: ChatModel = (() => {
  const env = process.env.AI_CHAT_MODEL;
  const found = findModel(env);
  if (env && !found) {
    console.warn(
      `[chat] AI_CHAT_MODEL "${env}" is not in the allowlist (lib/chat-models.ts); using ${defaultModel().id}`,
    );
  }
  return found ?? defaultModel();
})();

type RenderedPrompt = { system: SystemModelMessage; emailEnabled: boolean };
let rendered: RenderedPrompt | undefined;

/**
 * Rendered once per instance, on the first request so `RESEND_*` is read at
 * runtime rather than at build. Sent as a system message with an Anthropic
 * cache breakpoint when the model supports prompt caching: the prompt plus
 * tool schemas are about 14k stable tokens, so every request after the first
 * reads them at a tenth of the input price. With email unconfigured (all of
 * production today) the prompt declares the email tools off and the widget is
 * told via `emailEnabled` so it can pick chips that do not invite an email.
 */
function renderedPrompt(): RenderedPrompt {
  const emailEnabled = isEmailConfigured();
  if (!rendered || rendered.emailEnabled !== emailEnabled) {
    rendered = {
      emailEnabled,
      system: {
        role: "system",
        content: nexusChatSystem({ emailEnabled }),
        ...(CHAT_MODEL.promptCache
          ? { providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } }
          : {}),
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
  // Caps, the part-shape whitelist, the stale-approval rewrite, and the
  // signature checks (lib/chat-request.ts). The same secret signs every
  // approval request `streamText` emits below, so an approval the model never
  // asked for is refused here, before a dollar is reserved.
  const secret = approvalSecret();
  const body = parseChatBody(rawText, { approvalSecret: secret });
  if (!body.ok) return json(body.status, { error: body.error });
  if (body.rejected.forgedApprovals > 0 || body.rejected.unsignedDrafts > 0) {
    console.warn(
      JSON.stringify({
        event: "chat.rejected",
        site: "nexus",
        ip: ipHash(ip),
        ...body.rejected,
      }),
    );
  }

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
  const requested = CHAT_MODEL;
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
  // Past the soft budget a dearer model would run on the fallback. With one
  // model in the allowlist the fallback is the same model, so this is a
  // no-op kept in place: the hard budget above is what refuses.
  const budgetFallback = budget.fallback && isDearer(requested, fallbackModel());
  const model = budgetFallback ? fallbackModel() : requested;
  const { reservation } = budget;
  const turns = body.messages.length;
  const prompt = renderedPrompt();

  let firstTokenAt: number | undefined;

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
  // after `onAbort` whenever a step had completed before the abort. A
  // `failed` outcome is a call the SDK refused before any step ran (a forged
  // approval that got past the sanitizer): nothing was spent, but the
  // reservation is kept rather than refunded, so a refused request is never
  // cheaper than an honest one.
  const settle = settleOnce(
    async (outcome: "aborted" | "finished" | "failed", billed: number, fields: Record<string, unknown>) => {
      if (outcome === "finished") await limiter.settleBudget(reservation, billed);
      else await limiter.topUpBudget(reservation, billed);
      logUsage({ outcome, billedUsd: round6(billed), ...fields });
    },
  );

  const result = streamText({
    model: gateway(model.id),
    system: prompt.system,
    messages: modelMessages,
    tools: chatTools,
    activeTools: activeChatTools(prompt.emailEnabled),
    // Brief + snapshot + reply fits with one spare step; approvals end the turn early.
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeout: { totalMs: STREAM_TIMEOUT_MS },
    // The visitor's Stop button, a closed tab, or a dropped connection abort
    // the request, and this is what carries that to the gateway call. Without
    // it the model kept generating a reply nobody would read, `onAbort` only
    // ever fired on the timeout, and a stopped turn wrote no usage line.
    abortSignal: req.signal,
    // Signs every approval request and refuses a replayed approval whose
    // signature is missing or wrong. The sanitizer already did this with the
    // same secret; this is the SDK's own check, kept as the backstop.
    experimental_toolApprovalSecret: secret,
    // The only clean way to hand the client IP to module-scope tools.
    experimental_context: { ip },
    providerOptions: gatewayProviderOptions("chat", model),
    onError: ({ error }) => {
      console.error("[chat] model error:", error);
      // Thrown before the first step, so neither `onFinish` nor `onAbort`
      // will run: settle here or the reservation is never written up.
      if (InvalidToolApprovalSignatureError.isInstance(error)) {
        void settle("failed", precharge, { steps: 0, error: "forged-approval" });
      }
    },
    // Abort (timeout or visitor stop): only ever top up, never refund. The
    // step in flight had its prompt consumed, so it is charged at the estimate.
    onAbort: async ({ steps }) => {
      await settle("aborted", abortedBilledUsd(model, steps.map((s) => s.usage), precharge), {
        steps: steps.length,
      });
    },
    // Settle the reservation against actual usage and write one JSON line so
    // cost per conversation can be graphed from Vercel logs. This line is the
    // only place the cost, the tokens, and the timing are reported.
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
      if (InvalidToolApprovalSignatureError.isInstance(error)) {
        return "That approval could not be verified, so nothing was sent. Tap New and ask again.";
      }
      return `The ${ASSISTANT_NAME} is unavailable right now. Please try again in a moment.`;
    },
    // The client learns one thing about the server, on start: whether
    // outgoing email is on, so it can choose chips. The first text delta is
    // noted here for the usage log's time to first token and never streamed.
    messageMetadata: ({ part }): ChatMessageMetadata | undefined => {
      switch (part.type) {
        case "start":
          return { emailEnabled: prompt.emailEnabled };
        case "text-delta":
          if (firstTokenAt === undefined) firstTokenAt = Date.now();
          return undefined;
        default:
          return undefined;
      }
    },
  });
}
