import type { Metadata } from "next";
import type { Person } from "@/lib/people";
import { DLI } from "@/lib/dli";
import { FAQS } from "@/lib/faq";
import { HAMID } from "@/lib/hamid";
import { MAJID } from "@/lib/majid";
import { MOHAMMAD } from "@/lib/mohammad";
import { SITE, SITE_URL } from "@/lib/site";

/** Append only: sitemap priority is derived from index position. */
export const INDEXABLE_PATHS = [
  "/",
  "/about",
  "/contact",
  "/nvidia-dli-workshops",
  "/how-it-works",
] as const;

export function absoluteUrl(path = "/"): string {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path}`;
}

export const FOUNDER_SAME_AS = [
  MAJID.personalSite,
  MAJID.linkedin,
  MAJID.github,
  MAJID.scholar,
  MAJID.orcid,
  MAJID.researchGate,
  MAJID.nvidiaInstructorDirectory,
  MAJID.aiUtah100.url,
] as const;

export const PAGE_COPY = {
  home: {
    title: "Nexus AI Solutions: US AI Consulting & NVIDIA DLI Training",
    description: SITE.description,
  },
  about: {
    title: "About Nexus AI Solutions",
    description:
      "Nexus AI Solutions is led by Majid Memari, PhD (Founder & CEO), an NVIDIA DLI Certified Instructor who hosts industry workshops, with Hamid Memari (CTO) and Mohammad Jafarinejad, PhD (CFO). AI consulting and training for companies across the United States: advisory work, NVIDIA DLI workshops, and in-house team sessions.",
  },
  contact: {
    title: "Contact Nexus AI Solutions: AI Consulting & Training",
    description:
      "Contact Nexus AI Solutions about AI consulting, team training, and NVIDIA Deep Learning Institute workshops taught by a DLI Certified Instructor. We work with companies across the United States, on site or online. Call (801) 810-9152 or send a message and we will get back to you.",
  },
  nvidiaDli: {
    title: "NVIDIA DLI Gen AI Workshops · Nexus AI Solutions",
    description:
      "Official NVIDIA Deep Learning Institute workshops for industry teams across the United States, hosted by a Certified Instructor on site or online. Building Agentic AI Applications With LLMs: eight hours, hands-on, with cloud GPU labs and an NVIDIA DLI certificate.",
  },
  howItWorks: {
    title: "How Dr. MJ Works: Inside the Nexus AI Consultant Agent",
    description:
      "A teardown of Dr. MJ, the AI consultant agent on nexusaisolution.net: the consulting loop it runs, the tools it calls, the approval step before any email, the model picker with public list prices, per-reply cost, and the bake-off behind the default model.",
  },
} as const;

/** Breadcrumb trail for /how-it-works. The page inlines its own JSON-LD graph. */
export const HOW_IT_WORKS_BREADCRUMBS = [
  { name: "Home", path: "/" },
  { name: "How Dr. MJ works", path: "/how-it-works" },
];

/**
 * Shared 1200x630 social preview card. Relative so `metadataBase` in
 * app/layout.tsx resolves it to an absolute URL on every page.
 */
export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: SITE.name,
} as const;

export function pageMetadata(
  page: keyof typeof PAGE_COPY,
  path: (typeof INDEXABLE_PATHS)[number],
  ogType: "website" | "profile" = "website",
): Metadata {
  const copy = PAGE_COPY[page];
  return {
    title: { absolute: copy.title },
    description: copy.description,
    alternates: { canonical: path },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: path,
      siteName: SITE.name,
      locale: "en_US",
      type: ogType,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [OG_IMAGE],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#organization`,
    name: SITE.name,
    alternateName: ["Nexus AI", "Nexus AI Solutions"],
    description: PAGE_COPY.home.description,
    url: SITE_URL,
    image: `${SITE_URL}/og-image.png`,
    logo: `${SITE_URL}/nexus-logo.png`,
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.streetAddress,
      addressLocality: SITE.addressLocality,
      addressRegion: SITE.addressRegion,
      postalCode: SITE.postalCode,
      addressCountry: SITE.addressCountry,
    },
    /** Home base is Sandy, UT (see address above); the service area is the whole US. */
    areaServed: { "@type": "Country", name: "United States" },
    founder: { "@id": `${SITE_URL}/#person` },
    employee: [
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#hamid`,
        name: HAMID.fullName,
        jobTitle: HAMID.role,
        description: HAMID.bio.join(" "),
        url: HAMID.linkedin,
        image: `${SITE_URL}${HAMID.photo}`,
        sameAs: [HAMID.linkedin],
        worksFor: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#mohammad`,
        name: MOHAMMAD.name,
        alternateName: [MOHAMMAD.displayName, "Mohammad JN"],
        honorificSuffix: "PhD",
        jobTitle: MOHAMMAD.role,
        description: MOHAMMAD.bio.join(" "),
        url: MOHAMMAD.linkedin,
        image: `${SITE_URL}${MOHAMMAD.photo}`,
        sameAs: [MOHAMMAD.linkedin, MOHAMMAD.scholar],
        worksFor: { "@id": `${SITE_URL}/#organization` },
      },
    ],
    knowsAbout: [
      "AI consulting",
      "Team training",
      "AI workshops",
      "AI Solution Architect",
      "Applied AI",
      "Gen AI",
      "Generative AI",
      "Retrieval-augmented generation",
      "RAG",
      "Agentic AI",
      "Evaluation and guardrails",
      "Multimodal vision and language",
    ],
    sameAs: [MAJID.personalSite, MAJID.linkedin, MAJID.aiUtah100.url],
  };
}

