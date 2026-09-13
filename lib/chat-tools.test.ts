import type { ModelMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BRIEF_TOOL_NAME } from "@/lib/brief-schema";
import { SAMPLE_BRIEF } from "@/lib/brief-schema.test";
import { APPROVAL_TOOLS, chatTools, isFailureReason, notSentHint, toolContext } from "@/lib/chat-tools";
import { PER_IP_EMAILS_PER_DAY, PER_IP_HANDOFFS_PER_DAY } from "@/lib/chat-limits";
import { getRateLimiter } from "@/lib/rate-limit";

type AnyTool = {
  inputSchema: unknown;
  needsApproval?: unknown;
  execute?: (input: unknown, options: unknown) => unknown;
  toModelOutput?: (o: { toolCallId: string; input: unknown; output: unknown }) => unknown;
};

const tools = chatTools as unknown as Record<string, AnyTool>;

function keysDeep(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysDeep(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysDeep(v, out);
    }
  }
  return out;
}

const options = (messages: ModelMessage[] = []) => ({
  toolCallId: "call_1",
  messages,
  experimental_context: { ip: "203.0.113.9" },
});

const briefMessage: ModelMessage = {
  role: "assistant",
  content: [{ type: "tool-call", toolCallId: "brief_1", toolName: BRIEF_TOOL_NAME, input: SAMPLE_BRIEF }],
};

const saved: Record<string, string | undefined> = {};
const KEYS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"];

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

describe("tool schemas", () => {
  it("contain no format or pattern keywords on any tool", () => {
    for (const [name, t] of Object.entries(tools)) {
      const json = z.toJSONSchema(t.inputSchema as z.ZodType, { target: "draft-7", io: "input" });
      const keys = keysDeep(json);
      expect(keys.has("format"), `${name} has format`).toBe(false);
      expect(keys.has("pattern"), `${name} has pattern`).toBe(false);
    }
  });

  it("require approval on exactly the three sending tools", () => {
    for (const [name, t] of Object.entries(tools)) {
      const expected = (APPROVAL_TOOLS as readonly string[]).includes(name);
      expect(t.needsApproval === true, name).toBe(expected);
    }
  });
});

describe("toModelOutput", () => {
  it("returns a text result and never throws on a crafted empty or missing output", async () => {
    for (const [name, t] of Object.entries(tools)) {
      expect(t.toModelOutput, name).toBeTypeOf("function");
      for (const output of [{}, undefined, null, { delivered: "yes" }, { alternatives: "x" }]) {
        const res = (await t.toModelOutput!({ toolCallId: "c", input: {}, output })) as {
          type: string;
          value: string;
        };
        expect(res.type, name).toBe("text");
        expect(typeof res.value, name).toBe("string");
        expect(res.value.length, name).toBeGreaterThan(10);
      }
    }
  });

  it("tells the model a hand-off was not sent and why", async () => {
    const res = (await tools.handOffToMajid.toModelOutput!({
      toolCallId: "c",
      input: {},
      output: { delivered: false, reason: "not-configured" },
    })) as { value: string };
    expect(res.value).toMatch(/NOT emailed/);
    expect(res.value).toMatch(/not configured/);
    expect(res.value).toMatch(/do not claim an email went out/);
  });

  it("reserves 'noted' for the not-configured hand-off and never names an email address", () => {
    const noted = notSentHint("handoff", "not-configured");
    expect(noted).toMatch(/noted but not sent/);
    expect(noted).toContain("/contact");
    expect(noted).toMatch(/only records messages/);
    for (const reason of ["invalid-email", "rate-limited", "send-failed", "invalid-input", "bogus", undefined]) {
      expect(notSentHint("handoff", reason), String(reason)).not.toMatch(/noted/i);
      expect(notSentHint("handoff", reason), String(reason)).toMatch(/NOT sent/);
    }
    expect(notSentHint("brief", "not-configured")).toMatch(/stays on screen/);
    expect(notSentHint("brief", "not-configured")).not.toMatch(/noted (for|but)/i);
    expect(notSentHint("brief", "not-configured")).toMatch(/Do not say it was noted/);
    expect(notSentHint("workshop", "not-configured")).toContain("/nvidia-dli-workshops");
    expect(notSentHint("brief", "no-brief")).toMatch(/draftConsultingBrief/);
    for (const kind of ["handoff", "brief", "workshop"] as const) {
      for (const reason of ["not-configured", "rate-limited", "send-failed", "invalid-email", "x"]) {
        expect(notSentHint(kind, reason), `${kind}/${reason}`).not.toMatch(/@/);
      }
    }
    expect(isFailureReason("invalid-input")).toBe(true);
    expect(isFailureReason("toString")).toBe(false);
  });

  it("a crafted delivered: true only changes wording, never sends", async () => {
    const res = (await tools.emailBriefToVisitor.toModelOutput!({
      toolCallId: "c",
      input: {},
      output: { delivered: true },
    })) as { value: string };
    expect(res.value).toMatch(/emailed/);
  });
});

