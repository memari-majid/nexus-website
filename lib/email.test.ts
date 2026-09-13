import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMAIL_ORIGIN_NOTE,
  EMAIL_RE,
  cleanSubject,
  escapeHtml,
  founderInbox,
  isEmailConfigured,
  scrubForEmail,
  sendEmail,
} from "@/lib/email";

const saved: Record<string, string | undefined> = {};
const KEYS = ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "WORKSHOP_TO_EMAIL"];

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

describe("scrubForEmail", () => {
  it("strips links, bare domains, addresses, and phone numbers", () => {
    expect(scrubForEmail("see https://evil.example/login now")).toBe("see [link removed] now");
    expect(scrubForEmail("go to www.evil.example/x")).toBe("go to [link removed]");
    expect(scrubForEmail("visit acme.com/reset today")).toBe("visit [link removed] today");
    expect(scrubForEmail("mail ceo@acme.com please")).toBe("mail [address removed] please");
    expect(scrubForEmail("call (801) 810-9152 now")).toBe("call [phone removed] now");
    expect(scrubForEmail("call +1 801 810 9152")).toBe("call [phone removed]");
  });

  it("keeps ordinary numbers and flattens whitespace", () => {
    expect(scrubForEmail("20 seats at $500, 40 per cohort")).toBe("20 seats at $500, 40 per cohort");
    expect(scrubForEmail("line one\r\n\tline two")).toBe("line one line two");
  });

  it("strips short links and domains on any TLD, not just a fixed list", () => {
    expect(scrubForEmail("Grab the plan at bit.ly/nexus-deal today")).toBe(
      "Grab the plan at [link removed] today",
    );
    for (const domain of [
      "example.link",
      "nexus.site",
      "evil.to",
      "amazon.co.uk",
      "shop.online",
      "x.click",
      "sub.evil.io/reset?x=1",
      "evil.com.js",
    ]) {
      expect(scrubForEmail(`see ${domain} now`), domain).toBe("see [link removed] now");
    }
  });

  it("collapses (dot) obfuscations before matching", () => {
    expect(scrubForEmail("see example(dot)com now")).toBe("see [link removed] now");
    expect(scrubForEmail("see example [dot] com now")).toBe("see [link removed] now");
    expect(scrubForEmail("see example dot com now")).toBe("see [link removed] now");
  });

  it("keeps abbreviations, versions, and code suffixes that cannot be links", () => {
    const s = "Migrate the Node.js API (e.g. v2.0) with a Ph.D. lead in St. Louis over 3.5 months.";
    expect(scrubForEmail(s)).toBe(s);
    expect(scrubForEmail("export the report.pdf and app.tsx")).toBe("export the report.pdf and app.tsx");
  });
});

describe("cleanSubject and escapeHtml", () => {
  it("removes header-breaking characters and bounds length", () => {
    expect(cleanSubject("Hi\r\nBcc: x\tthere")).toBe("Hi Bcc: x there");
    expect(cleanSubject("a".repeat(300)).length).toBe(200);
  });

  it("escapes only & < >", () => {
    expect(escapeHtml(`<b>&"'`)).toBe(`&lt;b&gt;&amp;"'`);
  });
});

describe("EMAIL_RE and founderInbox", () => {
  it("does loose address validation", () => {
    expect(EMAIL_RE.test("ada@acme.com")).toBe(true);
    expect(EMAIL_RE.test("not an email")).toBe(false);
    expect(EMAIL_RE.test("a@b")).toBe(false);
  });

  it("defaults to the founder's hotmail and honours WORKSHOP_TO_EMAIL", () => {
    expect(founderInbox()).toBe("memari.majid@hotmail.com");
    process.env.WORKSHOP_TO_EMAIL = "owner@example.com";
    expect(founderInbox()).toBe("owner@example.com");
  });

  it("starts every visitor template with the origin note", () => {
    expect(EMAIL_ORIGIN_NOTE).toMatch(/approved it on screen/);
  });
});

describe("isEmailConfigured and sendEmail", () => {
  it("requires both the API key and a verified From", () => {
    expect(isEmailConfigured()).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    expect(isEmailConfigured()).toBe(false);
    process.env.RESEND_FROM_EMAIL = "Nexus AI <hello@nexusaisolution.net>";
    expect(isEmailConfigured()).toBe(true);
  });

  it("reports delivered: false (not an error) when not configured", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await sendEmail({ to: "ada@acme.com", subject: "Hi\nthere", text: "body" });
    expect(res).toEqual({ ok: true, delivered: false });
    expect(info).toHaveBeenCalledTimes(1);
    const logged = info.mock.calls[0][1] as { subject: string };
    expect(logged.subject).toBe("Hi there");
  });
});

describe("scrubForEmail edge cases from verification", () => {
  it("removes bare IPv4 links and obfuscated dots", () => {
    expect(scrubForEmail("go to 1.2.3.4/login now")).toBe("go to [link removed] now");
    expect(scrubForEmail("see example\uFF0Ecom today")).toBe("see [link removed] today");
    expect(scrubForEmail("see example\u3002com today")).toBe("see [link removed] today");
    expect(scrubForEmail("visit example-dot-com")).toBe("visit [link removed]");
    expect(scrubForEmail("visit exampleDOTcom")).toBe("visit [link removed]");
  });
  it("leaves ordinary words alone", () => {
    expect(scrubForEmail("an anecdote about dotted lines")).toBe("an anecdote about dotted lines");
  });
});
