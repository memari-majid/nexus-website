/**
 * One inquiry pipeline for every way a message reaches the team: the contact
 * form (`app/api/contact/route.ts`), the voice assistant
 * (`app/api/voice/message/route.ts`), and the chat hand-off (`lib/chat-tools.ts`).
 *
 * The classification is a model call an anonymous visitor starts, so it passes
 * through the same two gates every other model call on this site does: the
 * per-minute rate limiter and `reserveBudget`, which owns the only global hard
 * cap there is. An unmetered model call behind a public form is a hole in that
 * cap, however cheap the model is. The metering lives here rather than in a
 * route because two routes reach this function and a gate in one of them is
 * not a gate.
 *
 * Both halves of that accounting use one set of rates for the classifier
 * (`CONTACT_CLASSIFY_RATES`, in the environment or in `lib/chat-limits.ts`),
 * and the pessimistic rates are kept for a slug nothing prices. Pricing the two
 * halves differently leaves most of every reservation standing and makes a
 * public form the cheapest way to close the chat for the whole site. Every exit
 * path settles: a classification that fails settles at the floor for the tokens
 * it sent, because a visitor who controls the prompt can choose to make the
 * call fail.
 *
 * Delivery never depends on the model. When the visitor is over the per-minute
 * rate, when the budget is spent, when the limiter store is unreachable, or
 * when the provider fails, the inquiry falls back to the fixed acknowledgment
 * and the message still reaches the inbox: the point of the form is the email,
 * and the classification is a convenience on top of it.
 *
 * Server-only. Never import from a client component.
 */

import { createHash } from "node:crypto";
import {
  CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES,
  CONTACT_CLASSIFY_MESSAGE_CHARS,
  CONTACT_CLASSIFY_NAME_CHARS,
  CONTACT_CLASSIFY_PAUSE_MS,
  UNPRICED_MODEL_RATES,
  contactClassifyCostUsd,
  contactClassifyFloorUsd,
  contactClassifyPrechargeUsd,
  contactClassifyRates,
  contactClassifyResolvedRates,
  createFailureBreaker,
  parseClassifyRates,
} from "@/lib/chat-limits";
import { findModel } from "@/lib/chat-models";
import {
  classifyInquiry,
  fallbackInquiryResponse,
  inquiryPromptChars,
  type InquiryCategory,
} from "@/lib/inquiry-ai";
import {
  EMAIL_RE,
  cleanSubject,
  escapeHtml,
  founderInbox,
  renderEmail,
  sendEmail,
} from "@/lib/email";
import { getRateLimiter } from "@/lib/rate-limit";

/**
 * Why this default, measured 2026-09-13: `openai/gpt-oss-20b` (the value
 * `.env.local` pins) returned no schema-valid object on 99 of 99 submissions,
 * and `anthropic/claude-haiku-4-5`, the default before this, is not a slug the
 * gateway serves at all (its Haiku is `anthropic/claude-haiku-4.5`, checked
 * against the gateway's model list). `openai/gpt-4.1-nano` answered first time
 * through `parseInquiryClassification` at $0.1/$0.4 per 1M. Same default as
 * the personal site.
 */
const CLASSIFY_MODEL = process.env.CONTACT_CLASSIFY_MODEL ?? "openai/gpt-4.1-nano";

/**
 * What that model costs, in USD per 1M tokens, `"input,output"`.
 *
 * The default classifier is not on the chat allowlist, so nothing published
 * prices it. Without a figure here the settle would correct the real
 * token counts at `UNPRICED_MODEL_RATES`, which are Opus rates and five times
 * too high for this model, and every anonymous form post would leave most of
 * its reservation standing against the daily caps.
 *
 * The reservation, the failure floor and the settle all read this, so one post
 * cannot be reserved at one price and settled at another. Env first so a price
 * change is an env edit, then the table in `lib/chat-limits.ts`, then nothing,
 * which prices the call pessimistically and warns.
 *
 * An explicit price here wins over the allowlist price even when the slug is
 * the chat model, because that is what setting the variable means.
 */