describe("toolContext", () => {
  it("reads the ip from experimental_context and defaults to unknown", () => {
    expect(toolContext({ experimental_context: { ip: "1.1.1.1" } })).toEqual({ ip: "1.1.1.1" });
    expect(toolContext({ experimental_context: undefined })).toEqual({ ip: "unknown" });
    expect(toolContext({ experimental_context: { ip: 42 } })).toEqual({ ip: "unknown" });
  });
});

describe("handOffToMajid.execute", () => {
  it("refuses an invalid address without touching email", async () => {
    const out = (await tools.handOffToMajid.execute!(
      { name: "Ada", email: "not-an-email", topic: "RAG over SOPs" },
      options(),
    )) as { delivered: boolean; reason?: string; briefAttached: boolean };
    expect(out.delivered).toBe(false);
    expect(out.reason).toBe("invalid-email");
    expect(out.briefAttached).toBe(false);
  });

  it("reports not-configured (noted, not sent) when Resend is unset, with the brief attached", async () => {
    const out = (await tools.handOffToMajid.execute!(
      { name: "Ada", email: "ada@acme.com", topic: "RAG over SOPs", briefToolCallId: "brief_1" },
      options([briefMessage]),
    )) as { delivered: boolean; reason?: string; briefAttached: boolean; email: string };
    expect(out.delivered).toBe(false);
    expect(out.reason).toBe("not-configured");
    expect(out.briefAttached).toBe(true);
    expect(out.email).toBe("ada@acme.com");
    // The hand-off is logged once; no visitor confirmation goes out for this source.
    const logs = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      (c) => String(c[0]).startsWith("[email]"),
    );
    expect(logs).toHaveLength(1);
    const preview = logs[0][1] as { to: string; preview: string };
    expect(preview.to).toBe("memari.majid@hotmail.com");
    expect(preview.preview).toContain("RAG over SOPs");
  });

  it("goes out without a brief when none was drafted", async () => {
    const out = (await tools.handOffToMajid.execute!(
      { name: "Ada", email: "ada@acme.com", topic: "Agents" },
      options(),
    )) as { briefAttached: boolean };
    expect(out.briefAttached).toBe(false);
  });

  it("never spends the hand-off allowance while Resend is unset", async () => {
    const ip = "198.51.100.7";
    const opts = { ...options(), experimental_context: { ip } };
    for (let i = 0; i < PER_IP_HANDOFFS_PER_DAY + 2; i++) {
      const out = (await tools.handOffToMajid.execute!(
        { name: "Ada", email: "ada@acme.com", topic: `Try ${i}` },
        opts,
      )) as { delivered: boolean; reason?: string };
      expect(out.delivered).toBe(false);
      expect(out.reason, `attempt ${i}`).toBe("not-configured");
    }
    // The counter for that IP was never touched: the first real reservation still fits.
    expect(await getRateLimiter().reserveEmail(ip, "handoff")).toBe(true);
  });

  it("re-validates an approved input echoed from the transcript", async () => {
    const out = (await tools.handOffToMajid.execute!(
      { name: "Ada", email: "ada@acme.com", topic: "x".repeat(5_000) },
      options(),
    )) as { delivered: boolean; reason?: string; topic: string };
    expect(out).toMatchObject({ delivered: false, reason: "invalid-input" });
    expect(out.topic.length).toBeLessThanOrEqual(300);
    const logs = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      (c) => String(c[0]).startsWith("[email]"),
    );
    expect(logs).toHaveLength(0);
    const crafted = (await tools.handOffToMajid.execute!(null, options())) as { reason?: string };
    expect(crafted.reason).toBe("invalid-input");
  });
});

