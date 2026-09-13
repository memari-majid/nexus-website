import {
  breadcrumbJsonLd,
  founderJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { SITE, SITE_URL } from "@/lib/site";

type JsonLdPage = "/" | "/about" | "/contact";

export function JsonLd({ page = "/" }: { page?: JsonLdPage }) {
  const url = page === "/" ? SITE_URL : `${SITE_URL}${page}`;
  const graph: Record<string, unknown>[] = [organizationJsonLd(), founderJsonLd(), websiteJsonLd()];

  if (page === "/") {
    // No FAQPage here: the homepage does not render the FAQ, and Google
    // requires the questions to be visible on the page that declares them.
    graph.push({
      "@type": "WebPage",
      "@id": `${SITE_URL}#page`,
      url: SITE_URL,
      name: SITE.name,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      mainEntity: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-US",
    });
  } else if (page === "/about") {
    graph.push(
      {
        "@type": "ProfilePage",
        "@id": `${url}#page`,
        url,
        name: "About Nexus AI Solutions — Majid Memari and Hamid Memari",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#person` },
        mainEntity: { "@id": `${SITE_URL}/#person` },
        inLanguage: "en-US",
      },
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ]),
    );
  } else {
    graph.push(
      {
        "@type": "ContactPage",
        "@id": `${url}#page`,
        url,
        name: "Contact Nexus AI Solutions",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]),
    );
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }}
    />
  );
}
