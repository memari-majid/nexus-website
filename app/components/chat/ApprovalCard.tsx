"use client";

import { useState } from "react";
import type { ChatToolPartOf } from "@/lib/chat-ui";
import { Card, asRecord, str } from "./primitives";

export type DeliveryPart =
  | ChatToolPartOf<"handOffToMajid">
  | ChatToolPartOf<"emailBriefToVisitor">
  | ChatToolPartOf<"emailWorkshopInfo">;

export type PendingApproval = Extract<DeliveryPart, { state: "approval-requested" }>;

const COPY = {
  "tool-handOffToMajid": {
    heading: "Send this to Majid?",
    note: "Goes to Majid's inbox as a short summary. Nothing is sent until you approve.",
  },
  "tool-emailBriefToVisitor": {
    heading: "Email you a copy of the brief?",
    note: "A fixed template with your brief, sent to the address below with Majid copied. Nothing is sent until you approve.",
  },
  "tool-emailWorkshopInfo": {
    heading: "Email you the NVIDIA workshop details?",
    note: "The workshop one-pager, sent to the address below with Majid copied. Nothing is sent until you approve.",
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
  const rows = FIELDS.map(([key, label]): [string, string] => [label, str(input[key])]).filter(
    ([, v]) => v,
  );
  if (part.type === "tool-handOffToMajid") {
    // State it either way: the page promises the card shows exactly what goes.
    const attached = briefDrafted || str(input.briefToolCallId) !== "";
    rows.push(["Attached", attached ? "your consulting brief" : "nothing"]);
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
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd className="break-words text-zinc-800 dark:text-zinc-200">{value}</dd>
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
