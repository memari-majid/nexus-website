"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What industries do you serve?",
    a: "We work across education, government, healthcare, public safety, and enterprise. Our solutions range from AI-powered EdTech platforms and emergency-services simulation training to privacy-preserving data systems for state agencies.",
  },
  {
    q: "How are the NVIDIA workshops structured?",
    a: "Dr. Memari delivers full-day, hands-on workshops aligned with NVIDIA Deep Learning Institute standards. Students get GPU-accelerated cloud labs, real-world exercises, and certificates of completion — all free for students at participating universities.",
  },
  {
    q: "Can you work with our existing tech stack?",
    a: "Absolutely. We integrate with AWS, Azure, GCP, on-prem infrastructure, and hybrid setups. Our team has deep experience with Python, PyTorch, LangChain, Next.js, and modern cloud-native architectures.",
  },
  {
    q: "What does a typical engagement look like?",
    a: "We start with a discovery session to understand your goals and constraints. From there we propose a phased roadmap — usually starting with a focused proof-of-concept, then iterating toward production deployment with ongoing support.",
  },
  {
    q: "Do you offer ongoing support after project delivery?",
    a: "Yes. We provide post-launch monitoring, model retraining, performance optimization, and on-call engineering support. Many clients retain us for quarterly AI strategy reviews and continuous improvement.",
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
              className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-60 pb-5" : "max-h-0"}`}
            >
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{faq.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
