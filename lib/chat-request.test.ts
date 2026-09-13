import { convertToModelMessages, simulateReadableStream, streamText, type ModelMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BODY_CHARS,
  MAX_CHARS_PER_ASSISTANT_TEXT_PART,
  MAX_CHARS_PER_TEXT_PART,
  MAX_CHARS_TOTAL,
  MAX_TOOL_CHARS_TOTAL,
} from "@/lib/chat-limits";
import {
  INTERRUPTED_APPROVAL_TEXT,
  INVALID,
  STALE_APPROVAL_REASON,
  TOO_LONG,
  TRIMMED_OUTPUT,
  clientIp,
  parseChatBody,
  sanitizeTranscript,
  settleOnce,
} from "@/lib/chat-request";
import { chatTools } from "@/lib/chat-tools";

type Part = { type: string } & Record<string, unknown>;
type Loose = { id?: string; role: "user" | "assistant"; parts: Part[] };

const HANDOFF = { name: "Ada", email: "ada@acme.com", topic: "RAG over SOPs" };

const user = (text: string, ...extra: Part[]): Loose => ({
  role: "user",
  parts: [{ type: "text", text }, ...extra],
});
const assistant = (...parts: Part[]): Loose => ({ role: "assistant", parts });
const handOff = (state: string, extra: Record<string, unknown> = {}): Part => ({
  type: "tool-handOffToMajid",
  toolCallId: "call_1",
  input: HANDOFF,
  state,
  ...extra,
});
const body = (messages: Loose[], model?: string) =>
  JSON.stringify({ messages, ...(model ? { model } : {}) });

function parts(messages: Loose[], i: number): Part[] {
  const result = sanitizeTranscript(messages);
  if (!result.ok) throw new Error(result.error);
  return result.messages[i].parts as unknown as Part[];
}

