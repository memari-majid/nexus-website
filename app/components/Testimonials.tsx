"use client";

import { useEffect, useState } from "react";

const HIGHLIGHTS = [
  {
    domain: "Industry & community",
    body: (
      <>
        Collaboration with professionals across business, software engineering, and the{" "}
        <a
          href="https://www.siliconslopes.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 underline decoration-sky-600/30 underline-offset-2 hover:decoration-sky-600 dark:text-sky-400 dark:decoration-sky-400/30"
        >
          Silicon Slopes
        </a>{" "}
        technology community.
      </>
    ),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
      />
    ),
  },
  {
    domain: "Education",
    body: (
      <>
        Led 100+ students; designed, taught, and delivered about 10 Applied AI courses, workshops, and
        hands-on training aligned with industry tools and university partners.
      </>
    ),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm6 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm6 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
      />
    ),
  },
  {
    domain: "Software engineering",
    body: (
      <>
        200+ public repositories on GitHub; production integrations, APIs, and agentic AI workflows (including
        tools like n8n) for automation and delivery.
      </>
    ),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
      />
    ),
  },
  {
    domain: "Government & research",
    body: (
      <>
        Led 10+ funded projects; USHE and state-agency collaborations including privacy-preserving AI and
        responsible use of data in education and public programs.
      </>
    ),
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"
      />
    ),
  },
];

export function CollaborationHighlights() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % HIGHLIGHTS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const h = HIGHLIGHTS[active];

  return (
    <div className="relative mx-auto max-w-2xl text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50 text-sky-600 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-sky-400">
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
          {h.icon}
        </svg>
      </div>

      <div className="flex min-h-[140px] items-center justify-center px-2">
        <p
          key={active}
          className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300 animate-[fadeUp_0.5s_ease-out] sm:text-lg"
        >
          {h.body}
        </p>
      </div>

      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">{h.domain}</p>

      <div className="mt-6 flex justify-center gap-2">
        {HIGHLIGHTS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? "w-6 bg-sky-500" : "w-2 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            }`}
            aria-label={`Highlight ${i + 1}: ${HIGHLIGHTS[i].domain}`}
          />
        ))}
      </div>
    </div>
  );
}
