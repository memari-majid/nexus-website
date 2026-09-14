import { AcademicWorkshopAnnouncement } from "@/app/components/AcademicWorkshopAnnouncement";
import type { Metadata } from "next";
import Link from "next/link";
import { PhotoGallery } from "@/app/components/PhotoGallery";
import { Avatar } from "@/app/components/Avatar";
import { ChatWidget } from "@/app/components/ChatWidget";
import { NavBar } from "@/app/components/NavBar";
import { NvidiaLogo } from "@/app/components/NvidiaLogo";
import { SiteFooter } from "@/app/components/SiteFooter";
import { DLI } from "@/lib/dli";
import { MAJID } from "@/lib/majid";
import { breadcrumbJsonLd, dliCourseJsonLd, founderJsonLd, organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { SITE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata("nvidiaDli", "/nvidia-dli-workshops");

export default function NvidiaDliPage() {
  const url = `${SITE_URL}/nvidia-dli-workshops`;
  const graph = [
    organizationJsonLd(), founderJsonLd(), websiteJsonLd(), dliCourseJsonLd(),
    { "@type": "WebPage", "@id": `${url}#page`, url, name: `${DLI.overview.eyebrow} | ${SITE.name}`, isPartOf: { "@id": `${SITE_URL}/#website` }, inLanguage: "en-US" },
    breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "NVIDIA DLI workshops", path: "/nvidia-dli-workshops" }]),
  ];

  return (
    <div className="min-h-screen min-w-0 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }} />
      <NavBar />
      <main className="page-wrap">
        <header className="mx-auto max-w-4xl pb-20 text-center sm:pb-28">
          <div className="flex items-center justify-center gap-2.5">
            <NvidiaLogo className="nvidia-mark h-6 w-6" />
            <p className="eyebrow">{DLI.overview.eyebrow}</p>
          </div>
          <h1 className="display-title mt-7">{DLI.overview.headline}</h1>
          <p className="mx-auto mt-7 max-w-xl text-xl leading-snug text-zinc-600 dark:text-zinc-400 sm:text-2xl">{DLI.workshop.title}</p>
          <ul aria-label="Workshop at a glance" className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            {[DLI.overview.duration, DLI.overview.format, DLI.overview.delivery].map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">{DLI.overview.audience}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            <Link href="/contact" className="btn-primary">Contact our team</Link>
            <Link href={DLI.overview.detailsPath} className="quiet-link">Explore the details <span aria-hidden>→</span></Link>
          </div>
        </header>
        <section aria-label="What you will explore" className="rounded-[2rem] bg-white px-6 py-12 dark:bg-zinc-900/60 sm:px-12 sm:py-16">
          <div className="grid gap-8 text-center sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-zinc-200 sm:dark:divide-zinc-800">
            {DLI.overview.topics.map((topic) => <h2 key={topic} className="text-3xl font-semibold tracking-tight sm:text-4xl">{topic}</h2>)}
          </div>
          <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-400">{DLI.overview.labs}</p>
        </section>
        <AcademicWorkshopAnnouncement />
        <section id="workshop-photos" aria-labelledby="workshop-photos-heading" className="mt-20 sm:mt-24">
          <div className="mb-8 text-center">
            <h2 id="workshop-photos-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">{DLI.gallery.headline}</h2>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{DLI.gallery.caption}</p>
          </div>
          <figure className="mx-auto mb-10 max-w-2xl text-center">
            <blockquote className="text-xl leading-relaxed tracking-tight sm:text-2xl">“{DLI.gallery.feedback.quote}”</blockquote>
            <figcaption className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {DLI.gallery.feedback.author}<br />
              <a href={DLI.gallery.feedback.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{DLI.gallery.feedback.context} <span aria-hidden>↗</span></a>
            </figcaption>
          </figure>
          <PhotoGallery photos={DLI.gallery.photos} />
        </section>
        <section aria-label="Your instructor" className="mx-auto mt-20 flex max-w-3xl flex-col items-center gap-7 text-center sm:mt-24 sm:flex-row sm:text-left">
          <Avatar photo={MAJID.photo} initials="MM" name={MAJID.fullName} role={MAJID.companyRole} size={96} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Your instructor</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{MAJID.fullName}</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{DLI.credential}</p>
          </div>
          <div className="flex gap-5 sm:flex-col sm:gap-0">
            <Link href="/about/majid-memari" className="quiet-link">Meet {MAJID.name.split(" ")[0]} <span aria-hidden>→</span></Link>
            <a href={DLI.instructorDirectory} target="_blank" rel="me noopener noreferrer" className="quiet-link">View credential <span aria-hidden>↗</span></a>
          </div>
        </section>
        <section aria-label="Explore workshop details" className="mt-20 border-t border-zinc-200 pt-10 dark:border-zinc-800 sm:mt-24">
          <div className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-2">
            <a href={DLI.workshop.courseUrl} target="_blank" rel="noopener noreferrer" className="quiet-link">Course outline <span aria-hidden>↗</span></a>
            <Link href={`${DLI.overview.detailsPath}#pricing`} className="quiet-link">Pricing <span aria-hidden>→</span></Link>
            <a href={DLI.catalogUrl} target="_blank" rel="noopener noreferrer" className="quiet-link">NVIDIA catalog <span aria-hidden>↗</span></a>
          </div>
        </section>
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
