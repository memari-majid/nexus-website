import { PEOPLE } from "@/lib/people";

/**
 * Compact homepage team row. Derived from the same registry as /about so the
 * names, roles, and portraits can never drift apart.
 */
export const TEAM = PEOPLE.map((person) => ({
  key: person.slug,
  slug: person.slug,
  name: person.displayName,
  role: person.role,
  experience: person.experience,
  expertiseHighlight: person.expertiseHighlight,
  expertiseLogo: person.expertiseLogo,
  nvidiaCertified: person.nvidiaCertified === true,
  photo: person.photo,
  initials: person.initials,
  linkedin: person.links[0].href,
}));
