import { MAJID } from "@/lib/majid";
import { FOUNDER_SAME_AS } from "@/lib/seo";
import { SITE, SITE_URL } from "@/lib/site";

export function JsonLd({ page = "/" }: { page?: string }) {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": `${SITE_URL}/#organization`,
        name: SITE.name,
        description: SITE.description,
        url: SITE_URL,
        image: `${SITE_URL}/og-image.png`,
        telephone: SITE.phone,
        email: SITE.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: SITE.addressLocality,
          addressRegion: SITE.addressRegion,
          addressCountry: SITE.addressCountry,
        },
        areaServed: { "@type": "Country", name: "United States" },
        founder: { "@id": `${SITE_URL}/#person` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}/#person`,
        name: MAJID.fullName,
        givenName: "Majid",
        familyName: "Memari",
        alternateName: [MAJID.displayName, "Majid Memari"],
        honorificSuffix: "Ph.D.",
        jobTitle: MAJID.roles.nexus,
        url: MAJID.personalSite,
        image: `${SITE_URL}/majid-memari.png`,
        sameAs: [...FOUNDER_SAME_AS],
        worksFor: { "@id": `${SITE_URL}/#organization` },
        affiliation: {
          "@type": "CollegeOrUniversity",
          name: MAJID.university,
          url: "https://www.uvu.edu/",
        },
      },
      {
        "@type": page === "/about" ? "ProfilePage" : "WebPage",
        "@id": `${SITE_URL}${page === "/" ? "" : page}#page`,
        url: page === "/" ? SITE_URL : `${SITE_URL}${page}`,
        name: page === "/about" ? "Majid Memari — Founder of Nexus AI Solutions" : SITE.name,
        isPartOf: { "@id": `${SITE_URL}/#organization` },
        about: { "@id": `${SITE_URL}/#person` },
        mainEntity: { "@id": page === "/about" ? `${SITE_URL}/#person` : `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
