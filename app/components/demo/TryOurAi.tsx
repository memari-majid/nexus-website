"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { ASSISTANT_NAME } from "@/lib/chat-persona";
import { INLINE_DEMO_HEIGHT, liveRegionMode, type Announcement } from "@/lib/chat-ui";
import { AnnouncerContext } from "@/app/components/chat/ConversationView";
import { readPanelOpen, serverPanelOpen, subscribePanel } from "@/app/components/chat/chatStore";
import { InlineChat } from "@/app/components/chat/InlineChat";
import { EvalPanel } from "@/app/components/demo/EvalPanel";

/**
 * The inline demo frame: the AI Consultant and its evaluations, in the page.
 *
 * The frame owns the height. It is a fixed box on every viewport, both views
 * scroll inside it, and neither one can grow the page as a conversation or a
 * results table gets longer. Both views stay mounted so switching tabs never
 * throws away a transcript or a finished run.
 *
 * The frame also owns the live regions, for the same reason it owns the
 * height: what it wraps is not always in the accessibility tree. The inactive
 * tabpanel is hidden with `display: none`, which prunes its whole subtree, so
 * a region inside the chat panel went silent the moment a visitor switched to
 * Evaluations, and a reply that landed while they read the table was
 * announced nowhere. The evaluations panel had the mirror image of it: a run
 * takes 20 to 40 seconds, long enough to go back to Chat, and its progress,
 * its result and its refusals were all announced from inside the tabpanel
 * that switching away had just pruned. Both regions sit out here beside the
 * tab strip, in the tree whichever tab is showing.
 *
 * Two regions, not one: they carry unrelated lines from two views that run at
 * the same time, and merging them would let a reply overwrite the run's
 * refusal, or the run overwrite a reply, whichever landed second.
 */

type View = "chat" | "evals";

const TABS: { id: View; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "evals", label: "Evaluations" },
];

export function TryOurAi() {
  const uid = useId();
  const [view, setView] = useState<View>("chat");
  // What the region is currently carrying. `ConversationView` decides what
  // reaches this and how often; the frame only holds it.
  const [announcement, setAnnouncement] = useState<Announcement | undefined>(undefined);
  // The same, for the evaluations panel. `EvalPanel` decides what reaches this
  // and when; the frame only holds it.
  const [evalAnnouncement, setEvalAnnouncement] = useState<Announcement | undefined>(undefined);
  // Both surfaces render the same transcript, so this one stops speaking
  // while the floating panel is open, exactly as the region did in place.
  const panelOpen = useSyncExternalStore(subscribePanel, readPanelOpen, serverPanelOpen);

  const tabId = (id: View) => `${uid}-tab-${id}`;
  const panelId = (id: View) => `${uid}-panel-${id}`;

  function onTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const index = TABS.findIndex((t) => t.id === view);
    const next = TABS[(index + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setView(next.id);
    // `useId` values contain characters a CSS selector would have to escape,
    // so the focus move goes through getElementById, not querySelector.
    document.getElementById(tabId(next.id))?.focus();
  }

  return (
    <AnnouncerContext.Provider value={setAnnouncement}>
      {/* `INLINE_DEMO_HEIGHT` carries the floor this box needs, so no `min-h-0`
          here: two min-heights on one element tie on specificity. */}
      <div
        className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${INLINE_DEMO_HEIGHT}`}
      >
        <div
          role="tablist"
          aria-label={`${ASSISTANT_NAME} demo`}
          onKeyDown={onTabKeyDown}
          className="flex shrink-0 min-w-0 gap-1 border-b border-zinc-200 px-3 pt-3 dark:border-zinc-800"
        >
          {TABS.map((t) => {
            const selected = view === t.id;
            return (
              <button
                key={t.id}
                id={tabId(t.id)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId(t.id)}
                tabIndex={selected ? 0 : -1}
                onClick={() => setView(t.id)}
                className={`-mb-px shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition motion-reduce:transition-none ${
                  selected
                    ? "border-brand-600 text-zinc-900 dark:border-brand-400 dark:text-zinc-50"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Outside both tabpanels on purpose: see the note on the frame. The
            chat one goes quiet while the floating panel is open, because that
            panel renders the same transcript and announces it itself. */}
        <div
          role="status"
          aria-live={liveRegionMode(!panelOpen)}
          aria-atomic="true"
          className="sr-only"
        >
          {announcement && <p key={announcement.id}>{announcement.text}</p>}
        </div>

        {/* The evaluations run is rendered here and nowhere else, so this one
            speaks whatever is showing and whatever else is open. */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {evalAnnouncement && <p key={evalAnnouncement.id}>{evalAnnouncement.text}</p>}
        </div>

        <div
          id={panelId("chat")}
          role="tabpanel"
          aria-labelledby={tabId("chat")}
          className={view === "chat" ? "flex min-h-0 min-w-0 flex-1 flex-col" : "hidden"}
        >
          <InlineChat />
        </div>

        <div
          id={panelId("evals")}
          role="tabpanel"
          aria-labelledby={tabId("evals")}
          tabIndex={view === "evals" ? 0 : -1}
          className={
            view === "evals"
              ? "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
              : "hidden"
          }
        >
          <EvalPanel onAnnounce={setEvalAnnouncement} />
        </div>
      </div>
    </AnnouncerContext.Provider>
  );
}
