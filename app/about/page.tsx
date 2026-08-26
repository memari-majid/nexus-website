import type { Metadata } from "next";
import Link from "next/link";
import { BioCategories } from "@/app/components/BioCategories";
import { ChatWidget } from "@/app/components/ChatWidget";
import { JsonLd } from "@/app/components/JsonLd";
import { NavBar } from "@/app/components/NavBar";
import { MAJID } from "@/lib/majid";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Majid Memari, Ph.D. — Founder",
  description:
    "Dr. Majid Memari is the founder of Nexus AI Solutions LLC. He works with organizations as an AI consultant and trains teams through workshops. Assistant Professor of Computer Science at Utah Valley University and NVIDIA University Ambassador. He was selected for the 2026 AI Utah 100.",
  keywords: ["Majid Memari", "Nexus AI Solutions", "Utah Valley University", "Principal AI Architect"],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Majid Memari — Founder of Nexus AI Solutions",
    description:
      "Founder and Principal AI Architect of Nexus AI Solutions LLC. Assistant Professor of Computer Science at UVU.",
    url: "/about",
    type: "profile",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <JsonLd page="/about" />
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Founder</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Majid Memari, Ph.D.
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {MAJID.roles.nexus}. {MAJID.shortBio} He was{" "}
          <a
            className="text-sky-600 underline dark:text-sky-400"
            href={MAJID.aiUtah100.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            selected for the 2026 AI Utah 100
          </a>
          .
        </p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Academia · Industry · Community
        </p>

        <article className="mt-10">
          <BioCategories />
          <p className="mt-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {MAJID.fullName} founded {SITE.name} as the industry vehicle for that consulting and
            training work. Academic and research detail also lives at{" "}
            <a className="text-sky-600 underline dark:text-sky-400" href={MAJID.personalSite}>
              majidmemari.com
            </a>
            .
          </p>
        </article>

        <ul className="mt-10 space-y-2 text-sm">
          <li>
            <a className="text-sky-600 underline dark:text-sky-400" href={MAJID.personalSite} rel="me">
              majidmemari.com
            </a>
          </li>
          <li>
            <a className="text-sky-600 underline dark:text-sky-400" href={MAJID.linkedin} rel="me">
              LinkedIn
            </a>
          </li>
          <li>
            <a className="text-sky-600 underline dark:text-sky-400" href={MAJID.scholar} rel="me">
              Google Scholar
            </a>
          </li>
          <li>
            <a className="text-sky-600 underline dark:text-sky-400" href={MAJID.orcid} rel="me">
              ORCID
            </a>
          </li>
          <li>
            <Link className="text-sky-600 underline dark:text-sky-400" href="/#contact">
              Contact Nexus
            </Link>
          </li>
        </ul>
      </main>
      <ChatWidget />
    </div>
  );
}
