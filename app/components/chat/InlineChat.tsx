"use client";

import { useId, useRef, useSyncExternalStore } from "react";
import { NO_SIDEWAYS_OVERFLOW } from "@/lib/chat-ui";
import { ConversationView } from "./ConversationView";
import { readPanelOpen, serverPanelOpen, subscribePanel } from "./chatStore";

/**
 * The inline shell: the same conversation as the floating panel, rendered in
 * the page instead of over it.
 *
 * It deliberately does NOT set its own height. The demo frame around it owns
 * the box (`INLINE_DEMO_HEIGHT` on `app/components/demo/TryOurAi.tsx`, which
 * also carries the tab strip), so this shell fills whatever it is given,
 * scrolls the transcript inside, and keeps the composer pinned. Giving it a
 * second fixed height here would push the composer past the frame.
 *
 * Only one surface may speak. While the floating panel is open it owns the
 * live region and this one goes quiet, without unmounting: re-inserting a
 * region that already has content makes several screen readers announce the
 * last reply a second time when the panel closes.
 */
export function InlineChat() {
  const idPrefix = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelOpen = useSyncExternalStore(subscribePanel, readPanelOpen, serverPanelOpen);

  return (
    <div ref={containerRef} className={`flex h-full min-h-0 flex-col ${NO_SIDEWAYS_OVERFLOW}`}>
      <ConversationView
        surface="inline"
        idPrefix={idPrefix}
        live={!panelOpen}
        containerRef={containerRef}
        inputRef={inputRef}
      />
    </div>
  );
}