const CLASSIFY_RATES =
  parseClassifyRates(process.env.CONTACT_CLASSIFY_RATES) ?? contactClassifyRates(CLASSIFY_MODEL);

if (!findModel(CLASSIFY_MODEL) && !CLASSIFY_RATES) {
  console.warn(
    `[inquiry] No rates known for CONTACT_CLASSIFY_MODEL="${CLASSIFY_MODEL}". Classifications will be reserved and settled at $${UNPRICED_MODEL_RATES.inputPerM}/$${UNPRICED_MODEL_RATES.outputPerM} per 1M, which over-states a small model badly. Set CONTACT_CLASSIFY_RATES="input,output" or add the slug to CONTACT_CLASSIFY_RATES in lib/chat-limits.ts.`,
  );
}

/**
 * Stops paying for a classifier that cannot succeed. After
 * `CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES` failed calls in a row on this
 * instance the model is skipped for `CONTACT_CLASSIFY_PAUSE_MS`; the form
 * still delivers with the fixed acknowledgment and the pause is logged as its
 * own outcome. One success resets it.
 */
let breaker = createFailureBreaker({});

/** Test hook: a fresh breaker, so one test's failures never pause the next. */
export function resetClassifierBreaker(): void {
  breaker = createFailureBreaker({});
}

/** Logs never carry a raw visitor IP. Same shape as the chat route. */
function ipHash(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 12);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export type InquiryInput = {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  source?: string;
  /**
   * The caller's IP, derived by `clientIp` in `lib/chat-request.ts` so one
   * visitor buckets the same here as in chat. Absent (the chat hand-off, which
   * never reaches the classifier) it is the shared "unknown" bucket.
   */
  clientIp?: string;
};

export type InquirySuccess = {
  ok: true;
  /** True when email is not configured and the inquiry was only logged. */
  dev: boolean;
  /** True when Resend accepted the notification to the team. */
  delivered: boolean;
  category: InquiryCategory;
  autoReply: string;
};

export type InquiryFailure = {
  ok: false;
  error: string;
  status: number;
};

/**
 * How one classification ended, for the `contact.usage` line. `unmeasured`
 * is its own outcome rather than folded into `classified`: a run of them is a
 * provider that stopped reporting usage, not a cheap day, and since both settle
 * at the same floor the cost alone cannot tell them apart. `paused` is the
 * breaker above: the model was not called and nothing was spent, and a run of
 * those lines is a misconfigured `CONTACT_CLASSIFY_MODEL`, not a quiet day.
 * The personal site logs the same six.
 */
type ClassifyOutcome = "classified" | "unmeasured" | "failed" | "refused" | "rate-limited" | "paused";

/**
 * Runs the classifier inside the site's rate limiter and budget, and logs one
 * `contact.usage` line whatever happens.
 *
 * Never throws and never refuses the inquiry: it returns the classification
 * when there is one and the fixed fallback when there is not. The caller
 * delivers either way.
 */
