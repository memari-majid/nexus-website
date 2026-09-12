import type { Metadata } from "next";
import Link from "next/link";
import { ChatWidget } from "@/app/components/ChatWidget";
import { ContactForm } from "@/app/components/ContactForm";
import { JsonLd } from "@/app/components/JsonLd";
import { NavBar } from "@/app/components/NavBar";
import { NvidiaBadge, NvidiaTrademark } from "@/app/components/NvidiaBadge";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata("contact", "/contact");

export default function ContactPage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <JsonLd page="/contact" />
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Contact</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Contact Nexus AI Solutions
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          AI consulting and training — advisory, workshops, and in-house sessions.
        </p>
        <div className="mt-6">
          <NvidiaBadge />
        </div>

        <dl className="mt-8 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
          <div>
            <dt className="font-medium text-zinc-800 dark:text-zinc-200">Email</dt>
            <dd>
              <a className="text-sky-600 underline dark:text-sky-400" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-800 dark:text-zinc-200">Phone</dt>
            <dd>
              <a className="text-sky-600 underline dark:text-sky-400" href={`tel:${SITE.phone}`}>
                {SITE.phoneDisplay}
              </a>
              {" — "}
              leave a message and we will call back.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-800 dark:text-zinc-200">Address</dt>
            <dd>{SITE.addressDisplay}</dd>
          </div>
        </dl>

        <div className="mt-10">
          <ContactForm />
        </div>

        <p className="mt-10 text-sm">
          <Link className="text-sky-600 underline dark:text-sky-400" href="/about">
            About the team
          </Link>
          {" · "}
          <Link className="text-sky-600 underline dark:text-sky-400" href="/#consulting">
            Consulting
          </Link>
          {" · "}
          <Link className="link-nvidia" href="/nvidia-dli-workshops">
            NVIDIA DLI training
          </Link>
        </p>

        <NvidiaTrademark className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800" />
      </main>
      <ChatWidget />
    </div>
  );
}
