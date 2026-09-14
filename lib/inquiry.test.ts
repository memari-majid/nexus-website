import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contactClassifyCostUsd,
  contactClassifyFloorUsd,
  contactClassifyRates,
} from "@/lib/chat-limits";
import { CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES } from "@/lib/chat-limits";
import { resetClassifierBreaker, submitInquiry } from "@/lib/inquiry";
import { inquiryPromptChars } from "@/lib/inquiry-ai";

// The classifier is a model call; stub it so the shared-inbox path runs offline.
const { classify } = vi.hoisted(() => ({ classify: vi.fn() }));
vi.mock("@/lib/inquiry-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/inquiry-ai")>();
  return { ...actual, classifyInquiry: classify };
});

/**
 * The limiter is stubbed so the metering around the classifier can be driven
 * from the test rather than from a real counter store: nothing here reaches
 * Upstash, and no test depends on how many submissions a previous test made.
 */
const { limiter, reservation } = vi.hoisted(() => {
  const reservation = { ipKey: "chat:usd:ip:test", globalKey: "chat:usd:all", estimateMicro: 1 };
  return {
    reservation,
    limiter: {
      backend: "memory",
      checkRequestRate: vi.fn(),
      reserveBudget: vi.fn(),
      settleBudget: vi.fn(),
    },
  };
});
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    getRateLimiter: () => limiter as unknown as import("@/lib/rate-limit").RateLimiter,
  };
});

const CLASSIFY_MODEL = "openai/gpt-4.1-nano";

/** The one `contact.usage` line a metered submission writes. */
function usageLine(log: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const lines = log.mock.calls
    .map((c) => String(c[0]))
    .filter((line) => line.includes('"contact.usage"'));
  expect(lines).toHaveLength(1);
  return JSON.parse(lines[0]) as Record<string, unknown>;
}

type EmailLog = { to: string; subject: string; preview: string };

function emailLogs(info: { mock: { calls: unknown[][] } }): EmailLog[] {
  return info.mock.calls
    .filter((c) => String(c[0]).startsWith("[email]"))
    .map((c) => c[1] as EmailLog);
}

const saved: Record<string, string | undefined> = {};
const KEYS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "WORKSHOP_TO_EMAIL", "CONTACT_TO_EMAIL"];

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  classify.mockReset();
  resetClassifierBreaker();
  // Every metered submission writes one `contact.usage` line; keep it out of
  // the test output. Tests that read it spy on the same instance.
  vi.spyOn(console, "log").mockImplementation(() => {});
  limiter.checkRequestRate.mockReset();
  limiter.reserveBudget.mockReset();
  limiter.settleBudget.mockReset();
  limiter.checkRequestRate.mockResolvedValue({ allowed: true, count: 1 });
  limiter.reserveBudget.mockResolvedValue({
    ok: true,
    reservation,
    fallback: false,
    ipSpentUsd: 0,
    globalSpentUsd: 0,
  });
  limiter.settleBudget.mockResolvedValue(undefined);
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

describe("submitInquiry with source chat-handoff", () => {
  it("files to the founder inbox, skips the classifier and the visitor confirmation, reports delivered", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = await submitInquiry({
      name: "Ada",
      email: "ada@acme.com",
      message: "Wants Majid to follow up about: RAG over SOPs",
      source: "chat-handoff",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.delivered).toBe(false);
    expect(result.dev).toBe(true);
    expect(result.category).toBe("consulting");
    expect(classify).not.toHaveBeenCalled();
    const sends = emailLogs(info);
    expect(sends).toHaveLength(1);
    expect(sends[0].to).toBe("memari.majid@hotmail.com");
    expect(sends[0].subject).toBe("[Nexus consultation] Hand-off from Ada");
    expect(sends[0].preview).toContain("Source: chat-handoff");
  });

  it("still validates the basics", async () => {
    const missing = await submitInquiry({ name: "Ada", message: "x", source: "chat-handoff" });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.status).toBe(400);
    const bad = await submitInquiry({
      name: "Ada",
      email: "nope",
      message: "x",
      source: "chat-handoff",
    });
    expect(bad.ok).toBe(false);
  });
});

