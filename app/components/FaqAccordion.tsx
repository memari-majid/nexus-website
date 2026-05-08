"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What kinds of AI and IT projects do you take on?",
    a: "We focus on practical, scoped work: retrieval-augmented generation over private documents, LangChain/LangGraph agent workflows, AI automation that calls your tools and APIs, LLM evaluation and guardrails, Python/FastAPI AI backends, and embedding intelligent features into existing products. On the IT side, we advise and deliver around integration, modernization, cloud migration planning, cybersecurity hygiene, and hybrid or on-premises considerations when models and data can't live only in SaaS.",
  },
  {
    q: "Who delivers Nexus client work?",
    a: "Every statement of work is executed under Nexus AI Solutions LLC. Dr. Majid Memari anchors architecture, multimodal proofs, retrieval/agent systems, evaluations, governance, Bedrock-era cloud footprints, and the public-sector programs highlighted onsite. Hamid Memari leads technical delivery integration, escalation-minded quality, backends, CI hygiene, and production cutovers. Both principals are rooted in Utah's Salt Lake City metro for tighter collaboration—not a revolving cast of subcontractors.",
  },
  {
    q: "Are we employing your team, or hiring Nexus as a vendor?",
    a: "You're engaging Nexus AI Solutions LLC as an independent business—typically milestone- or deliverable-based statements of work—not putting our principals on your payroll. Nexus assigns who does the work (principals today; vetted bench later as we scale). That keeps IP, invoicing, and responsibility with the company delivering the outcomes you bought.",
  },
  {
    q: "What industries do you serve?",
    a: "We work across education, government, healthcare, public safety, and enterprise. Our solutions range from AI-powered EdTech platforms and emergency-services simulation training to privacy-preserving data systems for state agencies.",
  },
  {
    q: "How are the NVIDIA workshops structured?",
    a: "Certified Nexus instructors facilitate full-day immersion labs patterned after NVIDIA Deep Learning Institute pedagogy—GPU-hosted exercises, facilitator checkpoints, and completion artifacts when NVIDIA recognizes the cohort. Students at hosting universities routinely attend at no tuition-style charge.",
  },
  {
    q: "Can you work with our existing tech stack?",
    a: "Absolutely. We integrate with AWS, Azure, GCP, on-prem infrastructure, and hybrid setups. Our team has deep experience with Python, PyTorch, LangChain, Next.js, and modern cloud-native architectures.",
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
    a: "Security and privacy are core to every engagement. We build with encryption at rest and in transit, role-based access, audit logging, and compliance with frameworks like HIPAA, FERPA, and state data-privacy regulations.",
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
