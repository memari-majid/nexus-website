import { MAX_SCORE, clampScore, summarizeReadiness } from "@/lib/readiness";
import { TOOL_STEP_COPY, readReadinessInput, type ChatToolPartOf } from "@/lib/chat-ui";
import { Card, ToolStep } from "./primitives";

/**
 * The readiness snapshot: scored dimensions as filled and empty dots with
 * screen-reader text for the number, plus the level, the weakest dimension,
 * and the next step. The verdict is recomputed from the scores with the same
 * pure function the tool uses. `clampScore` guards every `.repeat`. No hooks.
 */
export function ReadinessCard({ part }: { part: ChatToolPartOf<"assessReadiness"> }) {
  const copy = TOOL_STEP_COPY.assessReadiness;

  if (part.state === "output-error") {
    return (
      <ToolStep label="The readiness snapshot did not complete. Ask me to try again." state="failed" />
    );
  }

  const running = part.state !== "output-available";
  const input = readReadinessInput(part.state === "output-available" ? part.output : part.input);
  const snapshot = input ? summarizeReadiness(input) : undefined;

  return (
    <div className="space-y-2">
      <ToolStep label={running ? copy.running : copy.done} state={running ? "running" : "done"} />
      {snapshot && (snapshot.dimensions.length > 0 || snapshot.headline) && (
        <Card title={copy.title}>
          {snapshot.headline && (
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{snapshot.headline}</p>
          )}
          {snapshot.dimensions.length > 0 && (
            <dl className="mt-2 space-y-2">
              {snapshot.dimensions.map((d) => {
                const s = clampScore(d.score);
                return (
                  <div key={d.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {d.label}
                      </dt>
                      <dd className="shrink-0 font-mono text-xs tracking-[0.2em] text-brand-700 dark:text-brand-400">
                        <span aria-hidden="true">
                          {"●".repeat(s)}
                          {"○".repeat(MAX_SCORE - s)}
                        </span>
                        <span className="sr-only">
                          {s} out of {MAX_SCORE}
                        </span>
                      </dd>
                    </div>
                    {d.note && (
                      <dd className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{d.note}</dd>
                    )}
                  </div>
                );
              })}
            </dl>
          )}
          {!running && snapshot.dimensions.length > 0 && (
            <p className="mt-3 text-xs text-zinc-800 dark:text-zinc-200">
              <span className="font-semibold">{snapshot.level}</span>
              <span aria-hidden="true"> · </span>
              <span className="sr-only">, </span>
              {snapshot.overall} of {MAX_SCORE} overall
              {snapshot.weakest && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="sr-only">, </span>
                  fix {snapshot.weakest.label.toLowerCase()} first
                </>
              )}
            </p>
          )}
          {!running && snapshot.nextStep && (
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{snapshot.nextStep}</p>
          )}
        </Card>
      )}
    </div>
  );
}
