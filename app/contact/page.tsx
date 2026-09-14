import type { Metadata } from "next";
import { ChatWidget } from "@/app/components/ChatWidget";
import { ContactForm } from "@/app/components/ContactForm";
import { JsonLd } from "@/app/components/JsonLd";
import { NavBar } from "@/app/components/NavBar";
import { SiteFooter } from "@/app/components/SiteFooter";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("contact", "/contact");

export default function ContactPage() {
  return (
    <div className="min-h-screen min-w-0 bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <JsonLd page="/contact" />
      <NavBar />
      <main className="page-wrap max-w-2xl!">
        <header>
          <p className="eyebrow">Contact</p>
          <h1 className="display-title mt-6">Let’s talk</h1>
          <p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400">Send us a note. We’ll reply by email.</p>
        </header>
        <ContactForm />
      </main>
      <SiteFooter />
      <ChatWidget />
    </div>
  );
}