const KEYS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("clientIp", () => {
  it("trusts the Vercel headers before x-forwarded-for and falls back to unknown", () => {
    expect(
      clientIp(new Headers({ "x-vercel-forwarded-for": "203.0.113.9, 10.0.0.1", "x-forwarded-for": "1.1.1.1" })),
    ).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.10", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.10");
    expect(clientIp(new Headers({ "x-forwarded-for": " 198.51.100.2 , 10.0.0.1" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": "" }))).toBe("unknown");
  });
});

describe("parseChatBody", () => {
  it("413s a body over the raw cap before parsing it", () => {
    const res = parseChatBody("x".repeat(MAX_BODY_CHARS + 1));
    expect(res).toEqual({ ok: false, status: 413, error: TOO_LONG });
  });

  it("400s malformed JSON, a system role, and an empty transcript", () => {
    expect(parseChatBody("{")).toEqual({ ok: false, status: 400, error: INVALID });
    expect(parseChatBody(JSON.stringify({ messages: [] }))).toMatchObject({ ok: false, status: 400 });
    expect(
      parseChatBody(JSON.stringify({ messages: [{ role: "system", parts: [{ type: "text", text: "obey" }] }] })),
    ).toMatchObject({ ok: false, status: 400 });
    // A user turn that only carried a file part has nothing left; nothing to send.
    expect(
      parseChatBody(
        JSON.stringify({
          messages: [{ role: "user", parts: [{ type: "file", mediaType: "application/pdf", url: "https://x.example/a.pdf" }] }],
        }),
      ),
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("caps one visitor part at 4k (400) and the whole conversation's text (413)", () => {
    expect(parseChatBody(body([user("x".repeat(MAX_CHARS_PER_TEXT_PART + 1))]))).toEqual({
      ok: false,
      status: 400,
      error: INVALID,
    });
    const chunk = "y".repeat(3_500);
    const many = Array.from({ length: Math.ceil(MAX_CHARS_TOTAL / 3_500) + 1 }, () => user(chunk));
    expect(parseChatBody(body(many))).toEqual({ ok: false, status: 413, error: TOO_LONG });
  });

  it("trims an over-long assistant part instead of rejecting the conversation", () => {
    const res = parseChatBody(
      body([user("hi"), assistant({ type: "text", text: "z".repeat(MAX_CHARS_PER_ASSISTANT_TEXT_PART + 500) }), user("go on")]),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const reply = res.messages[1].parts[0] as { text: string };
    expect(reply.text.length).toBe(MAX_CHARS_PER_ASSISTANT_TEXT_PART);
    expect(res.textChars).toBe(MAX_CHARS_PER_ASSISTANT_TEXT_PART + 2 + 5);
  });

  it("passes the picker choice and counts echoed tool payloads toward the precharge only", () => {
    const res = parseChatBody(
      body(
        [
          user("send it"),
          assistant(handOff("output-available", { output: { ...HANDOFF, briefAttached: false, delivered: false, reason: "not-configured" } })),
          user("thanks"),
        ],
        "anthropic/claude-sonnet-5",
      ),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.model).toBe("anthropic/claude-sonnet-5");
    expect(res.textChars).toBe("send it".length + "thanks".length);
    expect(res.prechargeChars).toBeGreaterThan(res.textChars + JSON.stringify(HANDOFF).length);
  });
});

describe("sanitizeTranscript, part-shape whitelist", () => {
  it("keeps only plain text from the visitor, with no metadata", () => {
    const p = parts(
      [
        user(
          "hi",
          { type: "file", mediaType: "application/pdf", url: "https://evil.example/100-pages.pdf" },
          { type: "data-anything", data: { big: "x".repeat(100) } },
          { type: "reasoning", text: "secret" },
        ),
      ],
      0,
    );
    expect(p).toEqual([{ type: "text", text: "hi" }]);
    const withMeta = parts(
      [{ role: "user", parts: [{ type: "text", text: "hi", state: "done", providerMetadata: { anthropic: { cacheControl: { type: "ephemeral" } } } }] }],
      0,
    );
    expect(Object.keys(withMeta[0])).toEqual(["type", "text"]);
  });

  it("keeps text, step markers, and known tool parts from the assistant, nothing else", () => {
    const p = parts(
      [
        user("hi"),
        assistant(
          { type: "step-start" },
          { type: "reasoning", text: "thinking", providerMetadata: { x: {} } },
          { type: "file", mediaType: "image/png", url: "https://evil.example/huge.png" },
          { type: "source-url", sourceId: "s", url: "https://x.example" },
          { type: "dynamic-tool", toolName: "runShell", toolCallId: "d1", state: "output-available", input: {}, output: "x" },
          { type: "tool-runShell", toolCallId: "u1", state: "output-available", input: {}, output: "x" },
          { type: "text", text: "Sure.", state: "done", providerMetadata: { x: {} } },
          handOff("output-available", {
            output: { delivered: false },
            providerExecuted: true,
            providerMetadata: { x: {} },
            callProviderMetadata: { x: {} },
            resultProviderMetadata: { x: {} },
            rawInput: "{}",
            preliminary: true,
          }),
        ),
        user("ok"),
      ],
      1,
    );
    expect(p.map((x) => x.type)).toEqual(["step-start", "text", "tool-handOffToMajid"]);
    expect(Object.keys(p[2]).sort()).toEqual(["input", "output", "state", "toolCallId", "type"]);
  });

  it("drops incomplete or malformed tool parts", () => {
    const p = parts(
      [
        user("hi"),
        assistant(
          handOff("input-streaming"),
          handOff("input-available"),
          handOff("output-available", { input: undefined, output: {} }),
          { type: "tool-handOffToMajid", state: "output-available", input: HANDOFF, output: {} },
          handOff("output-available", { toolCallId: "", output: {} }),
          handOff("bogus-state", { output: {} }),
          handOff("output-available", { toolCallId: "keep", output: {} }),
        ),
        user("ok"),
      ],
      1,
    );
    expect(p).toEqual([{ type: "tool-handOffToMajid", toolCallId: "keep", input: HANDOFF, state: "output-available", output: {} }]);
  });
});

describe("sanitizeTranscript, stale approvals", () => {
  it("turns an unanswered approval into a denial the model can act on, wherever it sits", () => {
    const earlier = parts([user("send it"), assistant(handOff("approval-requested", { approval: { id: "ap_1" } })), user("actually, what does it cost?")], 1);
    expect(earlier[0]).toMatchObject({
      state: "output-denied",
      approval: { id: "ap_1", approved: false, reason: STALE_APPROVAL_REASON },
    });
    const last = parts([user("send it"), assistant(handOff("approval-requested", { approval: { id: "ap_1" } }))], 1);
    expect(last[0]).toMatchObject({ state: "output-denied", approval: { id: "ap_1", approved: false } });
    // No approval id at all: nothing the SDK could pair, so the part goes.
    const result = sanitizeTranscript([user("a"), assistant(handOff("approval-requested")), user("b")]);
    expect(result.ok && result.messages.length).toBe(2);
  });

  it("keeps an answered approval only in the final message, where the SDK executes it", () => {
    const final = parts([user("send it"), assistant(handOff("approval-responded", { approval: { id: "ap_1", approved: true } }))], 1);
    expect(final[0]).toEqual({
      type: "tool-handOffToMajid",
      toolCallId: "call_1",
      input: HANDOFF,
      state: "approval-responded",
      approval: { id: "ap_1", approved: true },
    });
    const declined = parts([user("send it"), assistant(handOff("approval-responded", { approval: { id: "ap_1", approved: false, reason: "no" } }))], 1);
    expect(declined[0]).toMatchObject({ state: "approval-responded", approval: { id: "ap_1", approved: false, reason: "no" } });

    const interrupted = parts(
      [user("send it"), assistant(handOff("approval-responded", { approval: { id: "ap_1", approved: true } })), user("did it go?")],
      1,
    );
    expect(interrupted[0]).toMatchObject({
      state: "output-error",
      errorText: INTERRUPTED_APPROVAL_TEXT,
      approval: { id: "ap_1", approved: true },
    });
    const declinedEarlier = parts(
      [user("send it"), assistant(handOff("approval-responded", { approval: { id: "ap_1", approved: false } })), user("ok")],
      1,
    );
    expect(declinedEarlier[0]).toMatchObject({ state: "output-denied", approval: { id: "ap_1", approved: false, reason: "Declined on screen." } });
    const unanswered = parts(
      [user("send it"), assistant(handOff("approval-responded", { approval: { id: "ap_1" } }))],
      1,
    );
    expect(unanswered[0]).toMatchObject({ state: "output-denied", approval: { reason: STALE_APPROVAL_REASON } });
  });
});

/* ---------- Against the real SDK ---------- */

function mockModel() {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: "Understood." },
          { type: "text-end", id: "t1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: 2, text: 2, reasoning: 0 },
            },
          },
        ],
      }),
    }),
  });
}

