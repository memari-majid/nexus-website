import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/app/components/Avatar";
import { ChatWidget } from "@/app/components/ChatWidget";
import { JsonLd } from "@/app/components/JsonLd";
import { NavBar } from "@/app/components/NavBar";
import { NvidiaBadge, NvidiaTrademark } from "@/app/components/NvidiaBadge";
import { UNIVERSITY_COLLABORATIONS } from "@/lib/collaborations";
import { PEOPLE } from "@/lib/people";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata("about", "/about", "profile");

export default function AboutPage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <JsonLd page="/about" />
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">About</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          The people behind {SITE.name}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          AI consulting and training — advisory, workshops, and in-house sessions.
        </p>
        <div className="mt-6">
          <NvidiaBadge />
        </div>

        <div className="mt-14 space-y-10">
          {PEOPLE.map((person) => (
            <Link
              key={person.slug}
              href={`/about/${person.slug}`}
              className="flex flex-col gap-5 border-t border-zinc-200 pt-10 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:gap-8 dark:border-zinc-800"
            >
              <Avatar
                photo={person.photo}
                initials={person.initials}
                name={person.displayName}
                role={person.role}
                size={112}
              />
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {person.displayName}
                </h2>
                <p className="mt-1 text-base font-medium text-zinc-800 dark:text-zinc-200">
                  {person.role}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {person.summary}
                </p>
                <p className="mt-3 text-sm text-sky-600 dark:text-sky-400">Read bio →</p>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {UNIVERSITY_COLLABORATIONS.heading}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {UNIVERSITY_COLLABORATIONS.summary}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            {UNIVERSITY_COLLABORATIONS.items.map((item) => (
              <li key={item.name} className="flex gap-3">
                <span aria-hidden className="text-zinc-400 dark:text-zinc-600">
                  —
                </span>
                <span>
                  <strong className="font-medium text-zinc-800 dark:text-zinc-200">
                    {item.name}
                  </strong>{" "}
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
            {UNIVERSITY_COLLABORATIONS.note}
          </p>
        </section>

        <p className="mt-12 text-sm">
          <Link className="text-sky-600 underline dark:text-sky-400" href="/contact">
            Contact
          </Link>
        </p>

        <NvidiaTrademark className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800" />
      </main>
      <ChatWidget />
    </div>
  );
}