describe("emailBriefToVisitor.execute and emailWorkshopInfo.execute", () => {
  it("refuses to email a brief that was never drafted", async () => {
    const out = (await tools.emailBriefToVisitor.execute!(
      { name: "Ada", email: "ada@acme.com" },
      options(),
    )) as { delivered: boolean; reason?: string };
    expect(out).toMatchObject({ delivered: false, reason: "no-brief" });
  });

  it("sends the fixed brief template to the visitor with Majid copied (logged when unconfigured)", async () => {
    const out = (await tools.emailBriefToVisitor.execute!(
      { name: "Ada <script>", email: "ada@acme.com" },
      options([briefMessage]),
    )) as { delivered: boolean; reason?: string; name: string };
    expect(out).toMatchObject({ delivered: false, reason: "not-configured" });
    const logs = (console.info as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      (c) => String(c[0]).startsWith("[email]"),
    );
    const sent = logs[0][1] as { to: string; cc: string[]; preview: string };
    expect(sent.to).toBe("ada@acme.com");
    expect(sent.cc).toEqual(["memari.majid@hotmail.com"]);
    expect(sent.preview.startsWith("You asked for this in a chat with Dr. MJ")).toBe(true);
  });

  it("never spends the visitor email allowance while Resend is unset", async () => {
    const ip = "198.51.100.8";
    const opts = { ...options([briefMessage]), experimental_context: { ip } };
    for (let i = 0; i < PER_IP_EMAILS_PER_DAY + 2; i++) {
      const a = (await tools.emailBriefToVisitor.execute!({ name: "Ada", email: "ada@acme.com" }, opts)) as {
        reason?: string;
      };
      const b = (await tools.emailWorkshopInfo.execute!({ name: "Ada", email: "ada@acme.com" }, opts)) as {
        reason?: string;
      };
      expect(a.reason, `brief ${i}`).toBe("not-configured");
      expect(b.reason, `workshop ${i}`).toBe("not-configured");
    }
    expect(await getRateLimiter().reserveEmail(ip, "visitor")).toBe(true);
  });

  it("re-validates approved inputs on the visitor-addressed tools too", async () => {
    const brief = (await tools.emailBriefToVisitor.execute!(
      { name: "", email: "ada@acme.com" },
      options([briefMessage]),
    )) as { reason?: string };
    expect(brief.reason).toBe("invalid-input");
    const workshop = (await tools.emailWorkshopInfo.execute!(
      { name: "Ada", email: 42 },
      options(),
    )) as { reason?: string; subject: string };
    expect(workshop.reason).toBe("invalid-input");
    expect(workshop.subject).toContain("NVIDIA DLI workshop");
  });

  it("emails the one-pager with the same honesty contract", async () => {
    const out = (await tools.emailWorkshopInfo.execute!(
      { name: "Ada", email: "bad" },
      options(),
    )) as { delivered: boolean; reason?: string };
    expect(out).toMatchObject({ delivered: false, reason: "invalid-email" });
    const ok = (await tools.emailWorkshopInfo.execute!(
      { name: "Ada", email: "ada@acme.com" },
      options(),
    )) as { delivered: boolean; reason?: string; subject: string };
    expect(ok).toMatchObject({ delivered: false, reason: "not-configured" });
    expect(ok.subject).toContain("NVIDIA DLI workshop");
  });
});

describe("pure tools", () => {
  it("draftConsultingBrief returns a small output, not the whole brief", async () => {
    const out = (await tools.draftConsultingBrief.execute!(SAMPLE_BRIEF, options())) as Record<string, unknown>;
    expect(out.ok).toBe(true);
    expect(out.path).toBe("consulting");
    expect(JSON.stringify(out).length).toBeLessThan(200);
  });

  it("assessReadiness returns the clamped snapshot", async () => {
    const out = (await tools.assessReadiness.execute!(
      {
        headline: "h",
        nextStep: "n",
        dimensions: [{ key: "data", score: 2, note: "thin" }],
      },
      options(),
    )) as { overall: number; weakest: { key: string } | null };
    expect(out.overall).toBe(2);
    expect(out.weakest?.key).toBe("data");
  });
});
