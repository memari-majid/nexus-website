"use client";

import { useEffect, useState } from "react";

const TESTIMONIALS = [
  {
    quote:
      "Nexus AI transformed our outdated data pipeline into an intelligent system that saves our team dozens of hours each week. Their expertise in LLMs and agentic automation is truly world-class.",
    name: "Dr. Sarah Mitchell",
    role: "Director of Data Science, Utah State Agency",
  },
  {
    quote:
      "The NVIDIA Deep Learning workshop Dr. Memari delivered at our university was the highest-rated tech event of the year. Students left with hands-on skills and DLI certifications.",
    name: "Prof. James Chen",
    role: "CS Department Chair, Partner University",
  },
  {
    quote:
      "We needed a privacy-preserving AI solution that met strict government compliance standards. Nexus delivered on time, under budget, and exceeded every requirement.",
    name: "Rachel Torres",
    role: "CTO, Government Technology Partner",
  },
  {
    quote:
      "Their AI-simulated training platform for our first-responder program is saving lives. The dynamic scenarios and AI-driven debriefs have measurably improved outcomes.",
    name: "Chief Michael Park",
    role: "Emergency Services Training Director",
  },
];

export function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <div className="relative mx-auto max-w-2xl text-center">
      <svg
        className="mx-auto mb-6 h-10 w-10 text-sky-400/40 dark:text-sky-500/30"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.68 11 13.2 11 15c0 1.86-1.567 3.5-3.5 3.5-1.073 0-2.099-.49-2.917-1.179ZM14.583 17.321C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.68 21 13.2 21 15c0 1.86-1.567 3.5-3.5 3.5-1.073 0-2.099-.49-2.917-1.179Z" />
      </svg>

      <div className="flex min-h-[120px] items-center justify-center">
        <p
          key={active}
          className="text-lg italic leading-relaxed text-zinc-700 dark:text-zinc-300 animate-[fadeUp_0.5s_ease-out]"
        >
          &ldquo;{t.quote}&rdquo;
        </p>
      </div>

      <p className="mt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t.name}</p>
      <p className="text-xs text-sky-600 dark:text-sky-400">{t.role}</p>

      <div className="mt-6 flex justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? "w-6 bg-sky-500" : "w-2 bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            }`}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
