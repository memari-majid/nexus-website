import { HAMID } from "@/lib/hamid";
import { MAJID } from "@/lib/majid";

/**
 * One registry for the leadership profiles. Everything that renders a
 * person — the homepage row, /about, and each /about/<slug> page — reads from
 * here so the profiles stay structurally identical.
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
  /** Names without credentials when the team is shown side by side. */
  teamName: string;
  schemaName: string;
  schemaId: string;
  role: string;
  roleLong: string;
  photo: string;
  portraitScale?: number;
  initials: string;
  /** One line for cards and page descriptions. */
  summary: string;
  experience: string;
  expertiseHighlight?: string;
  expertiseLogo?: { src: string; alt: string };
  bio: BioBlock[];
  links: PersonLink[];
  image: string;
  /**
   * True only for the person NVIDIA certified individually. It drives the
   * credential badge on his profile page — never set it for someone who does
   * not hold the certification.
   */
  nvidiaCertified?: boolean;
};

export const PEOPLE: Person[] = [
  {
    slug: "majid-memari",
    displayName: MAJID.fullName,
    teamName: MAJID.name,
    schemaName: MAJID.name,
    schemaId: "#person",
    role: MAJID.companyRole,
    roleLong: MAJID.roles.nexus,
    photo: MAJID.photo,
    portraitScale: MAJID.portraitScale,
    initials: "MM",
    summary: MAJID.shortBio,
    experience: MAJID.experience,
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
    image: MAJID.photo,
    nvidiaCertified: true,
  },
  {
    slug: "hamid-memari",
    displayName: HAMID.fullName,
    teamName: HAMID.fullName,
    schemaName: HAMID.fullName,
    schemaId: "#hamid",
    role: HAMID.role,
    roleLong: HAMID.roles.nexus,
    photo: HAMID.photo,
    portraitScale: HAMID.portraitScale,
    initials: "HM",
    summary: HAMID.shortBio,
    experience: HAMID.experience,
    expertiseHighlight: HAMID.expertiseHighlight,
    expertiseLogo: HAMID.expertiseLogo,
    bio: [...HAMID.bio.map((text) => ({ text })), { heading: "Stanford coursework", text: HAMID.coursework }],
    links: [{ label: "LinkedIn", href: HAMID.linkedin }],
    image: HAMID.photo,
  },
];

export function getPerson(slug: string): Person | undefined {
  return PEOPLE.find((p) => p.slug === slug);
}

export const PERSON_PATHS = PEOPLE.map((p) => `/about/${p.slug}`);
