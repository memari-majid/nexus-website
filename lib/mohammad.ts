/**
 * Public Nexus listing for Mohammad Jafarinejad, CFO.
 * Facts come from his public LinkedIn profile and Google Scholar:
 *   linkedin.com/in/mohammad-jafarinejad-0530a438
 * His professorship is his own academic appointment — never imply his
 * university sponsors, endorses, or contracts Nexus work. Per site policy the
 * institution is described generically; his LinkedIn carries the specifics.
 * Name style matches the founder: postnominal "PhD", never a "Dr." prefix.
 */

export const MOHAMMAD = {
  /** Shown on the site — the full surname wraps badly in the team cards. */
  displayName: "Mohammad JN, PhD",
  fullName: "Mohammad Jafarinejad, PhD",
  /** Legal name, kept for structured data so search engines resolve him. */
  name: "Mohammad Jafarinejad",
  role: "Chief Financial Officer",
  roles: {
    nexus: "Chief Financial Officer, Nexus AI Solutions LLC",
  },
  shortBio:
    "Leads pricing and engagement economics. PhD in Finance, MBA, and a tenured finance professor since 2016.",
  bio: [
    "Owns pricing, engagement structure, delivery cost, and financial planning.",
    "Teaches investments, financial markets and institutions, banking, and corporate finance. Currently a teaching and research fellow in Europe.",
    "Publishes peer-reviewed research on corporate finance, banking, and behavioral finance.",
  ],
  linkedin: "https://www.linkedin.com/in/mohammad-jafarinejad-0530a438",
  scholar: "https://scholar.google.com/citations?user=uq-NvJEAAAAJ&hl=en",
  photo: "/team-mohammad-jafarinejad.jpg",
  initials: "MJ",
} as const;
