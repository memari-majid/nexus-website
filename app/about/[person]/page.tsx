import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/app/components/Avatar";
import { ChatWidget } from "@/app/components/ChatWidget";
import { NavBar } from "@/app/components/NavBar";
import { NvidiaBadge } from "@/app/components/NvidiaBadge";
import { PEOPLE, getPerson } from "@/lib/people";
import { breadcrumbJsonLd, organizationJsonLd, personJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE, SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return PEOPLE.map((p) => ({ person: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ person: string }>;
}): Promise<Metadata> {
  const { person: slug } = await params;
  const person = getPerson(slug);
  if (!person) return {};

  const title = `${person.displayName} — ${person.role}, Nexus AI Solutions`;
  const path = `/about/${person.slug}`;
  return {
    title: { absolute: title },
    description: person.summary,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: person.summary,
      url: path,
      type: "profile",
      images: [{ url: person.image, alt: person.displayName }],
    },
    twitter: { title, description: person.summary, images: [person.image] },
  };
}

export default async function PersonPage({ params }: { params: Promise<{ person: string }> }) {
  const { person: slug } = await params;
  const person = getPerson(slug);
  if (!person) notFound();

  const url = `${SITE_URL}/about/${person.slug}`;
  const graph = [
    organizationJsonLd(),
    websiteJsonLd(),
    personJsonLd(person),
    {
      "@type": "ProfilePage",
      "@id": `${url}#page`,
      url,
      name: `${person.displayName} — ${person.role}, ${SITE.name}`,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/${person.schemaId}` },
      mainEntity: { "@id": `${SITE_URL}/${person.schemaId}` },
      inLanguage: "en-US",
    },
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
      { name: person.displayName, path: `/about/${person.slug}` },
    ]),
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
      <main className="mx-auto max-w-2xl px-4 pb-24 pt-[calc(6rem+env(safe-area-inset-top))] sm:px-6">
        <p className="text-sm">
          <Link className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" href="/about">
            ← Team
          </Link>
        </p>

        <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Avatar
            photo={person.photo}
            initials={person.initials}
            name={person.displayName}
            role={person.role}
            size={128}
          />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
              {person.displayName}
            </h1>
            <p className="mt-2 text-base font-medium text-zinc-800 dark:text-zinc-200">
              {person.roleLong}
            </p>
            {person.nvidiaCertified ? (
              <div className="mt-4">
                <NvidiaBadge />
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-10 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {person.summary}
        </p>

        <div className="mt-10 space-y-8">
          {person.bio.map((block) => (
            <div key={block.text.slice(0, 40)}>
              {block.heading ? (
                <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {block.heading}
                </h2>
              ) : null}
              <p
                className={`text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 ${
                  block.heading ? "mt-2" : ""
                }`}
              >
                {block.text}
              </p>
            </div>
          ))}
        </div>

        <ul className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-200 pt-8 text-sm dark:border-zinc-800">
          {person.links.map((link) => (
            <li key={link.href}>
              <a
                className="text-sky-600 underline dark:text-sky-400"
                href={link.href}
                target="_blank"
                rel="me noopener noreferrer"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-sm">
          <Link className="text-sky-600 underline dark:text-sky-400" href="/contact">
            Contact Nexus
          </Link>
        </p>
      </main>
      <ChatWidget />
    </div>
  );
}
