"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { readDemoInView, serverDemoInView, subscribeDemoInView } from "@/app/components/chat/chatStore";

/**
 * Identical in both repos. Below `sm` it steps aside while the inline demo
 * frame is in the viewport: on a phone it sits over the demo's right-hand
 * chips and the corner of its Send button (measured at 390x844 and 360x640,
 * both themes), and the frame's own controls come first.
 */
export function ScrollToTop() {
  const [show, setShow] = useState(false);
  const demoInView = useSyncExternalStore(subscribeDemoInView, readDemoInView, serverDemoInView);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed z-40 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-zinc-300 bg-white/90 text-sky-600 shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-sky-600 hover:text-white dark:border-zinc-700/50 dark:bg-zinc-800/80 dark:text-sky-400 dark:hover:bg-sky-600 dark:hover:text-white bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] sm:bottom-[calc(6rem+env(safe-area-inset-bottom))] sm:right-6 ${demoInView ? "max-sm:hidden" : ""}`}
      aria-label="Scroll to top"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m5 15 7-7 7 7" />
      </svg>
    </button>
  );
}
