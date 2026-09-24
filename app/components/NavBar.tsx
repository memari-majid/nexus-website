"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { openChat } from "@/lib/chat-events";

/** Consulting is the lead offer, so it comes first. Keep exactly four links. */
const NAV_ITEMS = [
  { label: "Consulting", href: "/#consulting" },
  { label: "Training", href: "/nvidia-dli-workshops" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function NavBar({ chatHref }: { chatHref?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-zinc-50/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/90"
    >
      <div className="mx-auto flex min-w-0 max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:py-4">
        <Link href="/" className="group flex min-h-[44px] min-w-0 shrink-0 items-center gap-2.5">
          <Image
            src="/nexus-logo.png"
            alt="Nexus AI Solutions"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg object-contain"
            priority
          />
          <span className="min-w-0 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Nexus<span className="text-brand-600 dark:text-brand-400"> AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
          {chatHref ? (
            <Link href={chatHref} className="btn-primary btn-compact">
              Ask our AI
            </Link>
          ) : (
            <button
              type="button"
              onClick={openChat}
              className="btn-primary btn-compact"
            >
              Ask our AI
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="max-h-[min(70vh,calc(100dvh-env(safe-area-inset-top)-5rem))] space-y-3 overflow-y-auto border-t border-zinc-200/80 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-950/95 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
          {chatHref ? (
            <Link href={chatHref} onClick={() => setMenuOpen(false)} className="btn-primary block w-full">
              Ask our AI
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openChat();
              }}
              className="btn-primary block w-full"
            >
              Ask our AI
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
