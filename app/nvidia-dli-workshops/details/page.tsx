import type { Metadata } from "next";
import Link from "next/link";
import { ChatWidget } from "@/app/components/ChatWidget";
import { NavBar } from "@/app/components/NavBar";
import { ScheduleButton } from "@/app/components/ScheduleButton";
import { SiteFooter } from "@/app/components/SiteFooter";
import { DLI } from "@/lib/dli";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("nvidiaDliDetails", DLI.overview.detailsPath);

const sections = "scroll-mt-28 border-t border-zinc-200 py-10 dark:border-zinc-800";
const copy = "mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400";

export default function WorkshopDetailsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "NVIDIA DLI workshops", path: "/nvidia-dli-workshops" },
        { name: "Workshop details", path: DLI.overview.detailsPath },
      ]) }) }} />
      <NavBar />
      <main className="page-wrap max-w-3xl!">
        <Link href="/nvidia-dli-workshops" className="quiet-link text-zinc-500">← Workshop overview</Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">The details</h1>
        <p className="mb-12 mt-5 text-lg text-zinc-600 dark:text-zinc-400">{DLI.workshop.title}</p>
        <section id="delivery" className={sections}>
          <h2 className="text-2xl font-semibold tracking-tight">Delivery</h2>
          <p className={copy}>{DLI.logistics}</p>
          <dl className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
            <div><dt className="font-medium">Duration</dt><dd className="mt-2 text-zinc-500 dark:text-zinc-400">{DLI.workshop.length}</dd></div>
            <div><dt className="font-medium">Your setup</dt><dd className="mt-2 text-zinc-500 dark:text-zinc-400">{DLI.overview.labs}. No local GPUs needed.</dd></div>
          </dl>
          <p className={copy}>{DLI.boundary}</p>
        </section>
        <section id="pricing" className={sections}>
          <h2 className="text-2xl font-semibold tracking-tight">Nexus pricing</h2>
          <p className="mt-5 text-4xl font-semibold tracking-tight">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: DLI.pricing.currency, maximumFractionDigits: 0 }).format(DLI.pricing.seatPrice)}
            <span className="ml-2 text-base font-normal text-zinc-500">per seat</span>
          </p>
          <p className={copy}>{DLI.pricing.summary}</p>
        </section>
        <section className={sections}>
          <h2 className="text-2xl font-semibold tracking-tight">Before you join</h2>
          <p className={copy}>{DLI.prerequisites}</p>
          <a href={DLI.workshop.courseUrl} target="_blank" rel="noopener noreferrer" className="quiet-link mt-3">NVIDIA course requirements <span aria-hidden>↗</span></a>
        </section>
        <section className={sections}>
          <h2 className="mb-5 text-2xl font-semibold tracking-tight">What you’ll cover</h2>
          {DLI.outline.map((module) => (
            <details key={module.title} className="group border-b border-zinc-200 dark:border-zinc-800">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-medium [&::-webkit-details-marker]:hidden">
                {module.title}<span aria-hidden className="text-xl font-normal text-zinc-400 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-6 pr-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{module.text}</p>
            </details>
          ))}
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">{DLI.tools.join(" · ")}</p>
          <a href={DLI.workshop.courseUrl} target="_blank" rel="noopener noreferrer" className="quiet-link mt-4">Full course and assessment details <span aria-hidden>↗</span></a>
        </section>
        <div className="flex flex-wrap items-center gap-7 pt-4">
          <Link href="/contact" className="btn-primary">Contact our team</Link>
          <ScheduleButton variant="secondary">Ask our AI</ScheduleButton>
          <a href={DLI.catalogUrl} target="_blank" rel="noopener noreferrer" className="quiet-link">Browse NVIDIA training <span aria-hidden>↗</span></a>
        </div>
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
