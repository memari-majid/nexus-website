import type { ModelMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { BRIEF_TOOL_NAME } from "@/lib/brief-schema";
import { SAMPLE_BRIEF } from "@/lib/brief-schema.test";
import { APPROVAL_TOOLS, chatTools, isFailureReason, notSentHint, toolContext } from "@/lib/chat-tools";
import { PER_IP_EMAILS_PER_DAY, PER_IP_HANDOFFS_PER_DAY } from "@/lib/chat-limits";
import { getRateLimiter } from "@/lib/rate-limit";

// The Resend client, so a configured send is observable without the network.
const { resendSend } = vi.hoisted(() => ({ resendSend: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

/** Configures email and makes every Resend call succeed. */
function configureEmail() {
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_FROM_EMAIL = "Nexus AI <hello@nexusaisolution.net>";
  resendSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
}

type SendOutput = { delivered: boolean; reason?: string; briefAttached?: boolean; email: string };

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
  resendSend.mockReset();
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

describe("approval-gated sends are idempotent per toolCallId", () => {
  const input = { name: "Ada", email: "ada@acme.com", topic: "RAG over SOPs", briefToolCallId: "brief_1" };

  it("returns the remembered hand-off instead of emailing twice when the approved call is re-sent", async () => {
    configureEmail();
    const opts = { ...options([briefMessage]), toolCallId: "toolu_retry_1", experimental_context: { ip: "198.51.100.20" } };
    const first = (await tools.handOffToMajid.execute!(input, opts)) as SendOutput;
    expect(first).toMatchObject({ delivered: true, briefAttached: true, email: "ada@acme.com" });
    expect(resendSend).toHaveBeenCalledTimes(1);
    // The dropped-connection retry: same id, same input, executed again.
    const again = (await tools.handOffToMajid.execute!(input, opts)) as SendOutput;
    expect(again).toEqual(first);
    expect(resendSend).toHaveBeenCalledTimes(1);
    // A different call id is a genuine new send.
    const other = (await tools.handOffToMajid.execute!(input, { ...opts, toolCallId: "toolu_retry_2" })) as SendOutput;
    expect(other).toMatchObject({ delivered: true });
    expect(resendSend).toHaveBeenCalledTimes(2);
  });

  it("a replay spends none of the day's hand-off allowance", async () => {
    configureEmail();
    const ip = "198.51.100.21";
    const opts = { ...options(), toolCallId: "toolu_retry_3", experimental_context: { ip } };
    expect((await tools.handOffToMajid.execute!(input, opts)) as SendOutput).toMatchObject({ delivered: true });
    for (let i = 0; i < PER_IP_HANDOFFS_PER_DAY + 2; i++) {
      expect((await tools.handOffToMajid.execute!(input, opts)) as SendOutput).toMatchObject({ delivered: true });
    }
    expect(resendSend).toHaveBeenCalledTimes(1);
    // Exactly one hand-off was counted for that IP.
    for (let i = 0; i < PER_IP_HANDOFFS_PER_DAY - 1; i++) {
      expect(await getRateLimiter().reserveEmail(ip, "handoff"), `reservation ${i}`).toBe(true);
    }
    expect(await getRateLimiter().reserveEmail(ip, "handoff")).toBe(false);
  });

  it("remembers only delivered outcomes: a failed send is retried under the same call id", async () => {
    configureEmail();
    vi.spyOn(console, "error").mockImplementation(() => {});
    resendSend.mockResolvedValueOnce({ data: null, error: { name: "application_error", message: "boom" } });
    const opts = { ...options(), toolCallId: "toolu_retry_4", experimental_context: { ip: "198.51.100.22" } };
    const failed = (await tools.handOffToMajid.execute!(input, opts)) as SendOutput;
    expect(failed).toMatchObject({ delivered: false, reason: "send-failed" });
    const retried = (await tools.handOffToMajid.execute!(input, opts)) as SendOutput;
    expect(retried).toMatchObject({ delivered: true });
    expect(resendSend).toHaveBeenCalledTimes(2);
    // Now delivered, so a further re-send replays.
    expect((await tools.handOffToMajid.execute!(input, opts)) as SendOutput).toEqual(retried);
    expect(resendSend).toHaveBeenCalledTimes(2);
  });

  it("does not remember a not-configured attempt, so nothing is replayed once email is connected", async () => {
    const opts = { ...options(), toolCallId: "toolu_retry_5", experimental_context: { ip: "198.51.100.23" } };
    expect((await tools.handOffToMajid.execute!(input, opts)) as SendOutput).toMatchObject({
      delivered: false,
      reason: "not-configured",
    });
    configureEmail();
    expect((await tools.handOffToMajid.execute!(input, opts)) as SendOutput).toMatchObject({ delivered: true });
    expect(resendSend).toHaveBeenCalledTimes(1);
  });

  it("keeps the visitor out of the idempotency store, and still replays the same card", async () => {
    configureEmail();
    const personal = {
      name: "Ada Lovelace",
      email: "ada@acme.com",
      topic: "RAG over SOPs",
      organization: "Acme Analytics",
      role: "Head of Data",
      briefToolCallId: "brief_1",
    };
    const opts = {
      ...options([briefMessage]),
      toolCallId: "toolu_privacy_1",
      experimental_context: { ip: "198.51.100.25" },
    };
    const sent = (await tools.handOffToMajid.execute!(personal, opts)) as SendOutput;
    expect(sent).toMatchObject({ delivered: true, briefAttached: true, email: "ada@acme.com" });

    // Only the outcome, a short label, and the brief flag are kept for a day.
    const stored = await getRateLimiter().recallSent("handOffToMajid", "toolu_privacy_1");
    expect(stored).toEqual({ delivered: true, label: "Hand-off", briefAttached: true });
    expect([...keysDeep(stored)].sort()).toEqual(["briefAttached", "delivered", "label"]);
    const serialized = JSON.stringify(stored).toLowerCase();
    for (const personalValue of ["ada", "lovelace", "@acme.com", "acme analytics", "head of data", "rag over sops"]) {
      expect(serialized, personalValue).not.toContain(personalValue);
    }

    // The replay rebuilds the card from the approved input, so the visitor
    // and the model see exactly what the first send produced.
    const again = (await tools.handOffToMajid.execute!(personal, opts)) as SendOutput;
    expect(again).toEqual(sent);
    expect(resendSend).toHaveBeenCalledTimes(1);
  });

  it("stores no address for the visitor-addressed tools either", async () => {
    configureEmail();
    const to = { name: "Ada Lovelace", email: "ada@acme.com" };
    const ip = "198.51.100.26";
    const briefOpts = { ...options([briefMessage]), toolCallId: "toolu_privacy_2", experimental_context: { ip } };
    expect((await tools.emailBriefToVisitor.execute!(to, briefOpts)) as SendOutput).toMatchObject({ delivered: true });
    expect(await getRateLimiter().recallSent("emailBriefToVisitor", "toolu_privacy_2")).toEqual({
      delivered: true,
      label: "Brief",
    });

    const workshopOpts = { ...options(), toolCallId: "toolu_privacy_3", experimental_context: { ip } };
    expect((await tools.emailWorkshopInfo.execute!(to, workshopOpts)) as SendOutput).toMatchObject({ delivered: true });
    expect(await getRateLimiter().recallSent("emailWorkshopInfo", "toolu_privacy_3")).toEqual({
      delivered: true,
      label: "Workshop details",
    });
  });

  it("replays the visitor-addressed tools too", async () => {
    configureEmail();
    const ip = "198.51.100.24";
    const briefOpts = { ...options([briefMessage]), toolCallId: "toolu_retry_6", experimental_context: { ip } };
    const brief = (await tools.emailBriefToVisitor.execute!({ name: "Ada", email: "ada@acme.com" }, briefOpts)) as SendOutput;
    expect(brief).toMatchObject({ delivered: true, email: "ada@acme.com" });
    expect((await tools.emailBriefToVisitor.execute!({ name: "Ada", email: "ada@acme.com" }, briefOpts)) as SendOutput).toEqual(brief);
    expect(resendSend).toHaveBeenCalledTimes(1);

    const workshopOpts = { ...options(), toolCallId: "toolu_retry_7", experimental_context: { ip } };
    const workshop = (await tools.emailWorkshopInfo.execute!({ name: "Ada", email: "ada@acme.com" }, workshopOpts)) as SendOutput;
    expect(workshop).toMatchObject({ delivered: true, email: "ada@acme.com" });
    expect((await tools.emailWorkshopInfo.execute!({ name: "Ada", email: "ada@acme.com" }, workshopOpts)) as SendOutput).toEqual(workshop);
    expect(resendSend).toHaveBeenCalledTimes(2);

    // Memories are per tool: the brief's id does not replay for the one-pager.
    const crossed = (await tools.emailWorkshopInfo.execute!({ name: "Ada", email: "ada@acme.com" }, { ...workshopOpts, toolCallId: "toolu_retry_6" })) as SendOutput;
    expect(crossed).toMatchObject({ delivered: true });
    expect(resendSend).toHaveBeenCalledTimes(3);
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
