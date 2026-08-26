import { MAJID } from "@/lib/majid";

const linkClass =
  "text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-600";

const headingClass = "text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100";

/** Academia · Industry · Community — matches instructor_profile bio_full. */
export function BioCategories({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 ${className}`}>
      <div>
        <h3 className={headingClass}>Academia</h3>
        <p className="mt-2">
          {MAJID.bio.academia} More at{" "}
          <a href={MAJID.linkedin} target="_blank" rel="me noopener noreferrer" className={linkClass}>
            LinkedIn
          </a>{" "}
          and{" "}
          <a href={MAJID.scholar} target="_blank" rel="me noopener noreferrer" className={linkClass}>
            Google Scholar
          </a>
          .
        </p>
      </div>
      <div>
        <h3 className={headingClass}>Industry</h3>
        <p className="mt-2">
          In Utah&apos;s{" "}
          <a href={MAJID.siliconSlopes} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Silicon Slopes
          </a>{" "}
          tech community he consults with {MAJID.clarion} on LLM and agent workflows—including when to
          use AI and when not to. Through Nexus AI Solutions he provides {MAJID.clientOffer.label}:{" "}
          {MAJID.clientOffer.summary} He is a Certified Instructor for the NVIDIA Deep Learning
          Institute, and earlier did data-science work at {MAJID.potentia}.
        </p>
      </div>
      <div>
        <h3 className={headingClass}>Community</h3>
        <p className="mt-2">
          At the Gary R. Herbert Institute for Public Policy he collaborates with the Utah Office of
          Data Privacy and the Utah Department of Health and Human Services (DHHS) on AI for data
          governance and privacy, and contributes to One-U RAI public and policy conversations. He
          was{" "}
          <a href={MAJID.aiUtah100.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            selected for the 2026 AI Utah 100
          </a>
          .
        </p>
      </div>
    </div>
  );
}
