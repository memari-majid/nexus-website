import Link from "next/link";
import { TOOL_STEP_COPY, type ChatToolPartOf } from "@/lib/chat-ui";
import { Card, ToolStep, asRecord, str } from "./primitives";

type Fact = { id: string; topic: string; text: string; source: string; path: string };

/**
 * Echoed transcripts are untrusted, so every field is read defensively and
 * only site-relative paths become links.
 */
function readFacts(output: unknown): Fact[] {
  const items = Array.isArray(asRecord(output).facts) ? (asRecord(output).facts as unknown[]) : [];
  return items
    .map((item, i): Fact => {
      const f = asRecord(item);
      const path = str(f.path);
      return {
        id: str(f.id) || `fact-${i}`,
        topic: str(f.topic),
        text: str(f.text),
        source: str(f.source),
        path: /^\/[A-Za-z0-9/_-]*$/.test(path) ? path : "",
      };
    })
    .filter((f) => f.text)
    .slice(0, 6);
}

/**
 * What the assistant checked before answering: the published facts it is
 * quoting, each with the page it came from. This is the card that makes
 * grounding visible, so it stays small and always names its source. No hooks.
 */
export function FactsCard({ part }: { part: ChatToolPartOf<"lookupSiteFacts"> }) {
  const copy = TOOL_STEP_COPY.lookupSiteFacts;

  if (part.state === "output-error") {
    return <ToolStep label="Could not check the site just now. Ask me again in a moment." state="failed" />;
  }
  if (part.state !== "output-available") {
    return <ToolStep label={copy.running} state="running" />;
  }

  const facts = readFacts(part.output);
  if (facts.length === 0) {
    return <ToolStep label="Nothing published on that, so I will not guess" state="done" />;
  }

  return (
    <div className="space-y-2">
      <ToolStep label={copy.done} state="done" />
      <Card title={copy.title}>
        <ul className="my-0 space-y-2 pl-0">
          {facts.map((f) => (
            <li key={f.id} className="list-none">
              {f.topic && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {f.topic}
                </p>
              )}
              <p className="text-sm leading-relaxed">{f.text}</p>
              {f.source && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {f.path ? (
                    <Link
                      href={f.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-zinc-400 underline-offset-2 hover:decoration-brand-600 dark:decoration-zinc-600 dark:hover:decoration-brand-400"
                    >
                      {f.source}
                    </Link>
                  ) : (
                    f.source
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
