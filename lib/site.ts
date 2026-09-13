export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nexusaisolution.net";

export const SITE = {
  name: "Nexus AI Solutions LLC",
  /**
   * One description for the layout metadata, the homepage, and organization
   * schema. NVIDIA appears as the founder's individual credential — never as a
   * partnership or endorsement.
   */
  description:
    "Nexus AI Solutions provides AI consulting and training to industry teams across the United States: NVIDIA Deep Learning Institute workshops hosted by a Certified Instructor, plus custom training designed around your company. Based in Utah, delivered on site or online. Founded by Majid Memari, AI Scientist and Solution Architect.",
  email: "info@nexusaisolution.net",
  /** Public customer-facing line — Google Voice. Not a Twilio / Vercel webhook endpoint. */
  phone: "+18018109152",
  phoneDisplay: "(801) 810-9152",
  streetAddress: "8330 S El Manicero",
  addressLocality: "Sandy",
  addressRegion: "UT",
  postalCode: "84093",
  addressCountry: "US",
  addressDisplay: "8330 S El Manicero, Sandy, UT 84093",
} as const;