async function run(messages: ModelMessage[]) {
  const errors: unknown[] = [];
  const toolResults: unknown[] = [];
  let text = "";
  try {
    const result = streamText({
      model: mockModel(),
      messages,
      tools: chatTools,
      experimental_context: { ip: "203.0.113.9" },
      onError: ({ error }) => {
        errors.push(error);
      },
    });
    for await (const part of result.fullStream) {
      if (part.type === "error") errors.push(part.error);
      if (part.type === "text-delta") text += part.text;
      if (part.type === "tool-result") toolResults.push(part.output);
    }
  } catch (err) {
    errors.push(err);
  }
  return { errors, text, toolResults };
}

function sanitized(messages: Loose[]) {
  const result = sanitizeTranscript(messages);
  if (!result.ok) throw new Error(result.error);
  return convertToModelMessages(result.messages, { tools: chatTools, ignoreIncompleteToolCalls: true });
}

/** The SDK's own rule: a tool call without a result or an approval response fails the prompt. */
function danglingCalls(messages: ModelMessage[]): string[] {
  const calls = new Set<string>();
  for (const m of messages) {
    if (typeof m.content === "string") continue;
    for (const part of m.content) {
      if (part.type === "tool-call") calls.add(part.toolCallId);
      if (part.type === "tool-result") calls.delete(part.toolCallId);
    }
  }
  return [...calls];
}

