import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPROVAL_SECRET_ENV,
  MAX_SIGNATURE_CHARS,
  approvalSecret,
  canonicalJson,
  signApproval,
  signDraft,
  verifyApproval,
  verifyDraft,
} from "@/lib/approval-signature";

const base = {
  secret: "test-secret",
  approvalId: "ap_1",
  toolCallId: "call_1",
  toolName: "handOffToMajid",
  input: { name: "Ada", email: "ada@acme.com", topic: "RAG over SOPs" },
};

describe("canonicalJson", () => {
  it("sorts keys at every depth and leaves arrays in order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}',
    );
    expect(canonicalJson("x")).toBe('"x"');
    expect(canonicalJson(null)).toBe("null");
  });
});

describe("signApproval / verifyApproval", () => {
  it("verifies its own signature and nothing else", () => {
    const signature = signApproval(base);
    expect(verifyApproval({ ...base, signature })).toBe(true);
    expect(verifyApproval({ ...base, signature, secret: "other" })).toBe(false);
    expect(verifyApproval({ ...base, signature, approvalId: "ap_2" })).toBe(false);
    expect(verifyApproval({ ...base, signature, toolCallId: "call_2" })).toBe(false);
    expect(verifyApproval({ ...base, signature, toolName: "emailMajidNote" })).toBe(false);
    expect(verifyApproval({ ...base, signature, input: { ...base.input, email: "attacker@example.com" } })).toBe(false);
  });

  it("is indifferent to key order in the input, because the client re-serialises it", () => {
    const signature = signApproval(base);
    const reordered = { topic: base.input.topic, email: base.input.email, name: base.input.name };
    expect(verifyApproval({ ...base, signature, input: reordered })).toBe(true);
  });

  it("refuses a missing, empty, non-string or oversized signature without throwing", () => {
    for (const signature of [undefined, null, "", 42, {}, "x".repeat(MAX_SIGNATURE_CHARS + 1)]) {
      expect(verifyApproval({ ...base, signature }), String(signature)).toBe(false);
    }
    expect(verifyApproval({ ...base, signature: "not-base64url-at-all" })).toBe(false);
  });
});

describe("signDraft / verifyDraft", () => {
  it("binds a draft to its call id, tool and input, and never doubles as an approval", () => {
    const draft = { secret: "test-secret", toolCallId: "brief_1", toolName: "draftConsultingBrief", input: { goal: "x" } };
    const signature = signDraft(draft);
    expect(verifyDraft({ ...draft, signature })).toBe(true);
    expect(verifyDraft({ ...draft, signature, toolCallId: "brief_2" })).toBe(false);
    expect(verifyDraft({ ...draft, signature, input: { goal: "y" } })).toBe(false);
    expect(verifyDraft({ ...draft, signature: undefined })).toBe(false);
    // A separate key, so no approval id a client can choose replays a draft signature as an approval.
    for (const approvalId of ["draft", "", "draft\n", `draft\n${draft.toolCallId}`]) {
      expect(verifyApproval({ ...draft, approvalId, signature }), JSON.stringify(approvalId)).toBe(false);
    }
  });
});

describe("approvalSecret", () => {
  const KEYS = [APPROVAL_SECRET_ENV, "RESEND_API_KEY"];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.restoreAllMocks();
  });

  it("prefers the configured secret, then a key derived from the Resend key, then a process key", () => {
    process.env[APPROVAL_SECRET_ENV] = " configured ";
    process.env.RESEND_API_KEY = "re_live";
    expect(approvalSecret()).toBe("configured");

    delete process.env[APPROVAL_SECRET_ENV];
    const derived = approvalSecret();
    expect(derived).toHaveLength(64);
    expect(derived).not.toContain("re_live");
    expect(approvalSecret()).toBe(derived);

    delete process.env.RESEND_API_KEY;
    const random = approvalSecret();
    expect(random).toHaveLength(64);
    expect(random).not.toBe(derived);
    // Stable for the life of the process, so an approval issued a moment ago still verifies here.
    expect(approvalSecret()).toBe(random);
  });
});
