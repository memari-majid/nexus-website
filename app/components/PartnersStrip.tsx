import type { ReactNode } from "react";
import Image from "next/image";
import { MAJID } from "@/lib/majid";

const UVU_URL = "https://www.uvu.edu/";
const ONE_U_RAI_URL = "https://rai.utah.edu/";

/**
 * Named collaborators only. No client counts.
 * Stanford / Johns Hopkins / Penn are not listed (not current partners).
 * Silicon Slopes is community, not a client. PacifiCorp is GridEye collaboration, not a Nexus client.
 */
export function PartnersStrip({
  voice = "we",
  includeSchoolOfEducation = false,
}: {
  voice?: "we" | "I";
  includeSchoolOfEducation?: boolean;
}) {
  const heading = voice === "we" ? "Who we work with" : "Who I work with";

  return (
    <section
      id="partners"
      className="scroll-mt-20 border-t border-zinc-200/80 bg-white px-4 py-20 dark:border-zinc-800/40 dark:bg-zinc-950 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Partners
        </p>
        <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          State institutes and agencies, Utah campuses, Utah&apos;s Silicon Slopes tech community,
          and industry consulting — named collaborators, not a client count.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <PartnerColumn facet="State">
            <PartnerName>Gary R. Herbert Institute for Public Policy</PartnerName>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
              DataGovAI and privacy-preserving public-sector AI.
            </p>
            <ul className="mt-3 space-y-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
              <li>Utah Office of Data Privacy</li>
              <li>Utah Department of Health and Human Services (DHHS)</li>
            </ul>
          </PartnerColumn>

          <PartnerColumn facet="Universities">
            <PartnerName>
              <a
                href={UVU_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600"
              >
                {MAJID.university}
              </a>
            </PartnerName>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
              Academic home
              {includeSchoolOfEducation ? " · UVU School of Education (AI-ClassSims)" : ""}.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
              <a
                href={ONE_U_RAI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:text-zinc-200 dark:decoration-zinc-600"
              >
                University of Utah One-U RAI
              </a>
              {" — "}
              public and policy conversations.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
              GridEye: University of Utah / UVU ECE / PacifiCorp collaboration; USHE proposal in
              development.
            </p>
          </PartnerColumn>

          <PartnerColumn facet="Silicon Slopes">
            <a
              href={MAJID.siliconSlopes}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mx-auto mb-3 block h-14 w-14 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900 dark:border-zinc-700 dark:bg-white"
            >
              <Image
                src="/logos/siliconslopes.png"
                alt="Silicon Slopes"
                fill
                sizes="56px"
                className="object-contain p-1"
              />
            </a>
            <PartnerName>
              <a
                href={MAJID.siliconSlopes}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600"
              >
                Utah&apos;s Silicon Slopes tech community
              </a>
            </PartnerName>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
              A 501(c)(3) community — not an employer or client.
            </p>
          </PartnerColumn>

          <PartnerColumn facet="Industry">
            <PartnerName>{MAJID.clarion}</PartnerName>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-500">
              Applied AI consulting on LLM and agent workflows — including when to use AI.
            </p>
          </PartnerColumn>
        </div>
      </div>
    </section>
  );
}

function PartnerColumn({ facet, children }: { facet: string; children: ReactNode }) {
  return (
    <div className="card flex h-full flex-col p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
        {facet}
      </p>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function PartnerName({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{children}</p>;
}
