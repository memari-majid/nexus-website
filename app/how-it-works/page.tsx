import type { Metadata } from "next";
import Link from "next/link";
import { ChatWidget } from "@/app/components/ChatWidget";
import { NavBar } from "@/app/components/NavBar";
import { ScheduleButton } from "@/app/components/ScheduleButton";
import { CHAT_MODELS, DEFAULT_MODEL_ID, FALLBACK_MODEL_ID } from "@/lib/chat-models";
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
  note: m.id === DEFAULT_MODEL_ID ? "Default" : m.id === FALLBACK_MODEL_ID ? "Budget fallback" : "",
}));

/** Bake-off result from evals/README.md, 2026-09-12, two turns on the real prompt. */
const BAKEOFF = [
  {
    model: "Claude Opus 5",
    cost: "about $0.08",
    read: "Most human, most specific consulting answer. Now the default",
  },
  {
    model: "Claude Sonnet 5",
    cost: "about $0.03",
    read: "Fastest, 1.3 s to first token, and nearly as good",
  },
  { model: "GPT-5.6 Sol", cost: "about $0.02", read: "Correct but terse" },
  { model: "gpt-oss-20b", cost: "", read: "Generic. The previous production model" },
] as const;

const LOOP = [
  {
    title: "Understand",
    text: "It opens by asking what your team does, what you are trying to build or fix, and where you are stuck. One question at a time, and it reacts to what you said before it asks the next one.",
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
    title: "Brief and snapshot",
    text: "When there is enough to work with, it drafts a structured consulting brief and a readiness snapshot. Both render as cards you can read, question, and take with you.",
  },
  {
    title: "Hand off",
    text: "When you want to move forward, it asks your approval to send Majid Memari, PhD a structured summary. Nothing leaves the chat without that click.",
  },
] as const;

const TOOLS = [
  {
    name: "recommendWorkshop",
    approval: false,
    text: "Picks the best-fit NVIDIA DLI training from the same catalog that renders the Training page, so it cannot invent a course title. Returns the pick, why it fits, and alternatives.",
  },
  {
    name: "assessReadiness",
    approval: false,
    text: "Scores where you stand today from what you have said and renders a short readiness snapshot. A starting point for the conversation, not a verdict.",
  },
  {
    name: "draftConsultingBrief",
    approval: false,
    text: "Writes a structured brief: your situation in your own terms, where AI fits, the risks, what to keep with people, the recommended first step, and the questions to answer before you commit budget.",
  },
  {
    name: "handOffToMajid",
    approval: true,
    text: "Sends Majid a structured summary with your name, email, topic, and the brief if one was drafted.",
  },
  {
    name: "emailBriefToVisitor",
    approval: true,
    text: "Emails you the brief as a fixed template, with Majid copied.",
  },
  {
    name: "emailWorkshopInfo",
    approval: true,
    text: "Emails you the NVIDIA DLI workshop one-pager, with Majid copied.",
  },
] as const;

const GUARDRAILS = [
  "Every request is checked against a schema before a model sees it. Only visitor and assistant turns are accepted, and a conversation that grows too long gets a polite ask to start a new chat.",
  "Each visitor has a per-minute request limit and a daily usage allowance. The site has a soft daily budget that switches replies to Claude Sonnet 5 once crossed, and a hard budget that pauses the chat and points to the contact form.",
  "Facts come from the same data files that render this site: the team, the NVIDIA catalog, the delivery model, pricing. The prompt also lists what the agent may not claim, including anything that would imply NVIDIA endorses Nexus.",
  "Tool schemas stay plain so all four models can call them, and a smoke test forces every model through the brief and readiness tools before a change ships.",
  "Nothing secret reaches the browser. Model calls go through Vercel AI Gateway from the server, and each request writes one usage line so cost can be charted per conversation.",
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
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
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Live demo</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          How Dr. MJ works
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Dr. MJ is the AI consultant agent on this site. It is named after founder Majid Memari,
          PhD, who goes by MJ, and it will tell you it is an AI if you ask. This page is the
          teardown: the loop it runs, the tools it can call, where you stay in charge, what each
          reply costs, and how we picked the model behind it. It is also a worked example of how
          Nexus builds agents for clients.
        </p>
        <div className="mt-8">
          <ScheduleButton>Try it now</ScheduleButton>
        </div>

        <Section title="It consults before it sells">
          <ol className="space-y-6">
            {LOOP.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {i + 1}
                </span>
                <div>
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
            Six tools, all running on the server. Three of them send email, and those wait for
            your approval every time.
          </p>
          <dl className="mt-8 space-y-6">
            {TOOLS.map((t) => (
              <div key={t.name}>
                <dt className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
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
            it did not, Dr. MJ says so, your request stays in the chat, and the card points you to
            the contact form.
          </p>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Emails to visitors are fixed templates. The model can fill named fields, never write
            the message, and links, addresses, and phone numbers are stripped from those fields
            before anything is sent. Sends are capped per visitor and for the site as a whole.
          </p>
        </Section>

        <Section title="Pick the model, see the bill">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            The default is Claude Opus 5, which won the bake-off below. You can switch to any of
            these from the toolbar in the chat. Prices are public Vercel AI Gateway list prices in
            dollars per one million tokens, as of 2026-09-12.
          </p>
          <div className="mt-6 overflow-x-auto">
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
                    <td className="py-3 pr-4">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{m.label}</span>
                      <span className="block font-mono text-xs text-zinc-500 dark:text-zinc-500">
                        {m.id}
                      </span>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {price(m.input)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {price(m.output)}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">{m.note}</td>
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

        <Section title="Guardrails">
          <ul className="space-y-4">
            {GUARDRAILS.map((g) => (
              <li key={g} className="flex gap-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <span aria-hidden className="text-zinc-400 dark:text-zinc-600">
                  &bull;
                </span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="How we chose the model">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            On 2026-09-12 we ran the same two-turn prospect conversation, a 40-person logistics
            company asking whether to build retrieval over its SOPs or fine-tune a model, through
            the real system prompt on each candidate, and scored the replies on five points:
            consults before it sells, specific and honest, sounds like a person, grounded, and
            moves the conversation forward.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-[0.14em] text-zinc-500 dark:border-zinc-800">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Model
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Cost per conversation
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Read
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {BAKEOFF.map((r) => (
                  <tr key={r.model}>
                    <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-zinc-50">
                      {r.model}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {r.cost}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">{r.read}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
            Gemini 3.8 Flash is in the picker as the low-price option and has not been scored on
            this rubric yet. The bake-off is a script in the repo, so the decision can be rerun
            whenever a model changes. That is the point: a model choice should be a measurement,
            not a preference.
          </p>
        </Section>

        <Section title="Built the same way for clients">
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            This is the pattern Nexus uses on client work: a grounded prompt, a few well-scoped
            tools, an approval gate on anything with side effects, budgets that keep the bill
            boring, and an eval you can rerun. The stack here is Next.js, the Vercel AI SDK, and
            Vercel AI Gateway, but the pattern is what matters. If you want an agent like this for
            your business, start with a conversation. Dr. MJ will take it from there.
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
