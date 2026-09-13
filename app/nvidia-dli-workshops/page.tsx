import type { Metadata } from "next";
import Link from "next/link";
import { ChatWidget } from "@/app/components/ChatWidget";
import { NavBar } from "@/app/components/NavBar";
import { NvidiaLogo, TRADEMARK_SHORT } from "@/app/components/NvidiaLogo";
import { ScheduleButton } from "@/app/components/ScheduleButton";
import { DLI } from "@/lib/dli";
import { MAJID } from "@/lib/majid";
import {
  breadcrumbJsonLd,
  dliCourseJsonLd,
  organizationJsonLd,
  pageMetadata,
  websiteJsonLd,
} from "@/lib/seo";
import { SITE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata("nvidiaDli", "/nvidia-dli-workshops");

const url = `${SITE_URL}/nvidia-dli-workshops`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function NvidiaDliPage() {
  const graph = [
    organizationJsonLd(),
    websiteJsonLd(),
    dliCourseJsonLd(),
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: `NVIDIA DLI Generative AI Workshops — ${SITE.name}`,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: "en-US",
    },
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "NVIDIA DLI workshops", path: "/nvidia-dli-workshops" },
    ]),
  ];

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
        }}
      />
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <div className="flex items-center gap-3">
          <NvidiaLogo className="h-7 w-7 text-[#76b900]" />
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Training</p>
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          NVIDIA Deep Learning Institute generative AI workshops
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Official{" "}
          <a
            className="text-brand-700 underline dark:text-brand-400"
            href={DLI.catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            NVIDIA Deep Learning Institute
          </a>{" "}
          workshops for industry teams, hosted by a{" "}
          <a
            className="text-brand-700 underline dark:text-brand-400"
            href={DLI.instructorProgramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Certified Instructor
          </a>
          . Nexus hosts, teaches, and invoices at $500 per seat.
        </p>

        <Section title="The workshop">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{DLI.workshop.status}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <a
              className="underline decoration-zinc-300 underline-offset-4 dark:decoration-zinc-600"
              href={DLI.workshop.courseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DLI.workshop.title}
            </a>
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{DLI.workshop.length}</p>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {DLI.workshop.summary}
          </p>
          <ul className="mt-6 space-y-4">
            {DLI.outline.map((module) => (
              <li key={module.title}>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {module.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {module.text}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-500">
            Tools and frameworks: {DLI.tools.join(", ")}.
          </p>
        </Section>

        <Section title="How delivery works">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{DLI.model}</p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {[DLI.nvidiaProvides, DLI.weProvide].map((group) => (
              <div key={group.heading}>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {group.heading}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="text-zinc-400 dark:text-zinc-600">
                        —
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
            {DLI.boundary}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
            {DLI.logistics}
          </p>
        </Section>

        <Section title={DLI.industry.heading}>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            {DLI.industry.role}
          </p>
          <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {DLI.industry.text} Engineering and data teams get a full day of hands-on practice
            on NVIDIA&apos;s GPU cloud. Nexus handles enrollment and invoices at $500 per seat, up to 20; larger groups get a tailored quote.
          </p>
          <div className="mt-6">
            <ScheduleButton>Ask Dr. MJ about it</ScheduleButton>
          </div>
        </Section>

        <Section title="Who it is for">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {DLI.audiences}
          </p>
        </Section>

        <Section title="NVIDIA Gen AI workshops we can deliver">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {DLI.alwaysNew}
          </p>
          <ul className="mt-8 space-y-6">
            {DLI.catalog.map((c) => (
              <li key={c.key}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:text-brand-700 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:text-brand-400"
                  >
                    {c.title}
                  </a>
                  {"hosted" in c && c.hosted ? (
                    <span className="inline-flex items-center rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
                      We teach this
                    </span>
                  ) : (
                    <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-600">
                      {c.track}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {c.blurb}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
            {DLI.catalogNote}
          </p>
        </Section>

        <Section title="The instructor">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {MAJID.fullName} — {MAJID.roles.nexus} — is an {DLI.instructorTitle}.{" "}
            {MAJID.teachingBackground}
          </p>
          <p className="mt-4 text-sm">
            <a
              className="text-brand-700 underline dark:text-brand-400"
              href={DLI.instructorDirectory}
              target="_blank"
              rel="me noopener noreferrer"
            >
              NVIDIA Certified Instructor Directory
            </a>
            {" · "}
            <Link className="text-brand-700 underline dark:text-brand-400" href="/about/majid-memari">
              Full bio
            </Link>
          </p>
        </Section>

        <section
          aria-label="NVIDIA resources"
          className="mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800"
        >
          <div className="grid gap-8 sm:grid-cols-2">
            {DLI.referenceGroups.map((group) => (
              <div key={group.heading}>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {group.heading}
                </p>
                <ul className="mt-3 space-y-2">
                  {group.links.map((ref) => (
                    <li key={ref.href}>
                      <a
                        href={ref.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-700 dark:hover:text-zinc-100"
                      >
                        {ref.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ScheduleButton>Start a conversation</ScheduleButton>
          <Link
            href="/#training"
            className="text-sm text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
          >
            All training
          </Link>
        </div>

        <p className="mt-14 border-t border-zinc-200 pt-8 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
          {TRADEMARK_SHORT}
        </p>
      </main>
      <ChatWidget />
    </div>
  );
}
