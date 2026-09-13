import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitInquiry } from "@/lib/inquiry";

const saved: Record<string, string | undefined> = {};
const KEYS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "WORKSHOP_TO_EMAIL", "CONTACT_TO_EMAIL"];

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
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
    const sends = info.mock.calls.filter((c) => String(c[0]).startsWith("[email]"));
    expect(sends).toHaveLength(1);
    const logged = sends[0][1] as { to: string; subject: string; preview: string };
    expect(logged.to).toBe("memari.majid@hotmail.com");
    expect(logged.subject).toBe("[Nexus consultation] Hand-off from Ada");
    expect(logged.preview).toContain("Source: chat-handoff");
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
