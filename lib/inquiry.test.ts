import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitInquiry } from "@/lib/inquiry";

// The classifier is a model call; stub it so the shared-inbox path runs offline.
const { classify } = vi.hoisted(() => ({ classify: vi.fn() }));
vi.mock("@/lib/inquiry-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/inquiry-ai")>();
  return { ...actual, classifyInquiry: classify };
});

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
});
