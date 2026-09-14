import { StudentFeedback } from "@/app/components/StudentFeedback";
import type { Metadata } from "next";
import Link from "next/link";
import { TeamCard } from "@/app/components/TeamCard";
import { ChatWidget } from "@/app/components/ChatWidget";
import { JsonLd } from "@/app/components/JsonLd";
import { NavBar } from "@/app/components/NavBar";
import { SiteFooter } from "@/app/components/SiteFooter";
import { UNIVERSITY_COLLABORATIONS } from "@/lib/collaborations";
import { PEOPLE } from "@/lib/people";
import { SITE } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("about", "/about", "profile");

export default function AboutPage() {
  return (
    <div className="min-h-screen min-w-0 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <JsonLd page="/about" />
      <NavBar />
      <main className="page-wrap">
        <header className="text-center">
          <p className="eyebrow">The team</p>
          <h1 className="display-title mt-6">{SITE.team.headline}</h1>
          <p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400">{SITE.team.summary}</p>
        </header>
        <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2">
          {PEOPLE.map((person) => <TeamCard key={person.slug} person={person} />)}
        </div>
        <StudentFeedback />
        <details className="group mx-auto mt-16 max-w-3xl border-t border-zinc-200 dark:border-zinc-800">
          <summary className="flex cursor-pointer list-none items-center justify-between py-7 text-lg font-medium [&::-webkit-details-marker]:hidden">
            {UNIVERSITY_COLLABORATIONS.heading}<span aria-hidden className="text-2xl font-normal text-zinc-400 group-open:rotate-45">+</span>
          </summary>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{UNIVERSITY_COLLABORATIONS.summary}</p>
          <ul className="mt-5 space-y-4 text-sm">
            {UNIVERSITY_COLLABORATIONS.items.map((item) => <li key={item.name}><strong className="font-medium">{item.name}</strong><p className="mt-1 text-zinc-500 dark:text-zinc-400">{item.text}</p></li>)}
          </ul>
          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">{UNIVERSITY_COLLABORATIONS.note}</p>
        </details>
        <p className="mt-10 text-center"><Link href="/contact" className="quiet-link">Contact our team <span aria-hidden>→</span></Link></p>
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
