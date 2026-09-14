"use client";

import { useState } from "react";
import { FOUNDER_CHAT_NAME } from "@/lib/chat-persona";
import {
  APPROVAL_VALUE_CELL,
  APPROVAL_VALUE_CELL_UNBROKEN,
  type ChatToolPartOf,
} from "@/lib/chat-ui";
import { Card, asRecord, str } from "./primitives";

export type DeliveryPart =
  | ChatToolPartOf<"handOffToMajid">
  | ChatToolPartOf<"emailMajidNote">
  | ChatToolPartOf<"emailBriefToVisitor">
  | ChatToolPartOf<"emailWorkshopInfo">;

export type PendingApproval = Extract<DeliveryPart, { state: "approval-requested" }>;

const COPY = {
  "tool-handOffToMajid": {
    heading: `Send this to ${FOUNDER_CHAT_NAME}?`,
    note: `Goes to ${FOUNDER_CHAT_NAME} and the Nexus team as a short summary. Nothing is sent until you approve.`,
  },
  "tool-emailMajidNote": {
    heading: `Email this note to ${FOUNDER_CHAT_NAME}?`,
    note: `Sends this note to ${FOUNDER_CHAT_NAME} and the Nexus team, with your address as the reply-to. Nothing is sent until you approve.`,
  },
  "tool-emailBriefToVisitor": {
    heading: "Email you a copy of the brief?",
    note: "Your brief, sent to the address below with the Nexus team copied. Nothing is sent until you approve.",
  },
  "tool-emailWorkshopInfo": {
    heading: "Email you the NVIDIA workshop details?",
    note: "The workshop details, sent to the address below with the Nexus team copied. Nothing is sent until you approve.",
  },
} as const;

const FIELDS: [key: string, label: string][] = [
  ["name", "Name"],
  ["email", "Email"],
  ["topic", "What you need"],
  ["organization", "Organization"],
  ["role", "Role"],
];

/**
 * Values that are one unbroken run with nowhere to wrap. An email address is
 * the one the card always shows, and at 360 px it is wider than its column,
 * so it gets a hard break rather than pushing the card sideways.
 */
const UNBROKEN_FIELDS = new Set(["email"]);

/**
 * Human-in-the-loop step: shows exactly what the tool will send and waits for
 * the visitor's click. The response is added with `addToolApprovalResponse`
 * and the SDK re-sends automatically; the server executes only approved calls.
 * Own component so the hook never sits under a switch.
 */
export function ApprovalCard({
  part,
  briefDrafted,
  onApproval,
}: {
  part: PendingApproval;
  /** A completed brief exists in the transcript (the widget mirrors the server's `findBrief`). */
  briefDrafted: boolean;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const [choice, setChoice] = useState<"send" | "skip" | null>(null);
  const copy = COPY[part.type];
  const input = asRecord(part.input);
  const rows = FIELDS.map(([key, label]): [string, string, string] => [
    key,
    label,
    str(input[key]),
  ]).filter(([, , v]) => v);
  if (part.type === "tool-handOffToMajid") {
    // State it either way: the page promises the card shows exactly what goes.
    const attached = briefDrafted || str(input.briefToolCallId) !== "";
    rows.push(["attached", "Attached", attached ? "your consulting brief" : "nothing"]);
  }
  if (part.type === "tool-emailMajidNote") {
    // The note itself is the card above this one, and the server re-reads it
    // from the transcript, so the model cannot swap it after the approval.
    rows.push(["sends", "Sends", "the note drafted above, as written"]);
  }

  function respond(approved: boolean) {
    if (choice) return;
    setChoice(approved ? "send" : "skip");
    onApproval(part.approval.id, approved);
  }

  return (
    <Card title="Your approval" tone="ok">
      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{copy.heading}</p>
      {rows.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows.map(([key, label, value]) => (
            <div key={key} className="contents">
              <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd
                className={`${
                  UNBROKEN_FIELDS.has(key) ? APPROVAL_VALUE_CELL_UNBROKEN : APPROVAL_VALUE_CELL
                } text-zinc-800 dark:text-zinc-200`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{copy.note}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => respond(true)}
          disabled={choice !== null}
          className="btn-primary btn-compact text-xs disabled:opacity-50"
        >
          {choice === "send" ? "Sending" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => respond(false)}
          disabled={choice !== null}
          className="btn-secondary btn-compact text-xs disabled:opacity-50"
        >
          {choice === "skip" ? "Skipped" : "Not now"}
        </button>
      </div>
    </Card>
  );
}
