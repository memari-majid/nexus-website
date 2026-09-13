import { kindLabel } from "@/lib/estimate";
import { TOOL_STEP_COPY, type ChatToolPartOf } from "@/lib/chat-ui";
import { Card, CardList, CardSection, ToolStep, asRecord, str, strs } from "./primitives";

type Phase = { name: string; low: number; high: number; detail: string };

type Estimate = {
  phases: Phase[];
  totalLow: number;
  totalHigh: number;
  drivers: string[];
  biggestUnknown: string;
  whatShrinksIt: string;
  disclaimer: string;
};

function weeks(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

function readPhases(v: unknown): Phase[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item): Phase => {
      const p = asRecord(item);
      return { name: str(p.name), low: weeks(p.low), high: weeks(p.high), detail: str(p.detail) };
    })
    .filter((p) => p.name && p.high > 0);
}

/** Reads the finished estimate defensively: an echoed transcript is untrusted. */
function readEstimate(output: unknown): Estimate {
  const o = asRecord(output);
  return {
    phases: readPhases(o.phases),
    totalLow: weeks(o.totalLow),
    totalHigh: weeks(o.totalHigh),
    drivers: strs(o.drivers).slice(0, 4),
    biggestUnknown: str(o.biggestUnknown),
    whatShrinksIt: str(o.whatShrinksIt),
    disclaimer: str(o.disclaimer),
  };
}

/** The pieces the model named, read from the streaming input. */
function readComponents(input: unknown): { name: string; kind: string; complexity: string }[] {
  const items = asRecord(input).components;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const c = asRecord(item);
      return { name: str(c.name), kind: kindLabel(c.kind), complexity: str(c.complexity) };
    })
    .filter((c) => c.name)
    .slice(0, 8);
}

function range(low: number, high: number): string {
  if (high <= 0) return "";
  if (low <= 0 || low === high) return `${high} weeks`;
  return `${low} to ${high} weeks`;
}

/**
 * The planning range: the phases the work breaks into, the total span, what
 * moves it, and the line that keeps it honest. The weeks come from a fixed
 * band table on the server, never from the model, and the card says so every
 * time. While the call streams the card shows the pieces as they arrive, the
 * way the brief does. No hooks.
 */
export function EstimateCard({ part }: { part: ChatToolPartOf<"estimateProject"> }) {
  const copy = TOOL_STEP_COPY.estimateProject;

  if (part.state === "output-error") {
    return <ToolStep label="The estimate did not complete. Ask me to try again." state="failed" />;
  }

  if (part.state !== "output-available") {
    const goal = str(asRecord(part.input).goal);
    const components = readComponents(part.input);
    return (
      <div className="space-y-2">
        <ToolStep label={copy.running} state="running" />
        {(goal || components.length > 0) && (
          <Card title={copy.title}>
            {goal && <p className="font-medium text-zinc-900 dark:text-zinc-100">{goal}</p>}
            {components.length > 0 && (
              <CardSection heading="Pieces">
                <CardList items={components.map((c) => `${c.name} (${c.kind})`)} />
              </CardSection>
            )}
          </Card>
        )}
      </div>
    );
  }

  const est = readEstimate(part.output);
  const total = range(est.totalLow, est.totalHigh);
  if (!total && est.phases.length === 0) return <ToolStep label={copy.done} state="done" />;

  return (
    <div className="space-y-2">
      <ToolStep label={copy.done} state="done" />
      <Card title={copy.title}>
        {total && (
          <p className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {total} end to end
          </p>
        )}
        {est.phases.length > 0 && (
          <dl className="mt-2 space-y-1.5">
            {est.phases.map((p) => (
              <div key={p.name} className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <dt className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{p.name}</dt>
                  {p.detail && (
                    <dd className="text-xs text-zinc-600 dark:text-zinc-400">{p.detail}</dd>
                  )}
                </div>
                <dd className="shrink-0 font-mono text-xs tabular-nums text-brand-700 dark:text-brand-400">
                  {range(p.low, p.high)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {est.drivers.length > 0 && (
          <CardSection heading="What moved it">
            <CardList items={est.drivers} />
          </CardSection>
        )}
        {est.biggestUnknown && (
          <CardSection heading="Biggest unknown">{est.biggestUnknown}</CardSection>
        )}
        {est.whatShrinksIt && (
          <CardSection heading="What would shrink it">{est.whatShrinksIt}</CardSection>
        )}
        {est.disclaimer && (
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">{est.disclaimer}</p>
        )}
      </Card>
    </div>
  );
}
