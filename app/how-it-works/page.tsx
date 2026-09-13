import type { Metadata } from "next";
import Link from "next/link";
import { ChatWidget } from "@/app/components/ChatWidget";
import { NavBar } from "@/app/components/NavBar";
import { ScheduleButton } from "@/app/components/ScheduleButton";
import { EvalPanel } from "@/app/components/demo/EvalPanel";
import { CHAT_MODELS, DEFAULT_MODEL_ID, FALLBACK_MODEL_ID } from "@/lib/chat-models";
import { ASSISTANT_NAME, FOUNDER_CHAT_NAME, FOUNDER_SITE_NAME } from "@/lib/chat-persona";
import {
  HOW_IT_WORKS_BREADCRUMBS,
  PAGE_COPY,
  breadcrumbJsonLd,
  organizationJsonLd,
  pageMetadata,
  websiteJsonLd,
} from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata("howItWorks", "/how-it-works");

const url = `${SITE_URL}/how-it-works`;

/**
 * Visitor-selectable models with their public Vercel AI Gateway list prices in
 * dollars per one million tokens (2026-09-12), read from lib/chat-models.ts so
 * this page, the widget picker, and evals/bakeoff.ts share one source. Limit
 * and budget constants are deliberately not published here.
 */
const MODELS = CHAT_MODELS.map((m) => ({
  id: m.id,
  label: m.label,
  input: m.inputPerM,
  output: m.outputPerM,
  note:
    m.id === FALLBACK_MODEL_ID
      ? "What both surfaces open on, and the budget fallback"
      : m.id === DEFAULT_MODEL_ID
        ? "Top of the bake-off below on the read, tied on the rubric. One tap away in the toolbar"
        : "",
}));

const LOOP = [
  {
    title: "Understand",
    text: "It opens by asking what your team does, what you are trying to build or fix, and where you are stuck. One question at a time, and it reacts to what you said before it asks the next one.",
  },
  {
    title: "Check the facts",
    text: "Before it claims anything about this company it looks the answer up in the same data files that render this site. If a fact is not in there, it says so instead of filling the gap.",
  },
  {
    title: "Consult",
    text: "It gives specific guidance: what it would do first, the trade-offs, and a realistic sense of effort. That includes the honest answer when you probably do not need AI for the job.",
  },
  {
    title: "Recommend",
    text: "It matches the need to consulting, an NVIDIA DLI workshop, custom training, a Forward Deployed Engineer, or a mix, and calls a tool to ground any training pick in the real catalog.",
  },
  {
    title: "Put it in writing",
    text: "When there is enough to work with, it drafts a consulting brief, a readiness snapshot, a size estimate, or the internal note you would send to get this moving. All of them render as cards you can read, question, and take with you.",
  },
  {
    title: "Hand off",
    text: `When you want to move forward, it asks your approval to send ${FOUNDER_SITE_NAME} a structured summary. Nothing leaves the chat without that click.`,
  },
] as const;

const TOOLS = [
  {
    name: "lookupSiteFacts",
    approval: false,
    text: "Reads the facts this site is built from: the team, the NVIDIA catalog, how delivery works, the published evaluations. It is how the agent answers a question about us without guessing.",
  },
  {
    name: "recommendWorkshop",
    approval: false,
    text: "Picks the best-fit NVIDIA DLI training from the same catalog that renders the Training page, so it cannot invent a course title. Returns the pick, why it fits, and alternatives.",
  },
  {
    name: "draftConsultingBrief",
    approval: false,
    text: "Writes a structured brief: your situation in your own terms, where AI fits, the risks, what to keep with people, the recommended first step, and the questions to answer before you commit budget.",
  },
  {
    name: "assessReadiness",
    approval: false,
    text: "Scores where you stand today from what you have said and renders a short readiness snapshot. A starting point for the conversation, not a verdict.",
  },
  {
    name: "estimateProject",
    approval: false,
    text: "Sizes the work: the shape of a first phase, what drives the effort up or down, and what you would need on your side. Ranges and drivers, never a quote.",
  },
  {
    name: "draftOutreachNote",
    approval: false,
    text: "Composes the note you would send inside your own company to get this moving: what you are asking for, why now, and what you need from whom. Yours to keep, edit, or ignore.",
  },
  {
    name: "handOffToMajid",
    approval: true,
    text: `Sends ${FOUNDER_CHAT_NAME} a structured summary with your name, email, topic, and the brief if one was drafted.`,
  },
  {
    name: "emailMajidNote",
    approval: true,
    text: `Sends ${FOUNDER_CHAT_NAME} a short note you composed in the chat, as a fixed template with your words in named fields. You see the exact note before it goes.`,
  },
  {
    name: "emailBriefToVisitor",
    approval: true,
    text: `Emails you the brief as a fixed template, with ${FOUNDER_CHAT_NAME} copied.`,
  },
  {
    name: "emailWorkshopInfo",
    approval: true,
    text: `Emails you the NVIDIA DLI workshop one-pager, with ${FOUNDER_CHAT_NAME} copied.`,
  },
] as const;

