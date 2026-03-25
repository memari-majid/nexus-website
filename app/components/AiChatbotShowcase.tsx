import type { ReactNode } from "react";
import Link from "next/link";

type Bot = {
  title: string;
  subtitle: string;
  description: string;
  url: string | undefined;
  icon: ReactNode;
};

function ExternalIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5M16.5 3h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function AiChatbotShowcase() {
  const cpaUrl = process.env.NEXT_PUBLIC_AI_CPA_URL?.trim();
  const taUrl = process.env.NEXT_PUBLIC_AI_TA_URL?.trim();

  const bots: Bot[] = [
    {
      title: "AI Financial Assistant",
      subtitle: "Finance & bookkeeping",
      description:
        "Conversational assistant for bookkeeping, organized records, and finance workflows—full product experience with companies, ledger, and documents. Not a replacement for licensed professionals where required.",
      url: cpaUrl,
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ),
    },
    {
      title: "AI teaching assistant",
      subtitle: "CS 4720R course",
      description:
        "Course-grounded Q&A for AI Business and Tech Solutions—Canvas-aligned context and a dedicated assistant, not a generic chat window.",
      url: taUrl,
      icon: (
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-14 grid gap-6 lg:grid-cols-2">
      {bots.map((b) => {
        const hasUrl = Boolean(b.url);
        return (
          <div
            key={b.title}
            className="card p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100/80 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                {b.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {b.subtitle}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">{b.description}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {hasUrl ? (
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-500 hover:scale-[1.02] dark:shadow-sky-900/30"
                >
                  Open app
                  <ExternalIcon />
                </a>
              ) : (
                <Link
                  href="#contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100/80 px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:border-sky-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-100 dark:hover:border-sky-600"
                >
                  Request access
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
