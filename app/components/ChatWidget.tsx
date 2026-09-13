"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { OPEN_CHAT_EVENT } from "@/lib/chat-events";
import { ASSISTANT_THE } from "@/lib/chat-persona";
import {
  FLOATING_PANEL_HEIGHT,
  FOCUSABLE_SELECTOR,
  SHEET_PANEL_QUERY,
  chatTitleId,
  escapeClosesDialog,
  lockedBodyStyle,
  trapTabTarget,
  type Announcement,
} from "@/lib/chat-ui";
import { ConversationView } from "@/app/components/chat/ConversationView";
import { setPanelOpen } from "@/app/components/chat/chatStore";

/**
 * The floating shell: a launcher, and a panel that holds the shared
 * conversation view. Everything about the conversation itself lives in
 * `app/components/chat/ConversationView.tsx`, and the transcript lives in
 * `app/components/chat/chatStore.ts`, so a visitor who started in the inline
 * demo on the homepage finds the same conversation here and continues it.
 *
 * This file owns only the chrome: the launcher, the dialog, focus, Escape,
 * the focus trap, the iOS-safe scroll lock, and the fit rules. The panel is
 * capped against the dynamic viewport minus its own insets, the transcript
 * scrolls inside itself, and the composer is pinned, so the composer is
 * visible at every height, on every viewport, with the keyboard open.
 *
 * It also owns this surface's live region, as the inline demo's frame owns
 * that one. There are no tabs here and nothing hides the conversation while
 * it is mounted, so the region is a plain sibling of the view and is always
 * polite: the panel only exists while it is open, and while it is open it is
 * the surface that speaks.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | undefined>(undefined);
  const idPrefix = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Whatever had focus when the dialog opened (a CTA, or the launcher).
  // Focus goes back there on close, or to the launcher when it is gone.
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const openDialog = useCallback(() => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => setOpen(false), []);

  // The inline demo watches this: while the panel is open it stops speaking,
  // so one finished reply is announced once and not twice. Closing also drops
  // whatever this panel last announced: the announcement now lives here rather
  // than in the view, so it outlives the dialog, and the view seeds itself
  // quiet on the next open. Without this the region would come back holding a
  // stale reply.
  useEffect(() => {
    setPanelOpen(open);
    if (!open) setAnnouncement(undefined);
    return () => setPanelOpen(false);
  }, [open]);

  // Open the panel when any CTA dispatches the open-chat event.
  useEffect(() => {
    const onOpen = () => openDialog();
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, [openDialog]);

  // Focus moves into the dialog when it opens (the input, or the first
  // control while the input is locked) and back out when it closes.
  useEffect(() => {
    if (open) {
      const input = inputRef.current;
      const target =
        input && !input.disabled
          ? input
          : (dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialogRef.current);
      target?.focus({ preventScroll: true });
    } else if (wasOpenRef.current) {
      const opener = openerRef.current;
      const usable = !!opener && opener.isConnected && opener.getClientRects().length > 0;
      (usable ? opener : launcherRef.current)?.focus({ preventScroll: true });
      openerRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open]);

  // Escape closes the dialog (not from a native select, where it closes the
  // option list), and Tab cycles inside it, pulling focus back in when it
  // has drifted to the page behind.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (e.key === "Escape") {
        if (!escapeClosesDialog(e.target instanceof Element ? e.target.tagName : undefined)) return;
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.getClientRects().length > 0,
      );
      const active = document.activeElement;
      const index = active instanceof HTMLElement ? focusable.indexOf(active) : -1;
      const target = trapTabTarget(index, focusable.length, e.shiftKey);
      if (target === undefined) return;
      e.preventDefault();
      focusable[target]?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Below `sm` the dialog is a full-screen sheet, so the page behind it is
  // pinned while it is open (iOS Safari scrolls through overflow: hidden, so
  // the body is fixed in place at its current offset) and put back on close.
  // The floating panel on wider screens leaves the page alone.
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia(SHEET_PANEL_QUERY);
    const body = document.body;
    let lock: { scrollY: number; previous: [string, string][] } | undefined;
    const release = () => {
      if (!lock) return;
      for (const [name, value] of lock.previous) {
        if (value) body.style.setProperty(name, value);
        else body.style.removeProperty(name);
      }
      window.scrollTo({ top: lock.scrollY, behavior: "instant" });
      lock = undefined;
    };
    const sync = () => {
      if (media.matches) {
        release();
        return;
      }
      if (lock) return;
      const scrollY = window.scrollY;
      const style = lockedBodyStyle(scrollY);
      lock = {
        scrollY,
        previous: Object.keys(style).map((name): [string, string] => [name, body.style.getPropertyValue(name)]),
      };
      for (const [name, value] of Object.entries(style)) body.style.setProperty(name, value);
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      release();
    };
  }, [open]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={openDialog}
        className={`fixed z-[60] flex h-14 w-14 min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-brand-500 text-zinc-950 shadow-lg shadow-brand-900/30 transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-zinc-50 motion-reduce:transition-none dark:focus:ring-offset-zinc-950 ${open ? "hidden" : ""} bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))]`}
        aria-label={`Open ${ASSISTANT_THE}`}
        aria-haspopup="dialog"
      >
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m9.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H15m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[70] flex h-[100dvh] max-h-[100dvh] items-stretch justify-end overflow-hidden bg-black/50 p-0 pt-[env(safe-area-inset-top)] outline-none sm:items-end sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={chatTitleId(idPrefix)}
        >
          <div
            className={`flex w-full min-w-0 max-w-[100vw] flex-col overflow-hidden rounded-none border-0 border-zinc-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl sm:border sm:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 ${FLOATING_PANEL_HEIGHT}`}
          >
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
              {announcement && <p key={announcement.id}>{announcement.text}</p>}
            </div>
            <ConversationView
              surface="floating"
              idPrefix={idPrefix}
              live
              containerRef={dialogRef}
              inputRef={inputRef}
              onClose={closeDialog}
              onAnnounce={setAnnouncement}
            />
          </div>
        </div>
      )}
    </>
  );
}