describe("submitInquiry with every other source", () => {
  it("classifies, files to the shared contact inbox, and confirms to the visitor", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    classify.mockResolvedValueOnce({ category: "workshop", autoReply: "Thanks, Ada. We will follow up." });
    const result = await submitInquiry({
      name: "Ada",
      email: "ada@acme.com",
      message: "Can you run the agentic AI workshop for my team?",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.category).toBe("workshop");
    expect(result.autoReply).toBe("Thanks, Ada. We will follow up.");
    expect(classify).toHaveBeenCalledTimes(1);
    const sends = emailLogs(info);
    expect(sends).toHaveLength(2);
    expect(sends[0].to).toBe("info@nexusaisolution.net");
    expect(sends[0].subject).toBe("[Nexus AI Website] [workshop] Message from Ada");
    expect(sends[0].preview).toContain("Source: contact-form");
    expect(sends[1].to).toBe("ada@acme.com");
  });

  it("treats the retired chat-workshop source as an ordinary contact message, not a founder hand-off", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    classify.mockResolvedValueOnce({ category: "workshop", autoReply: "Thanks, Ada." });
    const result = await submitInquiry({
      name: "Ada",
      email: "ada@acme.com",
      message: "Scheduling request",
      source: "chat-workshop",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(classify).toHaveBeenCalledTimes(1);
    const sends = emailLogs(info);
    expect(sends).toHaveLength(2);
    expect(sends[0].to).toBe("info@nexusaisolution.net");
    expect(sends[0].subject).toBe("[Nexus AI Website] [workshop] Message from Ada");
    expect(sends[0].subject).not.toMatch(/Nexus workshop/);
    expect(sends[0].preview).toContain("Source: chat-workshop");
  });

  it("falls back to the general category when the classifier throws", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    classify.mockRejectedValueOnce(new Error("gateway down"));
    const result = await submitInquiry({ name: "Ada", email: "ada@acme.com", message: "Hello" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.category).toBe("general");
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("stops calling a classifier that keeps failing, still delivers, and logs the pause as its own outcome", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    classify.mockRejectedValue(new Error("classifier returned no usable object"));
    for (let i = 0; i < CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES; i++) {
      const result = await submitInquiry({ name: "Ada", email: "ada@acme.com", message: `Hello ${i}` });
      expect(result.ok).toBe(true);
    }
    expect(classify).toHaveBeenCalledTimes(CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES);
    // The trip is announced once, naming what to check.
    expect(warn.mock.calls.filter((c) => String(c[0]).includes("classifier paused"))).toHaveLength(1);
    expect(String(warn.mock.calls[0][0])).toContain("CONTACT_CLASSIFY_MODEL");

    // The next post is not paid for: no rate check, no reservation, no model.
    limiter.checkRequestRate.mockClear();
    limiter.reserveBudget.mockClear();
    classify.mockClear();
    log.mockClear();
    const paused = await submitInquiry({ name: "Ada", email: "ada@acme.com", message: "Still here" });
    expect(paused.ok).toBe(true);
    if (!paused.ok) return;
    expect(paused.category).toBe("general");
    expect(classify).not.toHaveBeenCalled();
    expect(limiter.checkRequestRate).not.toHaveBeenCalled();
    expect(limiter.reserveBudget).not.toHaveBeenCalled();
    const line = usageLine(log);
    expect(line.outcome).toBe("paused");
    expect(line.costUsd).toBe(0);

    // A fresh breaker (a fresh instance) tries the model again.
    resetClassifierBreaker();
    classify.mockResolvedValueOnce({ category: "workshop", autoReply: "Thanks, Ada.", inputTokens: 10, outputTokens: 5 });
    const again = await submitInquiry({ name: "Ada", email: "ada@acme.com", message: "Back" });
    expect(again.ok && again.category).toBe("workshop");
  });
});

describe("submitInquiry meters the classifier", () => {
  const name = "Ada";
  const message = "Can you run the agentic AI workshop for my team?";
  const promptChars = inquiryPromptChars({ name, message });
  const rates = contactClassifyRates(CLASSIFY_MODEL);
  const floorUsd = contactClassifyFloorUsd({ model: undefined, rates, promptChars });

  it("settles the real token cost on success and logs one priced usage line", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    classify.mockResolvedValueOnce({
      category: "workshop",
      autoReply: "Thanks, Ada. We will follow up.",
      inputTokens: 600,
      outputTokens: 120,
    });
    const result = await submitInquiry({ name, email: "ada@acme.com", message });
    expect(result.ok).toBe(true);
    expect(limiter.reserveBudget).toHaveBeenCalledTimes(1);
    const expected = contactClassifyCostUsd({
      model: undefined,
      rates,
      inputTokens: 600,
      outputTokens: 120,
    });
    expect(limiter.settleBudget).toHaveBeenCalledTimes(1);
    expect(limiter.settleBudget).toHaveBeenCalledWith(reservation, expected);
    const line = usageLine(log);
    expect(line.site).toBe("nexus");
    expect(line.outcome).toBe("classified");
    expect(line.model).toBe(CLASSIFY_MODEL);
    expect(line.costUsd).toBeCloseTo(expected, 9);
    // The rates come from the same resolver the reservation used, so the line
    // can be rechecked against the gateway bill.
    expect(line.ratesPerM).toEqual([rates?.inputPerM, rates?.outputPerM]);
    // Never the raw IP.
    expect(String(line.ip)).toMatch(/^[0-9a-f]{12}$/);
    expect(String(line.ip)).not.toContain("unknown");
  });

  it("settles the failure floor, not zero, when the classifier throws", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    classify.mockRejectedValueOnce(new Error("gateway down"));
    const result = await submitInquiry({ name, email: "ada@acme.com", message });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.category).toBe("general");
    // A visitor who controls the message can choose to make the call fail, so a
    // failure is charged for the tokens it sent plus the whole output cap.
    // Settling at zero would make the failure path the cheapest call on the site.
    expect(floorUsd).toBeGreaterThan(0);
    expect(limiter.settleBudget).toHaveBeenCalledTimes(1);
    expect(limiter.settleBudget).toHaveBeenCalledWith(reservation, floorUsd);
    const line = usageLine(log);
    expect(line.outcome).toBe("failed");
    expect(line.costUsd).toBeCloseTo(floorUsd, 9);
    expect(line.costUsd).not.toBe(0);
  });

  it("charges the floor, not zero, for a call that reports no usage", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    // A provider that answers without a usage block. Settling that at zero
    // refunds the whole reservation, which would take the form straight back
    // out of the cap it was just put inside.
    classify.mockResolvedValueOnce({ category: "workshop", autoReply: "Thanks, Ada." });
    const result = await submitInquiry({ name, email: "ada@acme.com", message });
    expect(result.ok).toBe(true);
    expect(limiter.settleBudget).toHaveBeenCalledWith(reservation, floorUsd);
    expect(usageLine(log).costUsd).toBeCloseTo(floorUsd, 9);
  });

  it("never calls the model when the visitor is over the per-minute rate, and still delivers", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    limiter.checkRequestRate.mockResolvedValueOnce({ allowed: false, count: 21 });
    const result = await submitInquiry({
      name,
      email: "ada@acme.com",
      message,
      clientIp: "203.0.113.7",
    });
    expect(classify).not.toHaveBeenCalled();
    expect(limiter.reserveBudget).not.toHaveBeenCalled();
    expect(limiter.settleBudget).not.toHaveBeenCalled();
    // The email is the product and it costs no model money, so the cap lands on
    // the classifier and the message still reaches the inbox with the fixed
    // acknowledgment. Refusing here would drop a real inquiry, and telling the
    // visitor to retry would send a second copy of a message that arrived.
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.category).toBe("general");
    expect(result.autoReply).toContain("Thank you for contacting Nexus AI Solutions");
    const sends = emailLogs(info);
    expect(sends).toHaveLength(2);
    expect(sends[0].to).toBe("info@nexusaisolution.net");
    expect(sends[0].subject).toBe("[Nexus AI Website] [general] Message from Ada");
    expect(usageLine(log).outcome).toBe("rate-limited");
  });

  it("never calls the model when the budget refuses, and still delivers", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    limiter.reserveBudget.mockResolvedValueOnce({
      ok: false,
      reason: "global",
      ipSpentUsd: 0.4,
      globalSpentUsd: 10.2,
    });
    const result = await submitInquiry({ name, email: "ada@acme.com", message });
    expect(classify).not.toHaveBeenCalled();
    expect(limiter.settleBudget).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.category).toBe("general");
    expect(emailLogs(info)).toHaveLength(2);
    const line = usageLine(log);
    expect(line.outcome).toBe("refused");
    expect(line.refusedBy).toBe("global");
    expect(line.costUsd).toBe(0);
  });

  it("bounds the name and message the model sees, and emails the full text", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const longName = "N".repeat(500);
    const longMessage = "M".repeat(9_000);
    classify.mockResolvedValueOnce({
      category: "general",
      autoReply: "Thanks.",
      inputTokens: 10,
      outputTokens: 5,
    });
    await submitInquiry({ name: longName, email: "ada@acme.com", message: longMessage });
    const sent = classify.mock.calls[0][0] as { name: string; message: string };
    expect(sent.name).toHaveLength(120);
    expect(sent.message).toHaveLength(4_000);
    // A long paste cannot turn one submission into an unbounded reservation,
    // but the team still receives every character of it.
    expect(emailLogs(info)[0].preview.length).toBeGreaterThan(0);
    const reserved = limiter.reserveBudget.mock.calls[0][1] as number;
    const bounded = contactClassifyFloorUsd({
      model: undefined,
      rates,
      promptChars: inquiryPromptChars({ name: "N".repeat(120), message: "M".repeat(4_000) }),
    });
    expect(reserved).toBe(bounded);
  });

  it("leaves the chat hand-off unmetered, because it never reaches the model", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await submitInquiry({
      name,
      email: "ada@acme.com",
      message,
      source: "chat-handoff",
    });
    expect(result.ok).toBe(true);
    expect(classify).not.toHaveBeenCalled();
    expect(limiter.checkRequestRate).not.toHaveBeenCalled();
    expect(limiter.reserveBudget).not.toHaveBeenCalled();
    expect(log.mock.calls.filter((c) => String(c[0]).includes("contact.usage"))).toHaveLength(0);
  });
});