const GUARDRAILS = [
  "Every request is checked against a schema before a model sees it. Only visitor and assistant turns are accepted, tool payloads echoed back from the browser are capped and trimmed oldest first, and a conversation that grows too long gets a polite ask to start a new chat.",
  "Each visitor has a per-minute request limit and a daily usage allowance. The site has a soft daily budget that switches replies to the cheaper model once crossed, and a hard budget that pauses the chat and points to the contact form. Live evaluation runs have their own smaller allowance inside that.",
  "Facts come from the same data files that render this site: the team, the NVIDIA catalog, the delivery model, pricing. The prompt also lists what the agent may not claim, including anything that would imply NVIDIA endorses Nexus.",
  "Tool schemas stay plain so all four models can call them, and a smoke test forces every model through the brief and readiness tools before a change ships.",
  "Nothing secret reaches the browser. Model calls go through Vercel AI Gateway from the server, and each request writes one usage line so cost can be charted per conversation.",
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 min-w-0 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function price(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function HowItWorksPage() {
  const graph = [
    organizationJsonLd(),
    websiteJsonLd(),
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: PAGE_COPY.howItWorks.title,
      description: PAGE_COPY.howItWorks.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    },
    breadcrumbJsonLd([...HOW_IT_WORKS_BREADCRUMBS]),
  ];

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
        }}
      />
      <NavBar />
      <main className="mx-auto min-w-0 max-w-3xl px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Live demo</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          How the {ASSISTANT_NAME} works
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          The {ASSISTANT_NAME} is the AI consulting agent on this site. It runs inline on the
          homepage and in the panel on every other page, and it will tell you it is an AI if you
          ask. This page is the teardown: the loop it runs, the ten tools it can call, where you
          stay in charge, what each reply costs, and the measurements behind the model it uses. It
          is also a worked example of how Nexus builds agents for clients.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-zinc-500">
          One naming note, so the two forms are not a mystery: in the chat the agent calls the
          founder {FOUNDER_CHAT_NAME}. In our own copy he is {FOUNDER_SITE_NAME}.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ScheduleButton>Try it now</ScheduleButton>
          <Link
            href="/#try-our-ai"
            className="text-sm text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
          >
            Or try it inline on the homepage
          </Link>
        </div>

        <Section title="It consults before it sells">
          <ol className="space-y-6">
            {LOOP.map((step, i) => (
              <li key={step.title} className="flex min-w-0 gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Every tool call shows up in the conversation as a step, with what went in and what
            came back, so you can watch the agent work instead of taking its word for it.
          </p>
        </Section>

        <Section title="The tools it can call">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Ten tools, all running on the server. Four of them send email, and those wait for your
            approval every time.
          </p>
          <dl className="mt-8 space-y-6">
            {TOOLS.map((t) => (
              <div key={t.name} className="min-w-0">
                <dt className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <code className="min-w-0 break-all rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    {t.name}
                  </code>
                  {t.approval ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-400">
                      Needs your approval
                    </span>
                  ) : null}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {t.text}
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="You approve anything that leaves the chat">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Before an email tool runs, the chat shows an approval card with exactly what will be
            sent and to whom, then waits. Approve, and it goes out on that request. Decline, and
            the agent drops it and does not ask again unless you bring it up.
          </p>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Delivery is reported honestly. Sent means the mail provider accepted the message. If
            it did not, the agent says so, your request stays in the chat, and the card points you
            to the contact form. Outgoing email is not configured on this site today, so every
            send reports not sent. We would rather show you that than pretend.
          </p>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Emails to visitors are fixed templates. The model can fill named fields, never write
            the message, and links, addresses, and phone numbers are stripped from those fields
            before anything is sent. Sends are capped per visitor and for the site as a whole.
          </p>
        </Section>

        <Section title="Pick the model, see the bill">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            The demo and the panel are one conversation, so they share one model pick. Both open
            on the cheaper Claude Sonnet 5, because anyone can run this and a curious visitor
            should not cost us much. Claude Opus 5 is one tap away in the toolbar, along with the
            other two. It is the one we reach for on real client work, and the bake-off below is
            why, though not as cleanly as we would like: the judge scored it level with GPT-5.6
            Sol, which is a quarter of the price and faster to first token. What separates them is
            the read, not the rubric. Prices are public Vercel AI Gateway list prices in dollars
            per one million tokens, as of 2026-09-12.
          </p>
          {/* Four short columns that fit: measured at 360, 400, 480, 640, 768,
              1024, 1280 and 1536, this table's content is exactly as wide as
              its box. Only a phone narrower than 360 scrolls it, so the
              wrapper stays plain. A focus stop and a region named "scroll
              sideways" here would promise a keyboard visitor a scroll that is
              not there and cost them a tab press to find that out. */}
          <div className="mt-6 min-w-0 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-[0.14em] text-zinc-500 dark:border-zinc-800">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Model
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Input
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Output
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {MODELS.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 pr-4 align-top">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{m.label}</span>
                      <span className="block font-mono text-xs text-zinc-500 dark:text-zinc-500">
                        {m.id}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 align-top tabular-nums text-zinc-600 dark:text-zinc-400">
                      {price(m.input)}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 align-top tabular-nums text-zinc-600 dark:text-zinc-400">
                      {price(m.output)}
                    </td>
                    <td className="py-3 align-top text-zinc-600 dark:text-zinc-400">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Every reply carries a stats row: model, time to first token, total time, tokens in and
            out, and cost. Tap it for the full breakdown, including cached tokens. The system
            prompt is cached on the Anthropic models, so a follow-up turn reads most of it at a
            fraction of the input price.
          </p>
        </Section>

        <Section title="Evaluations">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            A model choice should be a measurement, not a preference. Below is the run that picked
            the default, exactly as the script wrote it, plus a button that runs a fresh one
            against a challenger you choose and has a third model score both replies. The two are
            different measurements and never share a cell.
          </p>
          <div className="mt-8 min-w-0">
            <EvalPanel />
          </div>
        </Section>

        <Section title="Guardrails">
          <ul className="space-y-4">
            {GUARDRAILS.map((g) => (
              <li
                key={g}
                className="flex min-w-0 gap-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
              >
                <span aria-hidden className="text-zinc-400 dark:text-zinc-600">
                  &bull;
                </span>
                <span className="min-w-0">{g}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Built the same way for clients">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            This is the pattern Nexus uses on client work: a grounded prompt, a few well-scoped
            tools, an approval gate on anything with side effects, budgets that keep the bill
            boring, and an eval you can rerun. The stack here is Next.js, the Vercel AI SDK, and
            Vercel AI Gateway, but the pattern is what matters. If you want an agent like this for
            your business, start with a conversation. The {ASSISTANT_NAME} will take it from
            there.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ScheduleButton>Start a conversation</ScheduleButton>
            <Link
              href="/contact"
              className="text-sm text-zinc-800 underline decoration-zinc-300 underline-offset-4 dark:text-zinc-200 dark:decoration-zinc-600"
            >
              Contact
            </Link>
          </div>
        </Section>
      </main>
      <ChatWidget />
    </div>
  );
}