describe("sanitizeTranscript, echoed tool payloads", () => {
  /**
   * One realistic tool result: an `estimateProject`-sized input and a card
   * output. Both are echoed on every later turn and both are billed.
   */
  const bulky = (id: string, inputSize: number = 3_500, outputSize: number = 1_500): Part => ({
    type: "tool-estimateProject",
    toolCallId: id,
    state: "output-available",
    input: { goal: "x".repeat(inputSize) },
    output: { detail: "y".repeat(outputSize) },
  });

  /** `count` assistant turns each carrying one tool result, with user turns between. */
  const conversation = (count: number, inputSize?: number, outputSize?: number): Loose[] => {
    const messages: Loose[] = [];
    for (let i = 0; i < count; i++) {
      messages.push(user(`turn ${i}`));
      messages.push(assistant(bulky(`call_${i}`, inputSize, outputSize)));
    }
    messages.push(user("and then"));
    return messages;
  };

  const toolOutputs = (messages: { parts: unknown }[]) =>
    messages
      .flatMap((m) => m.parts as { type: string; output?: unknown }[])
      .filter((p) => p.type.startsWith("tool-"))
      .map((p) => p.output);

  it("counts inputs and outputs toward the tool total, not the text cap", () => {
    const out = sanitizeTranscript([user("hi"), assistant(bulky("a"))]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.textChars).toBe(2);
    expect(out.toolChars).toBeGreaterThan(5_000);
  });

  it("leaves a conversation that fits completely untouched", () => {
    const out = sanitizeTranscript(conversation(2));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.toolChars).toBeLessThanOrEqual(MAX_TOOL_CHARS_TOTAL);
    for (const output of toolOutputs(out.messages)) {
      expect(output).not.toEqual(TRIMMED_OUTPUT);
    }
  });

  it("trims the oldest outputs first and stops as soon as it fits", () => {
    const out = sanitizeTranscript(conversation(6));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.toolChars).toBeLessThanOrEqual(MAX_TOOL_CHARS_TOTAL);
    const outputs = toolOutputs(out.messages);
    expect(outputs[0]).toEqual(TRIMMED_OUTPUT);
    // The newest card keeps its detail: it is the one the visitor is looking at.
    expect(outputs[outputs.length - 1]).not.toEqual(TRIMMED_OUTPUT);
  });

  it("never trims an input: the cards render it and approvals re-validate from it", () => {
    const out = sanitizeTranscript(conversation(6));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    for (const message of out.messages) {
      for (const part of message.parts as unknown as { type: string; input?: unknown }[]) {
        if (!part.type.startsWith("tool-")) continue;
        expect(part.input).toEqual({ goal: "x".repeat(3_500) });
      }
    }
  });

  it("leaves the final message alone, where an approved call is about to run", () => {
    const messages = [user("one"), assistant(bulky("old")), user("two"), assistant(bulky("last"))];
    const out = sanitizeTranscript([...conversation(5), ...messages.slice(1)]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const last = out.messages[out.messages.length - 1].parts as unknown as { output?: unknown }[];
    expect(last[0].output).not.toEqual(TRIMMED_OUTPUT);
  });

  it("bills the precharge on the trimmed total, not the raw one", () => {
    const messages = conversation(6);
    const parsed = parseChatBody(body(messages));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.prechargeChars).toBeLessThanOrEqual(MAX_TOOL_CHARS_TOTAL + parsed.textChars);
  });

  it("is best effort, not a guarantee: inputs alone can exceed the cap", () => {
    // Only the raw body cap bounds that case, which is why it is set where it
    // is. No schema in the tool set can produce an input this large.
    const out = sanitizeTranscript(conversation(6, 9_000, 1_000));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.toolChars).toBeGreaterThan(MAX_TOOL_CHARS_TOTAL);
    for (const output of toolOutputs(out.messages).slice(0, -1)) {
      expect(output).toEqual(TRIMMED_OUTPUT);
    }
  });
});

