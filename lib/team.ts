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
  photo: person.photo,
  initials: person.initials,
  linkedin: person.links[0].href,
}));