async function classifyMetered(args: {
  name: string;
  message: string;
  ip: string;
}): Promise<{ category: InquiryCategory; autoReply: string }> {
  const fallback = fallbackInquiryResponse();
  let category: InquiryCategory = fallback.category;
  let autoReply = fallback.autoReply;

  // Only the classifier's view of the message is bounded. The emails below
  // carry the visitor's full text.
  const forModel = {
    name: args.name.slice(0, CONTACT_CLASSIFY_NAME_CHARS),
    message: args.message.slice(0, CONTACT_CLASSIFY_MESSAGE_CHARS),
  };
  const classifyModel = findModel(CLASSIFY_MODEL);
  const classifyRates = contactClassifyResolvedRates({
    model: classifyModel,
    rates: CLASSIFY_RATES,
  });
  const promptChars = inquiryPromptChars(forModel);
  const estimateUsd = contactClassifyPrechargeUsd({
    model: classifyModel,
    rates: CLASSIFY_RATES,
    promptChars,
  });

  const limiter = getRateLimiter();
  let billedUsd = 0;
  let outcome: ClassifyOutcome = "rate-limited";
  let refusedBy: "ip" | "global" | undefined;

  // Paused: the last few calls on this instance all failed, so this one is
  // not made. No rate check and no reservation either, since nothing runs.
  const paused = breaker.paused();
  const rate = paused ? { allowed: false } : await limiter.checkRequestRate(args.ip);
  if (paused) {
    outcome = "paused";
  } else if (rate.allowed) {
    const budget = await limiter.reserveBudget(args.ip, estimateUsd);
    if (!budget.ok) {
      outcome = "refused";
      refusedBy = budget.reason;
    } else {
      try {
        const classified = await classifyInquiry({ ...forModel, modelId: CLASSIFY_MODEL });
        breaker.record(true);
        category = classified.category;
        autoReply = classified.autoReply;
        const measured = contactClassifyCostUsd({
          model: classifyModel,
          rates: CLASSIFY_RATES,
          inputTokens: classified.inputTokens,
          outputTokens: classified.outputTokens,
        });
        // A call that reports no usage is not a free call. `settleBudget` reads
        // a zero as "spend nothing" and hands the whole reservation back, so a
        // provider that answers without a usage block, or with an unparsable
        // one, would make every classification free and take the form back out
        // of the cap it was just put inside. An unmeasured call is charged the
        // same floor a failed one is. Same rule the chat route states as "a
        // step that reports no usage stays charged at this estimate".
        const wasMeasured = Number.isFinite(measured) && measured > 0;
        billedUsd = wasMeasured
          ? measured
          : contactClassifyFloorUsd({
              model: classifyModel,
              rates: CLASSIFY_RATES,
              promptChars,
            });
        outcome = wasMeasured ? "classified" : "unmeasured";
        await limiter.settleBudget(budget.reservation, billedUsd);
      } catch (err) {
        console.error("[inquiry] classifyInquiry:", err);
        outcome = "failed";
        breaker.record(false);
        if (breaker.paused()) {
          console.warn(
            `[inquiry] classifier paused for ${Math.round(CONTACT_CLASSIFY_PAUSE_MS / 60_000)} minutes after ${CONTACT_CLASSIFY_MAX_CONSECUTIVE_FAILURES} consecutive failures on "${CLASSIFY_MODEL}". The form still delivers with the fixed acknowledgment. Check CONTACT_CLASSIFY_MODEL: a model that never returns a usable object is paid for on every post.`,
          );
        }
        // The prompt may already have reached the gateway, so a failure is
        // charged, not refunded: every input token it sent plus the whole
        // output cap, at the same rates a success settles at. Settling at zero
        // here would make a message the visitor can shape into a failure the
        // cheapest call on the site; leaving the reservation untouched would
        // make it the most expensive one.
        billedUsd = contactClassifyFloorUsd({
          model: classifyModel,
          rates: CLASSIFY_RATES,
          promptChars,
        });
        await limiter.settleBudget(budget.reservation, billedUsd);
      }
    }
  }

  console.log(
    JSON.stringify({
      event: "contact.usage",
      site: "nexus",
      outcome,
      ip: ipHash(args.ip),
      model: CLASSIFY_MODEL,
      estimateUsd,
      // The rates this post was priced at, from the same resolver the
      // reservation and the settle used, so a line in the logs can be
      // rechecked against the gateway bill instead of being taken on faith.
      ratesPerM: [classifyRates.inputPerM, classifyRates.outputPerM],
      costUsd: round6(billedUsd),
      category,
      limiter: limiter.backend,
      ...(refusedBy ? { refusedBy } : {}),
    }),
  );

  return { category, autoReply };
}

