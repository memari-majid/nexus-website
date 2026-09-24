import type { Metadata } from "next";
import type { Person } from "@/lib/people";
import { DLI } from "@/lib/dli";
import { FAQS } from "@/lib/faq";
import { HAMID } from "@/lib/hamid";
import { MAJID } from "@/lib/majid";
import { SITE, SITE_URL } from "@/lib/site";
import { ASSISTANT_NAME } from "@/lib/chat-persona";

/**
 * Append only: sitemap priority is derived from index position. `/how-it-works`
 * was removed on 2026-09-13 and redirects to `/` in `next.config.ts`.
 */
export const INDEXABLE_PATHS = ["/", "/about", "/contact", "/nvidia-dli-workshops", "/ai-consultant", "/nvidia-dli-workshops/details"] as const;

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
  nvidiaDliDetails: {
    title: "Workshop details | Nexus AI Solutions",
    description: "Delivery, pricing, prerequisites and course details for your private NVIDIA DLI workshop with Nexus.",
  },
  aiConsultant: {
    title: `Try our ${ASSISTANT_NAME} | Nexus AI Solutions`,
    description:
      "Try our AI in a live conversation. Explore an idea for your team, draft a project brief, or find a useful first step. No signup needed.",
  },
  home: {
    title: "Nexus AI Solutions: US AI Consulting & NVIDIA DLI Training",
    description: SITE.description,
  },
  about: {
    title: "About Nexus AI Solutions",
    description:
      `Nexus AI Solutions is led by ${MAJID.fullName} (${MAJID.companyRole}), an NVIDIA DLI Certified Instructor who hosts industry workshops, and ${HAMID.fullName} (${HAMID.role}). AI consulting and training for companies across the United States: advisory work, NVIDIA DLI workshops, and in-house team sessions.`,
  },
  contact: {
    title: "Contact Nexus AI Solutions: AI Consulting & Training",
    description:
      "Email Nexus AI Solutions about AI consulting, team training and NVIDIA DLI workshops. Send a message to our team. We work with companies across the United States, on site or online.",
  },
  nvidiaDli: {
    title: "NVIDIA DLI Gen AI Workshops · Nexus AI Solutions",
    description:
      "Official NVIDIA Deep Learning Institute workshops for industry teams across the United States, hosted by a Certified Instructor on site or online. Building Agentic AI Applications With LLMs: eight hours, hands-on, with cloud GPU labs and an NVIDIA DLI certificate.",
  },
} as const;

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
    image: `${SITE_URL}${MAJID.photo}`,
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
    coursePrerequisites: DLI.prerequisites,
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
