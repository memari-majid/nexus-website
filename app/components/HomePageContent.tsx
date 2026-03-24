import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AiInsightsTicker } from "@/app/components/AiInsightsTicker";
import { AiTryDemos } from "@/app/components/AiTryDemos";
import { ContactForm } from "@/app/components/ContactForm";
import { Reveal } from "@/app/components/Reveal";
import { IT_SERVICES } from "@/app/components/home/services-data";

const TRUSTED = ["Stanford", "Johns Hopkins", "UPenn", "Utah Office of Data Privacy", "Utah DHHS", "University of Utah"];

const AI_OFFERINGS = [
  {
    title: "LLM & RAG Systems",
    tagline: "Production-ready language models",
    description:
      "Retrieval-augmented generation, prompt engineering, and secure deployment of large language models for your applications and knowledge bases.",
    icon: "brain",
  },
  {
    title: "Agentic Automation",
    tagline: "Multi-agent workflows",
    description:
      "Orchestrate agents that reason, plan, and execute across tools—document pipelines, onboarding, compliance, and operations.",
    icon: "robot",
  },
  {
    title: "AI Strategy & MLOps",
    tagline: "From pilot to scale",
    description:
      "Roadmaps, governance, evaluation, and production ML pipelines—so your AI investments deliver measurable ROI.",
    icon: "chart",
  },
  {
    title: "NVIDIA DLI & Training",
    tagline: "Hands-on GPU education",
    description:
      "Workshops aligned with NVIDIA Deep Learning Institute (DLI) standards—delivered in person or virtually for your team.",
    icon: "gpu",
  },
];

const PROJECTS = [
  {
    title: "AI-Powered EdTech",
    tagline: "Smarter learning at scale",
    description:
      "Intelligent tutoring patterns, LLM-assisted grading workflows, adaptive learning paths, and analytics for institutions and training programs.",
    icon: "grad",
  },
  {
    title: "AI-Simulated Training",
    tagline: "Practice when the real thing is costly",
    description:
      "Immersive scenarios for firefighters, nursing, and high-stakes fields—dynamic AI-driven patients, incidents, and debriefs—safe, repeatable, and scalable.",
    icon: "shield",
  },
  {
    title: "Agentic Workflow Automation",
    tagline: "End-to-end intelligent ops",
    description:
      "Multi-agent systems that coordinate specialist models and tools to automate complex business processes with human oversight.",
    icon: "cog",
  },
  {
    title: "Custom AI Solutions",
    tagline: "Built for your domain",
    description:
      "Computer vision, forecasting, NLP for compliance, RAG over internal docs—if it needs AI, we design and ship it.",
    icon: "spark",
  },
];

const WORKSHOPS = [
  {
    title: "Fundamentals of Deep Learning",
    duration: "~8 hours (typical DLI workshop)",
    blurb: "Train neural networks for classification and detection with hands-on PyTorch labs on GPU-accelerated cloud instances.",
  },
  {
    title: "AI on Jetson / Edge",
    duration: "Hands-on lab",
    blurb: "Build and deploy edge AI prototypes—ideal for robotics and IoT-focused programs.",
  },
  {
    title: "RAG & LLM Agents",
    duration: "Applied GenAI",
    blurb: "Retrieval-augmented generation, prompt patterns, and safe deployment of LLM-powered assistants.",
  },
  {
    title: "Generative AI",
    duration: "Foundations",
    blurb: "Diffusion and generative fundamentals with practical exercises—aligned with industry demand.",
  },
];

function ProjectIcon({ kind }: { kind: string }) {
  const map: Record<string, ReactNode> = {
    grad: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
      </svg>
    ),
    shield: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0 0 12 2.714Z" />
      </svg>
    ),
    cog: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    spark: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
    brain: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.557 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    robot: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
      </svg>
    ),
    chart: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    gpu: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  };
  return <span className="text-sky-400">{map[kind] ?? map.spark}</span>;
}

