import Link from "next/link";
import type { ReactNode } from "react";
import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import {
  TOOL_STEP_COPY,
  isNotSentReason,
  notSentCopy,
  notSentStepLabel,
  wasNoted,
  type NotSentReason,
} from "@/lib/chat-ui";
import { ApprovalCard, type DeliveryPart } from "./ApprovalCard";
import { Card, ToolStep, asRecord, str, type ToolPartContext } from "./primitives";

type DeliveryName =
  | "handOffToMajid"
  | "emailMajidNote"
  | "emailBriefToVisitor"
  | "emailWorkshopInfo";

type Delivery = {
  delivered: boolean;
  briefAttached: boolean;
  /** The tool's reason code when it is one we know; undefined when delivered or crafted. */
  reason: NotSentReason | undefined;
  /** Visitor sentence for a not-sent outcome; empty when delivered. */
  reasonCopy: string;
};

/** `delivered` is trusted only as far as the visitor who echoed it. */
function readDelivery(output: unknown): Delivery {
  const o = asRecord(output);
  const delivered = o.delivered === true;
  return {
    delivered,
    briefAttached: o.briefAttached === true,
    reason: !delivered && isNotSentReason(o.reason) ? o.reason : undefined,
    reasonCopy: delivered ? "" : notSentCopy(o.reason),
  };
}

const linkClass =
  "underline decoration-zinc-400 underline-offset-2 hover:decoration-brand-600 dark:decoration-zinc-600 dark:hover:decoration-brand-400";

/** Links inside the chat open in a new tab so the in-memory transcript survives the click. */
function ChatLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
    </Link>
  );
}

/**
 * Direct email remains available when sending through the website fails.
 */
function ReachFounder() {
  return (
    <>
      {" "}
      You can try the <ChatLink href="/contact">contact form</ChatLink>.
    </>
  );
}

function Outcome({
  name,
  email,
  delivery,
}: {
  name: DeliveryName;
  email: string;
  delivery: Delivery;
}) {
  const title = TOOL_STEP_COPY[name].title;
  const at = email ? ` at ${email}` : "";

  if (name === "handOffToMajid") {
    return delivery.delivered ? (
      <Card title={title} tone="ok">
        <p>
          Sent to {FOUNDER_CHAT_NAME}. He will follow up by email{at}.
        </p>
        {delivery.briefAttached && (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Your consulting brief went with it.
          </p>
        )}
      </Card>
    ) : (
      <Card title={title} tone="warn">
        <p>
          {wasNoted(delivery.reason) ? "Noted, but the email did not go out: " : "Not sent: "}
          {delivery.reasonCopy}
          <ReachFounder />
        </p>
      </Card>
    );
  }

  if (name === "emailMajidNote") {
    return delivery.delivered ? (
      <Card title={title} tone="ok">
        <p>
          Sent to {FOUNDER_CHAT_NAME}, as written, with your address{at ? ` (${email})` : ""} as the
          reply-to.
        </p>
      </Card>
    ) : (
      <Card title={title} tone="warn">
        <p>
          Not sent: {delivery.reasonCopy} The note above stays here in the chat, so you can copy it
          and send it yourself.
          <ReachFounder />
        </p>
      </Card>
    );
  }

  if (name === "emailBriefToVisitor") {
    return delivery.delivered ? (
      <Card title={title} tone="ok">
        <p>Sent{at}, with {FOUNDER_CHAT_NAME} copied.</p>
      </Card>
    ) : (
      <Card title={title} tone="warn">
        <p>
          Not sent: {delivery.reasonCopy}
          {delivery.reason !== "no-brief" &&
            " The brief above stays here in the chat, so you can copy it."}
        </p>
      </Card>
    );
  }

  return delivery.delivered ? (
    <Card title={title} tone="ok">
      <p>
        Sent the NVIDIA workshop details{at}, with {FOUNDER_CHAT_NAME} copied.
      </p>
    </Card>
  ) : (
    <Card title={title} tone="warn">
      <p>
        Not sent: {delivery.reasonCopy} The same details are on the{" "}
        <ChatLink href="/nvidia-dli-workshops">workshop page</ChatLink>.
      </p>
    </Card>
  );
}

function nameOf(part: DeliveryPart): DeliveryName {
  return part.type.slice("tool-".length) as DeliveryName;
}

/**
 * Every state of the three tools that send email: running, awaiting approval,
 * sending, sent or not sent, declined, failed. No hooks (the approval card has
 * its own).
 */
export function DeliveryBlock({ part, tools }: { part: DeliveryPart; tools: ToolPartContext }) {
  const name = nameOf(part);
  const copy = TOOL_STEP_COPY[name];

  switch (part.state) {
    case "input-streaming":
    case "input-available":
      return <ToolStep label={copy.running} state="running" />;
    case "approval-requested":
      return (
        <div className="space-y-2">
          <ToolStep label="Waiting for your approval" state="waiting" />
          <ApprovalCard part={part} briefDrafted={tools.briefDrafted} onApproval={tools.onApproval} />
        </div>
      );
    case "approval-responded": {
      // The SDK re-sends on its own after the click. When nothing is in
      // flight any more, that request failed or was stopped and the answer is
      // still waiting on the server, so offer a retry instead of a pulsing
      // row that never ends. The widget keeps the input locked meanwhile.
      const stuck = !tools.busy;
      if (part.approval.approved) {
        return stuck ? (
          <ToolStep
            label="Approved, but the send did not go through"
            state="failed"
            action={{ label: "Retry", onClick: tools.onRetry }}
          />
        ) : (
          <ToolStep label={copy.sending} state="running" />
        );
      }
      return (
        <ToolStep
          label="Not sent. You said not now."
          state="denied"
          action={stuck ? { label: "Continue", onClick: tools.onRetry } : undefined}
        />
      );
    }
    case "output-denied":
      return <ToolStep label="Not sent. You said not now. Ask again if you change your mind." state="denied" />;
    case "output-error":
      return (
        <ToolStep label="That step failed on our side. Try again, or use the contact form." state="failed" />
      );
    case "output-available": {
      const delivery = readDelivery(part.output);
      // "Noted" belongs to the hand-off alone: that is the one send the
      // server records for the founder. The two visitor-addressed emails read "Not
      // sent" here, matching their card below and what the model is told.
      const stepLabel = delivery.delivered
        ? copy.done
        : name === "handOffToMajid"
          ? notSentStepLabel(delivery.reason)
          : "Not sent";
      return (
        <div className="space-y-2">
          <ToolStep label={stepLabel} state={delivery.delivered ? "done" : "failed"} />
          <Outcome name={name} email={str(asRecord(part.input).email)} delivery={delivery} />
        </div>
      );
    }
    default:
      return null;
  }
}
