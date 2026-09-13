import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/app/components/Avatar";
import { NvidiaBadge } from "@/app/components/NvidiaBadge";
import { NvidiaLogo, TRADEMARK_SHORT } from "@/app/components/NvidiaLogo";
import { Reveal } from "@/app/components/Reveal";
import { ScheduleButton } from "@/app/components/ScheduleButton";
import { ScrollToTop } from "@/app/components/ScrollToTop";
import { DLI } from "@/lib/dli";
import { SITE } from "@/lib/site";
import { TEAM } from "@/lib/team";
import { CUSTOM_TRAINING } from "@/lib/training";

const FOOTER_LINKS = [
  { label: "Consulting", href: "/#consulting" },
  { label: "Training", href: "/nvidia-dli-workshops" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "How Dr. MJ works", href: "/how-it-works" },
];

/** Consulting is the lead offer; training and FDE follow from it. */
const OFFERINGS = [
  {
    title: "Consult",
    text: "We scope where AI actually helps, and where it does not, then shape a plan you can act on.",
  },
  {
    title: "Train",
    text: "The right NVIDIA Gen AI workshop taught in person, or customized Gen AI training built for your team.",
  },
  {
    title: "Build",
    text: "A Forward Deployed Engineer embeds with your team to build and ship the solution with you.",
  },
];

/** Shared section shell: eyebrow, headline, one supporting line. */
function Section({
  id,
  eyebrow,
  title,
  children,
  tinted = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  tinted?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 border-t border-zinc-200/70 px-6 py-32 dark:border-zinc-800/50 sm:py-40 ${
        tinted ? "bg-white dark:bg-zinc-950" : ""
      }`}
    >
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{eyebrow}</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            {title}
          </h2>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

export function HomePageContent() {
  const year = new Date().getFullYear();

  return (
    <>
      <section
        id="top"
        className="relative flex min-h-[88vh] items-center justify-center overflow-hidden px-6 pb-24 pt-[calc(6rem+env(safe-area-inset-top))]"
      >
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/nexus-banner.png"
            alt=""
            fill
            className="object-cover object-center opacity-20 dark:opacity-25"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-50/80 via-zinc-50/90 to-zinc-50 dark:from-zinc-950/50 dark:via-zinc-950/80 dark:to-zinc-950" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="flex justify-center">
              <NvidiaBadge variant="outline" />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-8 text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-7xl sm:leading-[1.05]">
              AI consulting and training,{" "}
              <span className="gradient-text">across the United States</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-8 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
              We specialize in generative AI. We work with companies across the US, in person
              at your offices or online. Based in Utah, we start with what your team actually
              needs, then deliver the right NVIDIA Gen AI training or embed an engineer to
              build it with you.
            </p>
          </Reveal>
          <Reveal delay={220}>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <ScheduleButton>Start a conversation</ScheduleButton>
              <Link href="/nvidia-dli-workshops" className="btn-secondary">
                See the training
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Section id="consulting" eyebrow="Consulting" title="Start with what you actually need">
        <Reveal delay={80}>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            What to adopt, what to skip, and where AI truly fits the work you already do.
            Straight guidance from people who build LLM and agent systems for a living.
          </p>
        </Reveal>
        <div className="mt-14 grid gap-6 text-left sm:grid-cols-3">
          {OFFERINGS.map((o, i) => (
            <Reveal key={o.title} delay={100 + i * 60}>
              <div className="h-full rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-400">
                  {o.title}
                </p>
                <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">{o.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={280}>
          <div className="mt-12 flex justify-center">
            <ScheduleButton>Start a conversation</ScheduleButton>
          </div>
        </Reveal>
      </Section>

      <section
        id="training"
        className="scroll-mt-24 border-t border-zinc-200/70 bg-white px-6 py-32 dark:border-zinc-800/50 dark:bg-zinc-950 sm:py-40"
      >
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Training</p>
            <NvidiaLogo className="mx-auto mt-6 h-9 w-9 text-[#76b900]" />
            <h2 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
              Official NVIDIA DLI workshops
            </h2>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
              {DLI.audiences}
            </p>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-14 border-t border-zinc-200 pt-10 text-left dark:border-zinc-800">
              <span className="inline-flex items-center rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
                {DLI.workshop.status}
              </span>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {DLI.workshop.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{DLI.workshop.length}</p>
              <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
                {DLI.workshop.summary}
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mt-10 border-t border-zinc-200 pt-10 text-left dark:border-zinc-800">
              <p className="text-base text-zinc-600 dark:text-zinc-400">{DLI.model}</p>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
                <Link
                  href="/nvidia-dli-workshops"
                  className="text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
                >
                  How delivery works
                </Link>
              </p>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="mt-10 border-t border-zinc-200 pt-10 text-left dark:border-zinc-800">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                {DLI.industry.role}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {DLI.industry.heading}
              </h3>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                {DLI.industry.text}
              </p>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-10 border-t border-zinc-200 pt-10 text-left dark:border-zinc-800">
              <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {CUSTOM_TRAINING.title}
              </h3>
              <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
                {CUSTOM_TRAINING.summary}
              </p>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <ScheduleButton>Start a conversation</ScheduleButton>
              <Link href="/nvidia-dli-workshops" className="btn-secondary">
                Details
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <Section id="about" eyebrow="Team" title="The people">
        <div className="mt-16 grid gap-12 sm:grid-cols-3">
          {TEAM.map((person, i) => (
            <Reveal key={person.key} delay={60 + i * 60}>
              <div className="flex flex-col items-center">
                <Avatar
                  photo={person.photo}
                  initials={person.initials}
                  name={person.name}
                  role={person.role}
                  size={132}
                />
                <p className="mt-6 text-base font-medium text-zinc-900 dark:text-zinc-50">
                  {person.name}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{person.role}</p>
                <Link
                  href={`/about/${person.slug}`}
                  className="mt-3 text-sm text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
                >
                  Bio
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <footer className="border-t border-zinc-200/70 px-6 py-16 dark:border-zinc-800/50">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-zinc-500"
          >
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <NvidiaBadge variant="quiet" />
          <address className="text-sm not-italic text-zinc-500">{SITE.addressDisplay}</address>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            © {year} {SITE.name} · {TRADEMARK_SHORT}
          </p>
        </div>
      </footer>
      <ScrollToTop />
    </>
  );
}
