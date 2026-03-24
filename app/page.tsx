"use client";

import { useState, useEffect, useRef } from "react";

/* ───────────────── data ───────────────── */

const SERVICES = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 0 1-1.591.659H9.061a2.25 2.25 0 0 1-1.591-.659L5 14.5m14 0V17a2.25 2.25 0 0 1-2.25 2.25H7.25A2.25 2.25 0 0 1 5 17v-2.5" />
      </svg>
    ),
    title: "Strategic Technology Planning",
    description:
      "Align your IT infrastructure with business goals. We assess your current systems, identify gaps, and build a technology roadmap that drives growth.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
    title: "System Integration",
    description:
      "Connect disparate systems into a unified workflow. From API design to data migration, we make your tools work together seamlessly.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7" />
      </svg>
    ),
    title: "Infrastructure Modernization",
    description:
      "Upgrade legacy systems to modern, scalable architectures. We help you adopt cloud-native, containerized, and serverless solutions.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0 0 12 2.714Z" />
      </svg>
    ),
    title: "Cybersecurity Assessment",
    description:
      "Identify vulnerabilities before they become breaches. We conduct penetration testing, policy audits, and implement security best practices.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
      </svg>
    ),
    title: "Cloud Migration",
    description:
      "Move to the cloud with confidence. We plan, execute, and optimize your migration to AWS, Azure, or Google Cloud with zero downtime.",
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    title: "Technical Support & Training",
    description:
      "Ongoing IT support tailored to your team. From helpdesk services to staff training on new technologies, we keep your operations running.",
  },
];

const NAV_ITEMS = [
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

/* ───────────── scroll-reveal hook ───────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ───────────────── page ───────────────── */

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ════════ NAV ════════ */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60 shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <a href="#top" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nexus-logo.png" alt="Nexus AI Solutions" className="h-9 w-9 rounded-lg object-contain object-center" />
            <span className="text-lg font-semibold tracking-tight">
              Nexus<span className="text-sky-400"> AI</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-8">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              Get in Touch
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="sm:hidden rounded-md border border-zinc-700 p-2 text-zinc-400"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur-md px-6 pb-4 pt-2 space-y-3">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm text-zinc-400 hover:text-zinc-100 transition-colors py-1"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg bg-sky-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-sky-500"
            >
              Get in Touch
            </a>
          </div>
        )}
      </nav>

      {/* ════════ HERO ════════ */}
      <section
        id="top"
        className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6"
      >
        {/* Banner background */}
        <div className="pointer-events-none absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nexus-banner.png" alt="" className="h-full w-full object-cover object-center opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/60 via-zinc-950/80 to-zinc-950" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="mb-4 inline-block rounded-full border border-sky-800/40 bg-sky-950/30 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-sky-400">
              Nexus AI Solutions LLC
            </p>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              IT Consulting &<br />
              <span className="text-sky-400">Digital Services</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 leading-relaxed">
              AI-powered IT consulting led by an NVIDIA Ambassador &amp; Principal AI Architect.
              We turn advanced AI concepts into practical, real-world solutions for your business.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#contact"
                className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500 hover:shadow-sky-800/40"
              >
                Get in Touch
              </a>
              <a
                href="#services"
                className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                Our Services ↓
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ SERVICES ════════ */}
      <section id="services" className="scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">
              What We Do
            </p>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              IT Consulting Services
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
              End-to-end technology consulting to help your business stay ahead.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((svc, i) => (
              <Reveal key={svc.title} delay={i * 80}>
                <div className="group rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition hover:border-sky-800/50 hover:bg-zinc-900/70">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-950/40 text-sky-400 transition group-hover:bg-sky-900/40">
                    {svc.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    {svc.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {svc.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ ABOUT ════════ */}
      <section
        id="about"
        className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24"
      >
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">
              About Us
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Technology Expertise, Academic Rigor
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <Reveal delay={100}>
              <div className="space-y-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/majid-memari.png"
                  alt="Dr. Majid Memari"
                  className="mx-auto h-40 w-40 rounded-full object-cover object-top border-2 border-sky-600/40 shadow-lg shadow-sky-900/20"
                />
              <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                <p>
                  <strong className="text-zinc-200">Nexus AI Solutions LLC</strong> is
                  a Utah-based IT &amp; AI consulting firm founded by{" "}
                  <strong className="text-zinc-200">Dr. Majid Memari</strong> —
                  NVIDIA Ambassador, Assistant Professor at Utah Valley
                  University, and Principal AI Architect at the Gary R. Herbert
                  Institute for Public Policy.
                </p>
                <p>
                  Dr. Memari holds a Ph.D. in Computer Science from Southern
                  Illinois University and brings 10+ years of expertise in
                  AI/ML, LLMs, data systems, and software architecture. He
                  serves as an AI Consultant for the University of Utah&apos;s
                  One-U Responsible AI Initiative and is a certified NVIDIA Deep
                  Learning Institute instructor.
                </p>
                <p>
                  Prior collaborations include Stanford, Johns Hopkins, UPenn,
                  and state agencies including Utah&apos;s Office of Data Privacy
                  and Department of Health &amp; Human Services.
                </p>
              </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">Ph.D.</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Computer Science — Southern Illinois University
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">NVIDIA</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Ambassador &amp; DLI Certified Instructor
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">10+</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Years in AI, ML &amp; software engineering
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">Utah</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Based in Salt Lake City — serving clients nationwide
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════ CONTACT ════════ */}
      <section
        id="contact"
        className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24"
      >
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">
              Get in Touch
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Let&apos;s Work Together
            </h2>
            <p className="mt-4 max-w-lg text-zinc-500">
              Have a project in mind or need IT consulting? Reach out and
              we&apos;ll get back to you promptly.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={80}>
              <a
                href="mailto:memari.majid@hotmail.com"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg
                  className="h-8 w-8 text-sky-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                <p className="text-sm font-medium text-zinc-200">Email</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">
                  memari.majid@hotmail.com
                </p>
              </a>
            </Reveal>

            <Reveal delay={120}>
              <a
                href="tel:+18018109152"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg
                  className="h-8 w-8 text-sky-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                <p className="text-sm font-medium text-zinc-200">Phone</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">
                  (801) 810-9152
                </p>
              </a>
            </Reveal>

            <Reveal delay={160}>
              <a
                href="https://www.linkedin.com/in/majid-memari"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg
                  className="h-8 w-8 text-sky-400 mb-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <p className="text-sm font-medium text-zinc-200">LinkedIn</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">
                  majid-memari
                </p>
              </a>
            </Reveal>

            <Reveal delay={200}>
              <a
                href="https://github.com/memari-majid"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg
                  className="h-8 w-8 text-sky-400 mb-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <p className="text-sm font-medium text-zinc-200">GitHub</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">
                  memari-majid
                </p>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="border-t border-zinc-800/40 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nexus-logo.png" alt="Nexus AI Solutions" className="h-7 w-7 rounded-md object-contain object-center" />
            <span className="text-sm font-medium">
              Nexus<span className="text-sky-400"> AI</span> Solutions LLC
            </span>
          </div>
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} Nexus AI Solutions LLC · Sandy, Utah ·
            Registered in the State of Utah
          </p>
        </div>
      </footer>
    </div>
  );
}
