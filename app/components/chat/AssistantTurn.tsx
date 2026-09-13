"use client";

import { isStaticToolUIPart } from "ai";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  NO_SIDEWAYS_OVERFLOW,
  displayAssistantText,
  splitSuggestions,
  type ChatUIMessage,
} from "@/lib/chat-ui";
import type { ToolPartContext } from "./primitives";
import { StatLine } from "./StatLine";
import { ToolPartView } from "./ToolPartView";

const ASSISTANT_BUBBLE = `mr-4 rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-zinc-300 ${NO_SIDEWAYS_OVERFLOW}`;

/**
 * Markdown inside a fixed-width column: links are brand coloured, code and
 * tables scroll inside themselves instead of widening the transcript, and
 * long unbroken strings wrap.
 */
const MARKDOWN_CLASSES =
  "max-w-none min-w-0 break-words text-sm leading-relaxed [&_a]:text-brand-600 [&_a]:underline dark:[&_a]:text-brand-400 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1.5 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-zinc-200 [&_code]:px-1 dark:[&_code]:bg-zinc-800 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-2 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto";

/** True when the message has something to show: visible text or a tool step. */
export function hasVisibleContent(m: ChatUIMessage): boolean {
  return m.parts.some(
    (p) =>
      (p.type === "text" && splitSuggestions(displayAssistantText(p.text)).body.trim().length > 0) ||
      isStaticToolUIPart(p),
  );
}

/**
 * One assistant turn, rendered part by part in message order: text before a
 * tool call appears above its card, text after it appears below. The
 * SUGGESTIONS marker is split from the last text segment only.
 */
export function AssistantTurn({ m, tools }: { m: ChatUIMessage; tools: ToolPartContext }) {
  let lastText = -1;
  m.parts.forEach((p, i) => {
    if (p.type === "text") lastText = i;
  });

  const nodes: ReactNode[] = [];
  m.parts.forEach((p, i) => {
    if (p.type === "text") {
      const cleaned = displayAssistantText(p.text);
      const body = i === lastText ? splitSuggestions(cleaned).body : cleaned;
      if (body.trim().length === 0) return;
      nodes.push(
        <div key={`text-${i}`} className={ASSISTANT_BUBBLE}>
          <div className={MARKDOWN_CLASSES}>
            <ReactMarkdown
              components={{
                a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>,
      );
    } else if (isStaticToolUIPart(p)) {
      nodes.push(<ToolPartView key={p.toolCallId} part={p} tools={tools} />);
    }
  });

  if (nodes.length === 0) return null;
  return (
    <div className={`space-y-2 ${NO_SIDEWAYS_OVERFLOW}`}>
      {nodes}
      <StatLine metadata={m.metadata} />
    </div>
  );
}
