"use client";

import { useState } from "react";
import { effortLabel, pathLabel } from "@/lib/brief-prompt";
import { TOOL_STEP_COPY, type ChatToolPartOf, type PartialBrief } from "@/lib/chat-ui";
import { Card, CardList, CardSection, ToolStep, asRecord, str, strs } from "./primitives";

type Opportunity = { title: string; why: string; effort: string };
type Risk = { title: string; mitigation: string };

type DisplayBrief = {
  organization: string;
  goal: string;
  currentState: string;
  opportunities: Opportunity[];
  risks: Risk[];
  keepWithPeople: string[];
  pathLabel: string;
  pathReason: string;
  firstStep: string;
  openQuestions: string[];
};

function opportunities(v: unknown): Opportunity[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      const o = asRecord(item);
      return { title: str(o.title), why: str(o.why), effort: str(o.effort) };
    })
    .filter((o) => o.title || o.why);
}

function risks(v: unknown): Risk[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      const r = asRecord(item);
      return { title: str(r.title), mitigation: str(r.mitigation) };
    })
    .filter((r) => r.title || r.mitigation);
}

/**
 * Accepts the streaming partial (`DeepPartial<ConsultingBrief> | undefined`),
 * the final brief, or whatever a transcript echoed back, and returns only the
 * fields that exist. Nothing here can throw on a crafted shape.
 */
export function readBrief(input: PartialBrief | undefined): DisplayBrief {
  const b = asRecord(input);
  const rec = asRecord(b.recommendedPath);
  return {
    organization: str(b.organization),
    goal: str(b.goal),
    currentState: str(b.currentState),
    opportunities: opportunities(b.opportunities),
    risks: risks(b.risks),
    keepWithPeople: strs(b.keepWithPeople),
    pathLabel: typeof rec.path === "string" ? pathLabel(rec.path) : "",
    pathReason: str(rec.reason),
    firstStep: str(b.firstStep),
    openQuestions: strs(b.openQuestions),
  };
}

/** The consulting brief, rendered field by field as it streams. Own component so the hook is safe. */
export function BriefCard({ part }: { part: ChatToolPartOf<"draftConsultingBrief"> }) {
  const [expanded, setExpanded] = useState(false);
  const copy = TOOL_STEP_COPY.draftConsultingBrief;

  if (part.state === "output-error") {
    return <ToolStep label="The brief did not save. Ask me to draft it again." state="failed" />;
  }

  const running = part.state === "input-streaming" || part.state === "input-available";
  const brief = readBrief(part.input);
  const hasContent =
    brief.organization ||
    brief.goal ||
    brief.currentState ||
    brief.opportunities.length > 0 ||
    brief.pathLabel ||
    brief.firstStep;
  const extra = brief.risks.length + brief.keepWithPeople.length + brief.openQuestions.length;

  return (
    <div className="space-y-2">
      <ToolStep label={running ? copy.running : copy.done} state={running ? "running" : "done"} />
      {hasContent && (
        <Card title={copy.title}>
          {brief.organization && (
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{brief.organization}</p>
          )}
          {brief.goal && <CardSection heading="Goal">{brief.goal}</CardSection>}
          {brief.currentState && <CardSection heading="Where you are">{brief.currentState}</CardSection>}
          {brief.opportunities.length > 0 && (
            <CardSection heading="Opportunities">
              <ul className="my-0 list-disc pl-4">
                {brief.opportunities.map((o, i) => (
                  <li key={`${i}-${o.title.slice(0, 24)}`}>
                    {o.title && <span className="font-medium">{o.title}</span>}
                    {o.effort && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {" "}
                        ({effortLabel(o.effort)})
                      </span>
                    )}
                    {o.why && <span className="block text-xs text-zinc-600 dark:text-zinc-400">{o.why}</span>}
                  </li>
                ))}
              </ul>
            </CardSection>
          )}
          {(brief.pathLabel || brief.pathReason) && (
            <CardSection heading="Recommended path">
              {brief.pathLabel && (
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{brief.pathLabel}</p>
              )}
              {brief.pathReason && <p>{brief.pathReason}</p>}
            </CardSection>
          )}
          {brief.firstStep && <CardSection heading="First step">{brief.firstStep}</CardSection>}
          {expanded && brief.risks.length > 0 && (
            <CardSection heading="Risks">
              <ul className="my-0 list-disc pl-4">
                {brief.risks.map((r, i) => (
                  <li key={`${i}-${r.title.slice(0, 24)}`}>
                    {r.title && <span className="font-medium">{r.title}</span>}
                    {r.mitigation && (
                      <span className="block text-xs text-zinc-600 dark:text-zinc-400">{r.mitigation}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardSection>
          )}
          {expanded && brief.keepWithPeople.length > 0 && (
            <CardSection heading="Keep with people">
              <CardList items={brief.keepWithPeople} />
            </CardSection>
          )}
          {expanded && brief.openQuestions.length > 0 && (
            <CardSection heading="Open questions">
              <CardList items={brief.openQuestions} />
            </CardSection>
          )}
          {extra > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-2 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              {expanded ? "Show less" : "Show risks, what to keep with people, and open questions"}
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