export function HomePageContent() {
  const year = new Date().getFullYear();

  return (
    <>
      <section id="top" className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0">
          <Image
            src="/nexus-banner.png"
            alt=""
            fill
            className="object-cover object-center opacity-15"
            priority
            sizes="100vw"
          />
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
              AI-powered IT consulting led by an NVIDIA Ambassador &amp; Principal AI Architect. We turn advanced AI
              concepts into practical, real-world solutions for your business.
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

      <AiInsightsTicker />

      <section className="border-b border-zinc-800/40 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-zinc-500 mb-4">
              Collaborations & institutions
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {TRUSTED.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-zinc-800/80 bg-zinc-900/40 px-4 py-2 text-xs font-medium text-zinc-400"
                >
                  {name}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="services" className="scroll-mt-20 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">What We Do</p>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">IT Consulting Services</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
              End-to-end technology consulting to help your business stay ahead.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {IT_SERVICES.map((svc, i) => (
              <Reveal key={svc.title} delay={i * 80}>
                <div className="group rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition hover:border-sky-800/50 hover:bg-zinc-900/70">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-950/40 text-sky-400 transition group-hover:bg-sky-900/40">
                    {svc.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">{svc.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{svc.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="ai-services" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">AI & ML</p>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">AI & Machine Learning Services</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
              End-to-end AI delivery: models, data pipelines, evaluation, and deployment.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {AI_OFFERINGS.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="group rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition hover:border-sky-800/50 hover:bg-zinc-900/70">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-950/40">
                    <ProjectIcon kind={item.icon} />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">{item.title}</h3>
                  <p className="mt-1 text-sm font-medium text-sky-400">{item.tagline}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">Projects</p>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Where We Build</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
              Representative initiatives across education, simulation, automation, and custom AI.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {PROJECTS.map((p, i) => (
              <Reveal key={p.title} delay={i * 80}>
                <div className="group rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 transition hover:border-sky-800/50 hover:bg-zinc-900/70 hover:shadow-lg hover:shadow-sky-950/20">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-950/40 text-sky-400">
                    <ProjectIcon kind={p.icon} />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-100">{p.title}</h3>
                  <p className="mt-1 text-sm font-medium text-sky-400">{p.tagline}</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{p.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="try-ai" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">
              Interactive
            </p>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Try Our AI</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-500">
              Quick, privacy-conscious demos powered by the same stack we use for client work — see how we think about
              language understanding and summarization.
            </p>
          </Reveal>
          <AiTryDemos />
        </div>
      </section>

      <section id="workshops" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">
              NVIDIA Deep Learning Institute
            </p>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Free NVIDIA Deep Learning Workshops</h2>
            <p className="mx-auto mt-4 max-w-3xl text-center text-zinc-500">
              Dr. Memari is an NVIDIA DLI Certified Instructor and Ambassador. He delivers hands-on workshops aligned
              with{" "}
              <Link
                href="https://www.nvidia.com/en-us/training/"
                className="text-sky-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                NVIDIA Deep Learning Institute
              </Link>{" "}
              training—free for students at participating universities, with GPU-accelerated labs and certificates of
              completion where available.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKSHOPS.map((w, i) => (
              <Reveal key={w.title} delay={i * 60}>
                <div className="h-full rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <h3 className="text-sm font-semibold text-zinc-100">{w.title}</h3>
                  <p className="mt-1 text-xs text-sky-400">{w.duration}</p>
                  <p className="mt-2 text-xs text-zinc-500 leading-relaxed">{w.blurb}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-center text-xs text-zinc-500">
              <span className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">GPU cloud labs</span>
              <span className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">Industry tools & frameworks</span>
              <span className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">DLI-style completion</span>
              <span className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">Real-world use cases</span>
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
              <a
                href="#contact"
                className="rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500"
              >
                Invite Dr. Memari to Your Campus
              </a>
              <p className="text-xs text-zinc-600 max-w-md text-center">
                Available for universities worldwide. Student workshops are offered at no charge to students; logistics
                vary by institution.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="government" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">Public sector</p>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">AI for Government & Public Policy</h2>
            <p className="mx-auto mt-4 max-w-3xl text-center text-zinc-500">
              Dr. Memari is Principal AI Architect at the Gary R. Herbert Institute for Public Policy (Nov 2024 -- Present) and
              leads state-level collaborations with Utah agencies.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <Reveal delay={80}>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <h3 className="text-lg font-semibold text-sky-400">Utah Office of Data Privacy</h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  AI applied to data governance and privacy management—improving compliance efficiency and strengthening
                  transparency and public trust.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <h3 className="text-lg font-semibold text-sky-400">Utah Department of Health & Human Services</h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  AI-driven solutions that reduce manual review time and expand secure access to data for research and policy
                  innovation.
                </p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <h3 className="text-lg font-semibold text-sky-400">Privacy-preserving infrastructure</h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  Helping Utah build a modern, responsible data foundation that supports research while safeguarding
                  citizens.
                </p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6">
                <h3 className="text-lg font-semibold text-sky-400">Expanding across departments</h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                  We are building additional AI solutions for more Utah departments—intelligent automation and
                  data-driven decision-making at scale.
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={240}>
            <div className="mt-10 text-center">
              <a
                href="#contact"
                className="inline-flex rounded-xl border border-sky-800/50 bg-sky-950/30 px-6 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-900/40"
              >
                Bring AI to Your Agency
              </a>
              <p className="mt-2 text-xs text-zinc-600">
                We partner with agencies to deploy responsible, privacy-preserving AI solutions.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">About Us</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Technology Expertise, Academic Rigor</h2>
          </Reveal>

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <Reveal delay={100}>
              <div className="space-y-6">
                <div className="relative mx-auto h-40 w-40">
                  <Image
                    src="/majid-memari.png"
                    alt="Dr. Majid Memari"
                    fill
                    className="rounded-full object-cover object-top border-2 border-sky-600/40 shadow-lg shadow-sky-900/20"
                    sizes="160px"
                  />
                </div>
                <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
                  <p>
                    <strong className="text-zinc-200">Nexus AI Solutions LLC</strong> is a Utah-based IT &amp; AI consulting firm
                    founded by <strong className="text-zinc-200">Dr. Majid Memari</strong> — NVIDIA Ambassador, Assistant
                    Professor at Utah Valley University, and Principal AI Architect at the Gary R. Herbert Institute for Public
                    Policy.
                  </p>
                  <p>
                    Dr. Memari holds a Ph.D. in Computer Science from Southern Illinois University and brings 10+ years of
                    expertise in AI/ML, LLMs, data systems, and software architecture. He serves as an AI Consultant for the
                    University of Utah&apos;s One-U Responsible AI Initiative and is a certified NVIDIA Deep Learning Institute
                    instructor.
                  </p>
                  <p>
                    Prior collaborations include Stanford, Johns Hopkins, UPenn, and state agencies including Utah&apos;s Office of
                    Data Privacy and Department of Health &amp; Human Services.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">Ph.D.</p>
                  <p className="text-xs text-zinc-500 mt-1">Computer Science — Southern Illinois University</p>
                </div>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">NVIDIA</p>
                  <p className="text-xs text-zinc-500 mt-1">Ambassador &amp; DLI Certified Instructor</p>
                </div>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">10+</p>
                  <p className="text-xs text-zinc-500 mt-1">Years in AI, ML &amp; software engineering</p>
                </div>
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
                  <p className="text-2xl font-bold text-sky-400">Utah</p>
                  <p className="text-xs text-zinc-500 mt-1">Based in Salt Lake City — serving clients nationwide</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="careers" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">Careers</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Join Our Team</h2>
            <p className="mt-4 text-zinc-500">
              We&apos;re building practical AI solutions across EdTech, simulation, agentic automation, and public-sector
              programs—and we&apos;re hiring engineers who want to ship real impact.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-10 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-8">
              <h3 className="text-xl font-semibold text-zinc-100">AI Engineer</h3>
              <p className="mt-1 text-sm text-sky-400">Utah · Hybrid / Remote considered</p>
              <div className="mt-6 space-y-4 text-sm text-zinc-400">
                <div>
                  <p className="font-medium text-zinc-300">Responsibilities</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Design and ship LLM-powered applications and evaluation pipelines</li>
                    <li>Build agentic systems and integrations with cloud data services</li>
                    <li>Collaborate on AI simulation, EdTech, and public-sector projects</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-zinc-300">Requirements</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Strong Python; experience with LLMs, RAG, and APIs</li>
                    <li>Familiarity with cloud (AWS/Azure/GCP) and solid ML fundamentals</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-zinc-300">Nice to have</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>NVIDIA ecosystem (CUDA, RAPIDS, Jetson), multi-agent frameworks</li>
                    <li>Research publications or open-source contributions</li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="mailto:memari.majid@hotmail.com?subject=AI%20Engineer%20Application"
                  className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
                >
                  Apply Now
                </a>
                <a href="#contact" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600">
                  Apply via contact form
                </a>
              </div>
              <p className="mt-6 text-xs text-zinc-600">
                Don&apos;t see your role? We&apos;re always interested in strong builders—{" "}
                <a href="#contact" className="text-sky-400 hover:underline">
                  reach out
                </a>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="contact" className="scroll-mt-20 border-t border-zinc-800/40 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-sky-400 mb-2">Get in Touch</p>
            <h2 className="text-3xl font-bold sm:text-4xl">Let&apos;s Work Together</h2>
            <p className="mt-4 max-w-lg text-zinc-500">
              Have a project in mind or need IT or AI consulting? Send a message—we&apos;ll get back to you promptly.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <ContactForm />
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal delay={80}>
              <a
                href="mailto:memari.majid@hotmail.com"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg className="h-8 w-8 text-sky-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                <p className="text-sm font-medium text-zinc-200">Email</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">memari.majid@hotmail.com</p>
              </a>
            </Reveal>

            <Reveal delay={120}>
              <a
                href="tel:+18018109152"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg className="h-8 w-8 text-sky-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                <p className="text-sm font-medium text-zinc-200">Phone</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">(801) 810-9152</p>
              </a>
            </Reveal>

            <Reveal delay={160}>
              <a
                href="https://www.linkedin.com/in/majid-memari"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg className="h-8 w-8 text-sky-400 mb-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <p className="text-sm font-medium text-zinc-200">LinkedIn</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">majid-memari</p>
              </a>
            </Reveal>

            <Reveal delay={200}>
              <a
                href="https://github.com/memari-majid"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-6 text-center transition hover:border-sky-800/50 hover:bg-zinc-900/70"
              >
                <svg className="h-8 w-8 text-sky-400 mb-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <p className="text-sm font-medium text-zinc-200">GitHub</p>
                <p className="mt-1 text-xs text-zinc-500 group-hover:text-sky-400 transition-colors">memari-majid</p>
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800/40 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/nexus-logo.png" alt="Nexus AI Solutions" width={28} height={28} className="h-7 w-7 rounded-md object-contain" />
            <span className="text-sm font-medium">
              Nexus<span className="text-sky-400"> AI</span> Solutions LLC
            </span>
          </div>
          <p className="text-xs text-zinc-600">
            © {year} Nexus AI Solutions LLC · Sandy, Utah · Registered in the State of Utah
          </p>
        </div>
      </footer>
    </>
  );
}