export function founderJsonLd() {
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: MAJID.name,
    givenName: "Majid",
    familyName: "Memari",
    alternateName: [MAJID.displayName, MAJID.fullName],
    honorificSuffix: "PhD",
    jobTitle: [MAJID.roles.nexus, MAJID.headlineRole],
    award: MAJID.aiUtah100.label,
    description: `${MAJID.roles.nexus}. ${MAJID.headlineRole}. ${MAJID.shortBio} He is a ${MAJID.aiUtah100.label}.`,
    url: MAJID.personalSite,
    image: `${SITE_URL}/team-majid-memari.jpg`,
    sameAs: [...FOUNDER_SAME_AS],
    worksFor: { "@id": `${SITE_URL}/#organization` },
    knowsAbout: [
      "AI consulting",
      "Team training",
      "AI Solution Architect",
      "Applied AI",
      "Gen AI",
      "Generative AI",
      "RAG",
      "Agentic AI",
      "AI Entrepreneurship",
      "NVIDIA Deep Learning Institute",
    ],
  };
}

/**
 * Course schema for the DLI workshop. Provider is NVIDIA — they own the
 * curriculum, assessment, and certificate; Nexus is the instructor.
 */
export function dliCourseJsonLd() {
  return {
    "@type": "Course",
    "@id": `${SITE_URL}/nvidia-dli-workshops#course`,
    name: DLI.workshop.title,
    description: `${DLI.workshop.summary} ${DLI.model}`,
    url: DLI.workshop.courseUrl,
    inLanguage: "en-US",
    provider: {
      "@type": "Organization",
      name: "NVIDIA Deep Learning Institute",
      url: "https://www.nvidia.com/en-us/training/",
    },
    instructor: { "@id": `${SITE_URL}/#person` },
    teaches: DLI.outline.map((m) => m.title),
    coursePrerequisites: "Intermediate Python experience",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: ["Onsite", "Online"],
      courseWorkload: "PT8H",
      instructor: { "@id": `${SITE_URL}/#person` },
    },
    offers: {
      "@type": "Offer",
      category: "Instructor-led workshop",
      seller: {
        "@type": "Organization",
        name: "NVIDIA Deep Learning Institute",
        url: "https://www.nvidia.com/en-us/training/",
      },
    },
  };
}

/** Person schema for an individual /about/<slug> profile page. */
export function personJsonLd(person: Person) {
  return {
    "@type": "Person",
    "@id": `${SITE_URL}/${person.schemaId}`,
    name: person.schemaName,
    jobTitle: person.role,
    description: person.bio.map((b) => b.text).join(" "),
    image: `${SITE_URL}${person.image}`,
    url: absoluteUrl(`/about/${person.slug}`),
    sameAs: person.links.map((l) => l.href),
    worksFor: { "@id": `${SITE_URL}/#organization` },
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE.name,
    alternateName: ["Nexus AI", "Nexus AI Solutions"],
    url: SITE_URL,
    description: PAGE_COPY.home.description,
    inLanguage: "en-US",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function faqJsonLd() {
  return {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    url: `${SITE_URL}/#faq`,
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