export async function submitInquiry(input: InquiryInput): Promise<InquirySuccess | InquiryFailure> {
  const source = input.source?.trim() || "contact-form";
  const isVoice = source === "voice-assistant";
  const isHandoff = source === "chat-handoff";
  const name = input.name.trim() || (isVoice ? "Phone caller" : "");
  const email = input.email?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const message = input.message.trim();
  const ip = input.clientIp?.trim() || "unknown";

  if (!message) {
    return { ok: false, error: "Message is required.", status: 400 };
  }
  if (!isVoice && (!name || !email)) {
    return { ok: false, error: "Name, email, and message are required.", status: 400 };
  }
  if (isVoice && !phone && !email) {
    return { ok: false, error: "A callback number or email is required for phone messages.", status: 400 };
  }
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, error: "Invalid email address.", status: 400 };
  }

  let category: InquiryCategory = isHandoff ? "consulting" : "general";
  let autoReply = fallbackInquiryResponse().autoReply;

  // The chat hand-off is already structured by the assistant and never sends a
  // visitor confirmation, so it skips the classifier call entirely. Everything
  // else pays for its classification through `classifyMetered`, which returns
  // the fixed fallback rather than throwing or refusing.
  //
  // Why a rate-limited or budget-refused visitor still gets delivery, where the
  // chat route answers 429 and stops: the email is the product here and it
  // costs no model money, so refusing it would drop a real inquiry to protect a
  // convenience. The cap belongs on the model call, and that is exactly where
  // it is: a refused submission skips the classifier, spends nothing, is logged
  // with its outcome, and reaches the inbox with the fixed acknowledgment. The
  // visitor is never told to try again, because a retry would send a second
  // copy of a message that already arrived.
  if (!isHandoff) {
    const classified = await classifyMetered({ name, message, ip });
    category = classified.category;
    autoReply = classified.autoReply;
  }

  // The consultation hand-off is the one source that goes to the founder's
  // inbox; everything else goes to the shared contact inbox.
  const to = isHandoff ? founderInbox() : process.env.CONTACT_TO_EMAIL?.trim() || founderInbox();
  const subject = cleanSubject(
    isVoice
      ? `[Nexus voice] Message for Majid from ${name}${phone ? ` (${phone})` : ""}`
      : isHandoff
        ? `[Nexus consultation] Hand-off from ${name}`
        : `[Nexus AI Website] [${category}] Message from ${name}`,
  );
  const identity = [name, email && `<${email}>`, phone && `phone ${phone}`]
    .filter(Boolean)
    .join(" ");

  // 1) Notify the team. This send is load-bearing: a failure fails the inquiry.
  const team = await sendEmail({
    to,
    subject,
    ...(email ? { replyTo: email } : {}),
    text: `From: ${identity}\nSource: ${source}\nAI category: ${category}\n\n${message}`,
  });
  if (!team.ok) {
    return { ok: false, error: "Failed to send message. Please try again later.", status: 502 };
  }

  // 2) Confirm to the visitor. Best-effort: a failure here never fails the
  //    inquiry. Skipped for the chat hand-off, whose body would carry
  //    model-generated text to a visitor-supplied address.
  if (email && !isHandoff) {
    const confirm = await sendEmail({
      to: email,
      subject: "We got your message, Nexus AI Solutions",

      text: `${autoReply}\n\nFor anything else, send us a note at https://nexusaisolution.net/contact.\n\nNexus AI Solutions`,
      html: renderEmail({
        heading: "We've got your request",
        bodyHtml: `<p>${escapeHtml(autoReply)}</p><p style="margin-top:14px;">For anything else, send us a note at https://nexusaisolution.net/contact.</p>`,
      }),
    });
    if (!confirm.ok) {
      console.error("[inquiry] visitor confirmation email failed (non-fatal)");
    }
  }

  return { ok: true, dev: !team.delivered, delivered: team.delivered, category, autoReply };
}
