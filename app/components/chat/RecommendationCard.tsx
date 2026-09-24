import { TOOL_STEP_COPY, type ChatToolPartOf } from "@/lib/chat-ui";
import { Card, ToolStep, asRecord, str, strs } from "./primitives";

type Recommendation = {
  title: string;
  url: string;
  hostedByNexus: boolean;
  why: string;
  alternatives: string[];
};

/** Reads the catalog pick defensively; only https links are rendered as links. */
function readRecommendation(output: unknown): Recommendation | undefined {
  const o = asRecord(output);
  const title = str(o.title);
  if (!title) return undefined;
  const url = str(o.url);
  return {
    title,
    url: /^https:\/\//i.test(url) ? url : "",
    hostedByNexus: o.hostedByNexus === true,
    why: str(o.why),
    alternatives: strs(o.alternatives).slice(0, 3),
  };
}

/** The grounded NVIDIA catalog pick. No hooks. */
export function RecommendationCard({ part }: { part: ChatToolPartOf<"recommendWorkshop"> }) {
  const copy = TOOL_STEP_COPY.recommendWorkshop;

  if (part.state === "output-error") {
    return <ToolStep label="Could not check the catalog just now. Ask me again in a moment." state="failed" />;
  }
  if (part.state !== "output-available") {
    return <ToolStep label={copy.running} state="running" />;
  }
  const rec = readRecommendation(part.output);
  if (!rec) return <ToolStep label={copy.done} state="done" />;

  return (
    <div className="space-y-2">
      <ToolStep label={copy.done} state="done" />
      <Card title={copy.title}>
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">
          {rec.url ? (
            <a
              href={rec.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-zinc-400 underline-offset-2 hover:decoration-brand-600 dark:decoration-zinc-600 dark:hover:decoration-brand-400"
            >
              {rec.title}
            </a>
          ) : (
            rec.title
          )}
        </p>
        {rec.hostedByNexus && (
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
            Hosted and taught by Nexus
          </p>
        )}
        {rec.why && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{rec.why}</p>}
        {rec.alternatives.length > 0 && (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Also worth a look: {rec.alternatives.join(", ")}
          </p>
        )}
      </Card>
    </div>
  );
}
