"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { audienceLabel } from "@/lib/outreach";
import { TOOL_STEP_COPY, type ChatToolPartOf } from "@/lib/chat-ui";
import { Card, ToolStep, asRecord, str, strs } from "./primitives";

type Note = { audience: string; subject: string; paragraphs: string[]; ask: string };

/**
 * The note lives in the tool input, which is what streams, so the card reads
 * the input in every state. Nothing here can throw on a crafted shape.
 */
function readNote(input: unknown): Note {
  const n = asRecord(input);
  return {
    audience: audienceLabel(n.audience),
    subject: str(n.subject),
    paragraphs: strs(n.paragraphs).slice(0, 4),
    ask: str(n.ask),
  };
}

/**
 * Plain text of the note, for the clipboard. Built here rather than with
 * `renderNoteText`, which takes a validated note; this one takes whatever the
 * stream has so far.
 */
function noteText(note: Note): string {
  return [note.subject && `Subject: ${note.subject}`, "", ...note.paragraphs, "", note.ask]
    .filter((line) => line !== undefined)
    .join("\n")
    .trim();
}

/** Copies the note. Clipboard access can be refused, so the label says what happened. */
function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="mt-3 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
    >
      {state === "copied" ? "Copied" : state === "failed" ? "Select it and copy" : "Copy the note"}
    </button>
  );
}

/**
 * The note the visitor can actually send: to their leadership, to their team,
 * or to the founder. Rendered as it streams, and copyable when it is done.
 * Own component so the hooks never sit under a switch.
 */
export function NoteCard({ part }: { part: ChatToolPartOf<"draftOutreachNote"> }) {
  const copy = TOOL_STEP_COPY.draftOutreachNote;

  if (part.state === "output-error") {
    return <ToolStep label="The note did not save. Ask me to draft it again." state="failed" />;
  }

  const running = part.state === "input-streaming" || part.state === "input-available";
  const note = readNote(part.input);
  const hasContent = note.subject || note.paragraphs.length > 0 || note.ask;

  return (
    <div className="space-y-2">
      <ToolStep label={running ? copy.running : copy.done} state={running ? "running" : "done"} />
      {hasContent && (
        <Card title={copy.title}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {note.audience}
          </p>
          {note.subject && (
            <p className="mt-0.5 font-semibold text-zinc-900 dark:text-zinc-100">{note.subject}</p>
          )}
          {note.paragraphs.map((p, i) => (
            <p key={`${i}-${p.slice(0, 24)}`} className="mt-2 text-sm leading-relaxed">
              {p}
            </p>
          ))}
          {note.ask && (
            <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
              {note.ask}
            </p>
          )}
          {!running && <CopyButton text={noteText(note)} />}
        </Card>
      )}
    </div>
  );
}