describe("with the real SDK", () => {
  const stale = [
    user("please send it to Majid"),
    assistant(handOff("approval-requested", { approval: { id: "ap_1" } })),
    user("actually, what does the workshop cost?"),
  ];

  it("keeps a stale approval visible to the model, where the SDK alone would throw or drop it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // The SDK's own rule: converted strictly, the unanswered call has no result and streamText refuses the prompt.
    const strict = await convertToModelMessages(stale as never, { tools: chatTools });
    expect(danglingCalls(strict)).toEqual(["call_1"]);
    const refused = await run(strict);
    expect(refused.errors.length).toBeGreaterThan(0);
    expect(String((refused.errors[0] as { name?: string })?.name ?? refused.errors[0])).toMatch(/MissingToolResults/);

    // The route's setting no longer throws: since ai 6.0.282, `ignoreIncompleteToolCalls` drops the
    // unresolved approval (and with it the whole assistant turn), so the model never learns the
    // visitor was offered the hand-off and may offer it again.
    const dropped = await convertToModelMessages(stale as never, { tools: chatTools, ignoreIncompleteToolCalls: true });
    expect(dropped.every((m) => m.role === "user")).toBe(true);
    expect((await run(dropped)).errors).toEqual([]);

    // Sanitized, the call survives with the stale denial as its result, and the turn still runs.
    const model = await sanitized(stale);
    expect(danglingCalls(model)).toEqual([]);
    const toolParts = model.flatMap((m) => (m.role === "tool" ? m.content : []));
    expect(toolParts).toHaveLength(2);
    expect(toolParts).toContainEqual(
      expect.objectContaining({ type: "tool-approval-response", approvalId: "ap_1", approved: false, reason: STALE_APPROVAL_REASON }),
    );
    expect(toolParts).toContainEqual(
      expect.objectContaining({
        type: "tool-result",
        toolCallId: "call_1",
        output: { type: "error-text", value: STALE_APPROVAL_REASON },
      }),
    );
    const after = await run(model);
    expect(after.errors).toEqual([]);
    expect(after.text).toBe("Understood.");
  });

  it("converts every historical tool state without throwing, with a result for each call", async () => {
    const transcript: Loose[] = [
      user("we build RAG apps"),
      assistant(
        { type: "tool-recommendWorkshop", toolCallId: "r1", state: "output-available", input: { need: "RAG" }, output: { title: "Building RAG Agents with LLMs", hostedByNexus: true, why: "fits" } },
        { type: "tool-assessReadiness", toolCallId: "a1", state: "output-error", input: {}, errorText: "boom" },
        { type: "tool-draftConsultingBrief", toolCallId: "b1", state: "input-available", input: {} },
        { type: "text", text: "Here is a pick." },
      ),
      user("send it"),
      assistant(handOff("approval-requested", { approval: { id: "ap_1" } })),
      user("no wait"),
      assistant(handOff("approval-responded", { toolCallId: "call_2", approval: { id: "ap_2", approved: true } })),
      user("hm"),
      assistant(handOff("approval-responded", { toolCallId: "call_3", approval: { id: "ap_3", approved: false } })),
      user("ok"),
      assistant(handOff("output-denied", { toolCallId: "call_4", approval: { id: "ap_4", approved: false } })),
      user("fine"),
      assistant(
        { type: "tool-emailBriefToVisitor", toolCallId: "e1", state: "output-available", input: { name: "Ada", email: "ada@acme.com" }, output: {} },
        handOff("output-available", { toolCallId: "call_5", output: { ...HANDOFF, briefAttached: false, delivered: false, reason: "not-configured" } }),
      ),
      user("so what now?"),
    ];
    const model = await sanitized(transcript);
    expect(danglingCalls(model)).toEqual([]);
    const results = model.flatMap((m) => (m.role === "tool" ? m.content : []));
    const texts = results.map((r) => (r.type === "tool-result" && r.output.type === "text" ? r.output.value : ""));
    expect(texts.some((t) => /NOT emailed but noted/.test(t))).toBe(true);
    expect(texts.some((t) => /Recommended: Building RAG Agents/.test(t))).toBe(true);
    expect(texts.some((t) => /Brief NOT sent/.test(t))).toBe(true); // crafted `output: {}`
    const denied = results.filter((r) => r.type === "tool-result" && r.output.type === "error-text");
    expect(denied.some((r) => r.type === "tool-result" && r.output.type === "error-text" && r.output.value === STALE_APPROVAL_REASON)).toBe(true);
    const outcome = await run(model);
    expect(outcome.errors).toEqual([]);
    expect(outcome.text).toBe("Understood.");
  });

  it("still executes an approval answered in the final message (the real approval round trip)", async () => {
    const approved = [
      user("please send it to Majid"),
      assistant(handOff("approval-responded", { approval: { id: "ap_1", approved: true } })),
    ];
    const outcome = await run(await sanitized(approved));
    expect(outcome.errors).toEqual([]);
    expect(outcome.toolResults).toHaveLength(1);
    expect(outcome.toolResults[0]).toMatchObject({ delivered: false, reason: "not-configured", email: "ada@acme.com" });
    expect(outcome.text).toBe("Understood.");
  });
});

describe("settleOnce", () => {
  it("runs the settlement exactly once, whichever callback fires first", async () => {
    const seen: string[] = [];
    const settle = settleOnce(async (outcome: string) => {
      seen.push(outcome);
    });
    await settle("aborted");
    await settle("finished");
    await settle("finished");
    expect(seen).toEqual(["aborted"]);
  });
});
