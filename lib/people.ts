import { HAMID } from "@/lib/hamid";
import { MAJID } from "@/lib/majid";
import { MOHAMMAD } from "@/lib/mohammad";

/**
 * One registry for the three leadership profiles. Everything that renders a
 * person — the homepage row, /about, and each /about/<slug> page — reads from
 * here so the three stay structurally identical.
 *
 * `displayName` is what the site shows; `schemaName` is the legal name used in
 * structured data. Keep both accurate: never invent titles or affiliations,
 * and remember each person's academic employer is their own appointment, not a
 * Nexus sponsor.
 */

export type PersonLink = { label: string; href: string };
export type BioBlock = { heading?: string; text: string };

export type Person = {
  slug: string;
  displayName: string;
  schemaName: string;
  schemaId: string;
  role: string;
  roleLong: string;
  photo: string;
  initials: string;
  /** One line for cards and page descriptions. */
  summary: string;
  bio: BioBlock[];
  links: PersonLink[];
  image: string;
  /**
   * True only for the person NVIDIA certified individually. It drives the
   * credential badge and the trademark notice on his profile page — never set
   * it for someone who does not hold the certification.
   */
  nvidiaCertified?: boolean;
};

export const PEOPLE: Person[] = [
  {
    slug: "majid-memari",
    displayName: MAJID.fullName,
    schemaName: MAJID.name,
    schemaId: "#person",
    role: "Founder & CEO",
    roleLong: MAJID.roles.nexus,
    photo: "/team-majid-memari.jpg",
    initials: "MM",
    summary: MAJID.shortBio,
    bio: [
      { heading: "Research", text: MAJID.bio.academia },
      { heading: "Industry", text: MAJID.bio.industry },
      { heading: "Community", text: MAJID.bio.community },
    ],
    links: [
      { label: "LinkedIn", href: MAJID.linkedin },
      { label: "majidmemari.com", href: MAJID.personalSite },
      { label: "Google Scholar", href: MAJID.scholar },
      { label: "ORCID", href: MAJID.orcid },
      { label: "NVIDIA Certified Instructor Directory", href: MAJID.nvidiaInstructorDirectory },
    ],
    image: "/team-majid-memari.jpg",
    nvidiaCertified: true,
  },
  {
    slug: "hamid-memari",
    displayName: HAMID.fullName,
    schemaName: HAMID.fullName,
    schemaId: "#hamid",
    role: HAMID.role,
    roleLong: HAMID.roles.nexus,
    photo: HAMID.photo,
    initials: "HM",
    summary: HAMID.shortBio,
    bio: HAMID.bio.map((text) => ({ text })),
    links: [{ label: "LinkedIn", href: HAMID.linkedin }],
    image: HAMID.photo,
  },
  {
    slug: "mohammad-jafarinejad",
    displayName: MOHAMMAD.displayName,
    schemaName: MOHAMMAD.name,
    schemaId: "#mohammad",
    role: MOHAMMAD.role,
    roleLong: MOHAMMAD.roles.nexus,
    photo: MOHAMMAD.photo,
    initials: MOHAMMAD.initials,
    summary: MOHAMMAD.shortBio,
    bio: MOHAMMAD.bio.map((text) => ({ text })),
    links: [
      { label: "LinkedIn", href: MOHAMMAD.linkedin },
      { label: "Google Scholar", href: MOHAMMAD.scholar },
    ],
    image: MOHAMMAD.photo,
  },
];

export function getPerson(slug: string): Person | undefined {
  return PEOPLE.find((p) => p.slug === slug);
}

export const PERSON_PATHS = PEOPLE.map((p) => `/about/${p.slug}`);
