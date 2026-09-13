import type { ReactNode } from "react";

/**
 * Shared chrome for the agent steps Dr. MJ shows in the chat: a one-line step
 * row (running, done, failed, declined) and the card that holds a result.
 * No hooks here, so these can sit under any switch.
 */

export type StepState = "running" | "waiting" | "done" | "failed" | "denied";

const STEP_TEXT: Record<StepState, string> = {
  running: "text-zinc-600 dark:text-zinc-400",
  waiting: "text-zinc-600 dark:text-zinc-400",
  done: "text-zinc-600 dark:text-zinc-400",
  failed: "text-amber-700 dark:text-amber-400",
  denied: "text-zinc-500 dark:text-zinc-400",
};

/** What every card gets from the widget besides its own part. */
export type ToolPartContext = {
  /** A request is in flight (submitted or streaming). */
  busy: boolean;
  /** A completed consulting brief exists in the transcript, so a hand-off will carry it. */
  briefDrafted: boolean;
  onApproval: (id: string, approved: boolean) => void;
  /** Re-sends the transcript so the server runs an answered approval whose re-send failed or was stopped. */
  onRetry: () => void;
};

function StepIcon({ state }: { state: StepState }) {
  if (state === "running") {
    return (
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-500 motion-reduce:animate-none"
      />
    );
  }
  if (state === "waiting") {
    return (
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full border-2 border-brand-500 bg-transparent"
      />
    );
  }
  if (state === "done") {
    return (
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 text-brand-700 dark:text-brand-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (state === "failed") {
    return (
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 4h.01" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * One visible agent step. `role="status"` only while it is running. `action`
 * adds a small inline button, used for the retry on a send that did not go
 * through.
 */
export function ToolStep({
  label,
  state,
  action,
}: {
  label: string;
  state: StepState;
  action?: { label: string; onClick: () => void };
}) {
  const className = `mr-4 flex flex-wrap items-center gap-2 px-1 text-xs ${STEP_TEXT[state]}`;
  const text = state === "running" ? `${label}…` : label;
  const button = action ? (
    <button
      type="button"
      onClick={action.onClick}
      className="rounded-md border border-current px-2 py-0.5 text-[11px] font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      {action.label}
    </button>
  ) : null;
  if (state === "running") {
    return (
      <div role="status" className={className}>
        <StepIcon state={state} />
        <span>{text}</span>
        {button}
      </div>
    );
  }
  return (
    <div className={className}>
      <StepIcon state={state} />
      <span>{text}</span>
      {button}
    </div>
  );
}

export type CardTone = "default" | "ok" | "warn";

const CARD_TONE: Record<CardTone, string> = {
  default: "border-zinc-200 dark:border-zinc-800",
  ok: "border-brand-200 dark:border-brand-900/60",
  warn: "border-amber-300 dark:border-amber-900/60",
};

/** A result card. Renders in message order, right after the step row. */
export function Card({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: CardTone;
  children: ReactNode;
}) {
  return (
    <section
      className={`mr-4 rounded-xl border bg-white p-3 text-sm text-zinc-800 shadow-sm dark:bg-zinc-900/80 dark:text-zinc-200 ${CARD_TONE[tone]}`}
    >
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function CardSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {heading}
      </p>
      <div className="mt-0.5 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function CardList({ items, ordered = false }: { items: readonly string[]; ordered?: boolean }) {
  if (items.length === 0) return null;
  const className = `my-0 pl-4 text-sm leading-relaxed ${ordered ? "list-decimal" : "list-disc"}`;
  const nodes = items.map((s, i) => <li key={`${i}-${s.slice(0, 24)}`}>{s}</li>);
  return ordered ? <ol className={className}>{nodes}</ol> : <ul className={className}>{nodes}</ul>;
}

export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function strs(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim())
    : [];
}

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
