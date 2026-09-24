import type { Metadata } from "next";
import Link from "next/link";
import { NavBar } from "@/app/components/NavBar";
import { TryOurAi } from "@/app/components/demo/TryOurAi";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("aiConsultant", "/ai-consultant");

export default function AiConsultantPage() {
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <NavBar chatHref="#ai-consultant-chat" />
      <main className="mx-auto min-w-0 max-w-3xl px-4 pb-10 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <header className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Try our AI</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-600 dark:text-zinc-400">
            Tell it what your team does and explore where AI could help.
          </p>
          <p className="mt-2 text-sm text-zinc-500">No signup needed</p>
        </header>

        <section id="ai-consultant-chat" aria-label="Live AI demo" className="mt-6 scroll-mt-24">
          <TryOurAi standalone />
        </section>

        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Want something like this for your team?{" "}
          <Link href="/contact" className="text-sky-600 underline underline-offset-4 dark:text-sky-400">
            Contact our team
          </Link>
        </p>
      </main>
    </div>
  );
}
