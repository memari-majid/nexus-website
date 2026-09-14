"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { INLINE_DEMO_HEIGHT, liveRegionMode, type Announcement } from "@/lib/chat-ui";
import { AnnouncerContext } from "@/app/components/chat/ConversationView";
import {
  readPanelOpen,
  serverPanelOpen,
  setDemoInView,
  setPanelOpen,
  subscribePanel,
} from "@/app/components/chat/chatStore";
import { InlineChat } from "@/app/components/chat/InlineChat";

/**
 * The inline chat frame: the AI Consultant, in the page.
 *
 * The frame owns the height. It is a fixed box on every viewport, the
 * conversation scrolls inside it, and nothing can grow the page as a
 * conversation gets longer.
 *
 * The frame also owns the live region, rendered as a sibling of the chat so
 * it is always in the accessibility tree, and it hands the announcer down
 * through `AnnouncerContext`. It goes quiet while the floating panel is open,
 * because that panel renders the same transcript and announces it itself.
 *
 * The frame also reports whether it is on screen (`setDemoInView`). The
 * page's fixed launcher and scroll-to-top button sit exactly over this
 * frame's Send button and right-hand chips on a phone, and they step aside
 * below `sm` while the frame is in the viewport.
 */
export function TryOurAi({ standalone = false }: { standalone?: boolean }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const frameHeight = standalone
    ? "h-[37.5rem] min-h-[20rem] max-h-[calc(100dvh-20rem)]"
    : INLINE_DEMO_HEIGHT;

  // A full-page chat has no floating panel. Clear its shared state when
  // arriving from another page so the visible conversation can announce replies.
  useEffect(() => {
    if (standalone) setPanelOpen(false);
  }, [standalone]);

  // Any part of the frame in the viewport counts: while it is, the fixed
  // buttons yield below `sm`. Cleared on unmount so a navigation away never
  // leaves the launcher hidden.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setDemoInView(entry?.isIntersecting === true);
    });
    observer.observe(frame);
    return () => {
      observer.disconnect();
      setDemoInView(false);
    };
  }, []);
  // What the region is currently carrying. `ConversationView` decides what
  // reaches this and how often; the frame only holds it.
  const [announcement, setAnnouncement] = useState<Announcement | undefined>(undefined);
  // Both surfaces render the same transcript, so this one stops speaking
  // while the floating panel is open.
  const panelOpen = useSyncExternalStore(subscribePanel, readPanelOpen, serverPanelOpen);

  return (
    <AnnouncerContext.Provider value={setAnnouncement}>
      {/* `INLINE_DEMO_HEIGHT` carries the floor this box needs, so no `min-h-0`
          here: two min-heights on one element tie on specificity. */}
      <div
        ref={frameRef}
        className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${frameHeight}`}
      >
        <div
          role="status"
          aria-live={liveRegionMode(!panelOpen)}
          aria-atomic="true"
          className="sr-only"
        >
          {announcement && <p key={announcement.id}>{announcement.text}</p>}
        </div>

        <InlineChat />
      </div>
    </AnnouncerContext.Provider>
  );
}
