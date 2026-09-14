import { AcademicWorkshopAnnouncement } from "@/app/components/AcademicWorkshopAnnouncement";
import Link from "next/link";
import { TeamCard } from "@/app/components/TeamCard";
import { NvidiaLogo } from "@/app/components/NvidiaLogo";
import { Reveal } from "@/app/components/Reveal";
import { ScheduleButton } from "@/app/components/ScheduleButton";
import { ScrollToTop } from "@/app/components/ScrollToTop";
import { SiteFooter } from "@/app/components/SiteFooter";
import { TryOurAi } from "@/app/components/demo/TryOurAi";
import { DLI } from "@/lib/dli";
import { MAJID } from "@/lib/majid";
import { SITE } from "@/lib/site";
import { PEOPLE } from "@/lib/people";
import { CUSTOM_TRAINING } from "@/lib/training";

export function HomePageContent() {
  return (
    <>
      <section id="top" className="flex min-h-[min(850px,90svh)] items-center justify-center px-6 pb-24 pt-[calc(8rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal><p className="eyebrow">{SITE.home.intro}</p></Reveal>
          <Reveal delay={80}>
            <h1 className="display-title mt-6">AI consulting<br /><span className="text-zinc-500 dark:text-zinc-400">and training</span></h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-8 text-base text-zinc-500 dark:text-zinc-400 sm:text-lg">{SITE.home.delivery}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <ScheduleButton>Ask our AI</ScheduleButton>
              <Link href="/contact" className="quiet-link">Contact our team <span aria-hidden>→</span></Link>
              <Link href="/nvidia-dli-workshops" className="quiet-link">Explore training <span aria-hidden>→</span></Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="consulting" className="scroll-mt-24 bg-white px-6 py-24 dark:bg-zinc-900/40 sm:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <p className="eyebrow">Consulting</p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{SITE.home.consultingTitle}</h2>
            <p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400">{SITE.home.consultingIntro}</p>
          </Reveal>
          <div className="mt-14 grid gap-9 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-zinc-200 sm:dark:divide-zinc-800">
            {SITE.home.offerings.map((offering) => (
              <Link key={offering.title} href={offering.href} className="group px-5">
                <h3 className="text-3xl font-semibold tracking-tight group-hover:text-sky-600 dark:group-hover:text-sky-400">{offering.title}<span aria-hidden className="ml-2 text-xl text-zinc-400">↗</span></h3>
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{offering.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="try-our-ai" className="scroll-mt-24 px-6 py-24 sm:py-32">
        <div className="mx-auto min-w-0 max-w-3xl">
          <Reveal>
            <div className="text-center">
              <h2 className="text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Try our AI</h2>
              <p className="mt-5 text-lg text-zinc-500 dark:text-zinc-400">What could AI do for your team?</p>
            </div>
          </Reveal>
          <div className="mt-10 min-w-0"><TryOurAi /></div>
          <p className="mt-5 text-center"><Link href="/ai-consultant" className="quiet-link">Open full chat <span aria-hidden>→</span></Link></p>
        </div>
      </section>

      <section id="training" className="scroll-mt-24 bg-white px-6 py-24 dark:bg-zinc-900/40 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-2.5"><NvidiaLogo className="nvidia-mark h-6 w-6" /><p className="eyebrow">{DLI.overview.eyebrow}</p></div>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{DLI.overview.headline}</h2>
            <p className="mx-auto mt-6 max-w-xl text-xl text-zinc-600 dark:text-zinc-400">{DLI.workshop.title}</p>
            <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">{DLI.overview.duration} · {DLI.overview.delivery}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
              <Link href="/nvidia-dli-workshops" className="btn-primary">Explore the workshop</Link>
              <Link href={DLI.overview.detailsPath} className="quiet-link">Details <span aria-hidden>→</span></Link>
            </div>
          </Reveal>
          <AcademicWorkshopAnnouncement compact />
          <div className="mx-auto mt-14 max-w-xl border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{CUSTOM_TRAINING.title} for your team</p>
            <Link href="/contact" className="quiet-link">Tell us what you need <span aria-hidden>→</span></Link>
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal><p className="eyebrow">The team</p><h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{SITE.team.headline}</h2><p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400">{SITE.team.summary}</p></Reveal>
          <div className="mt-14 grid gap-12 sm:grid-cols-2">
            {PEOPLE.map((person) => <TeamCard key={person.slug} person={person} compact />)}
          </div>
          <p className="mt-10"><Link href="/about#student-feedback" className="quiet-link">{MAJID.studentFeedback.headline} <span aria-hidden>→</span></Link></p>
        </div>
      </section>
      <SiteFooter />
      <ScrollToTop />
    </>
  );
}
