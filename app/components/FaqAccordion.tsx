"use client";

import { useState } from "react";
import { FAQS } from "@/lib/faq";

export function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-zinc-200 dark:divide-zinc-800/60">
      {FAQS.map((faq, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:text-base">
                {faq.q}
              </span>
              <svg
                className={`h-5 w-5 shrink-0 text-sky-600 transition-transform duration-300 dark:text-sky-400 ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[min(28rem,70vh)] pb-5" : "max-h-0"}`}
            >
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{faq.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
