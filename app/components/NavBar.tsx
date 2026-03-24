"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Services", href: "#services" },
  { label: "Projects", href: "#projects" },
  { label: "Workshops", href: "#workshops" },
  { label: "Government", href: "#government" },
  { label: "About", href: "#about" },
  { label: "Careers", href: "#careers" },
  { label: "Contact", href: "#contact" },
];

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2.5 group">
          <Image
            src="/nexus-logo.png"
            alt="Nexus AI Solutions"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-contain"
            priority
          />
          <span className="text-lg font-semibold tracking-tight">
            Nexus<span className="text-sky-400"> AI</span>
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 whitespace-nowrap"
          >
            Get in Touch
          </a>
        </div>

        <button
          type="button"
          className="lg:hidden rounded-md border border-zinc-700 p-2 text-zinc-400"
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

      {menuOpen && (
        <div className="lg:hidden border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md px-6 pb-4 pt-2 space-y-3 max-h-[70vh] overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-zinc-400 hover:text-zinc-100 transition-colors py-1"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            onClick={() => setMenuOpen(false)}
            className="block rounded-lg bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Get in Touch
          </a>
        </div>
      )}
    </nav>
  );
}
