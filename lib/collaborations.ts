/**
 * Current Nexus collaborations — **industry and public-sector** only.
 *
 * This commercial site does not publish campus, Ambassador, or free-workshop
 * work. Do not name individual agencies, partner companies, or programs here.
 *
 * Exception (elsewhere): the founder's **prior** research pedigree in
 * `lib/majid.ts` may name Penn, Stanford, Johns Hopkins, One-U RAI, and SIU
 * under the rules in `AGENTS.md`.
 *
 * INTEGRITY RULE: describe proposals as proposals, never as awards.
 */

export const UNIVERSITY_COLLABORATIONS = {
  heading: "Collaborations",
  summary: "Alongside client work we collaborate with industry teams and public institutions.",
  items: [
    {
      name: "Industry teams",
      text: "Applied AI consulting, NVIDIA DLI workshops, and custom team training.",
    },
    {
      name: "Public institutions",
      text: "AI for data governance, privacy, and responsible-AI policy.",
    },
  ],
  note: "These are separate from client statements of work. None of those institutions sponsors or endorses Nexus.",
} as const;
