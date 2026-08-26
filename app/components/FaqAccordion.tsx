"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What do you do for clients?",
    a: "Our active client work is AI consulting and team training. We advise organizations on how to adopt AI — and when not to — and we train teams through workshops and hands-on sessions. When you need a system built, that is a separate, scoped statement of work: retrieval over private documents, agentic tool-use, evaluation and guardrails, and multimodal vision-language work where it fits.",
  },
  {
    q: "How are workshops and team training structured?",
    a: "Organizational training is scoped to your team's tools and goals — typically a half-day or full-day workshop, or a short series. NVIDIA Deep Learning Institute sessions use GPU-accelerated labs and DLI-style certificates of completion. Campus student workshops at participating universities are offered at no charge to students.",
  },
  {
    q: "Who delivers Nexus client work?",
    a: "Every statement of work is executed under Nexus AI Solutions LLC. Dr. Majid Memari — Assistant Professor of Computer Science at Utah Valley University, NVIDIA University Ambassador, and Principal AI Architect at the Gary R. Herbert Institute for Public Policy — leads architecture, retrieval and agent systems, evaluations, and governance. He was selected for the 2026 AI Utah 100. Work is based in Utah's Salt Lake metro — not a revolving cast of subcontractors.",
  },
  {
    q: "Are we employing your team, or hiring Nexus as a vendor?",
    a: "You're engaging Nexus AI Solutions LLC as an independent business—typically milestone- or deliverable-based statements of work—not putting the founder on your payroll. Nexus assigns who does the work. That keeps IP, invoicing, and responsibility with the company delivering the outcomes you bought.",
  },
  {
    q: "What industries do you serve?",
    a: "We work across education, government, healthcare, public safety, and enterprise. Representative work includes AI-powered EdTech, simulation training, and privacy-preserving data systems for state agencies — always as AI solutions, not generic IT operations.",
  },
  {
    q: "Can you work with our existing tech stack?",
    a: "Yes, when the stack is in service of an AI system. Typical tools include Python, PyTorch, LangChain / LangGraph, evaluation harnesses, and GPU-accelerated NVIDIA DLI-style labs. Cloud or hybrid hosting is used to run those systems — we do not sell standalone helpdesk, cybersecurity assessments, or lift-and-shift cloud migration.",
  },
  {
    q: "What does a typical engagement look like?",
    a: "We prefer to de-risk with a paid discovery sprint: goals, constraints, architecture, backlog, risks, latency and cost envelopes, then a concrete build proposal or milestone plan. Larger builds proceed in phases—with evaluation hooks early—rather than committing to ambiguous fixed scope without shared understanding.",
  },
  {
    q: "Do you offer ongoing support after project delivery?",
    a: "Yes—normally as separate, signed follow-on work: stabilization windows, model/prompt upkeep, retrieval tuning, observability tweaks, docs, or a clearly bounded sustainment sprint. Nexus sells projects and phased SOWs, not pretending to be embedded FTE unless your procurement deliberately buys a capped sustainment engagement with explicit boundaries (never implied 24/7 on-call unless written into the SOW).",
  },
  {
    q: "How do you handle data privacy and compliance?",
    a: "Security and privacy are core to every AI engagement. We design with encryption at rest and in transit, role-based access, audit logging, and alignment with frameworks like HIPAA, FERPA, and state data-privacy regulations — especially relevant in Utah public-sector work.",
  },
];

export function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-zinc-200 dark:divide-zinc-800/60">
      {FAQS.map((faq, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 sm:text-base">
                {faq.q}
              </span>
              <svg
                className={`h-5 w-5 shrink-0 text-sky-600 transition-transform duration-300 dark:text-sky-400 ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[min(28rem,70vh)] pb-5" : "max-h-0"}`}
            >
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{faq.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
