/**
 * Canonical public facts about Majid Memari, PhD.
 * Name style: postnominal only — "Majid Memari, PhD". Never combine a "Dr."
 * prefix with a PhD suffix, and do not use "Ph.D." with periods.
 * Sources (do not invent grants, employers, or metrics):
 *   Teaching/uvu_courses/template/instructor_profile.py
 *   Teaching/uvu_courses/portfolio/tenure/data/personal.md
 *   Teaching/uvu_courses/portfolio/tenure/data/teaching.md
 *   Teaching/uvu_courses/portfolio/tenure/data/scholarship.md
 *   Teaching/uvu_courses/portfolio/tenure/data/service_professional.md
 * Stanford / Johns Hopkins are Penn collaborations, not employers.
 * Silicon Slopes is community, not an employer. NVIDIA DLI is instructional certification.
 * Public bio is three buckets: Academia · Industry · Community (instructor_profile bio_full).
 * AI Utah 100 (2026): he is a published honoree — not a winner, #1, or category.
 *
 * DELIBERATE OMISSION (2026-09-12): his current UVU faculty appointment, the
 * UVU courses he teaches, and the UVU directory link are **not published on
 * this commercial site**, to avoid any appearance of a conflict of interest
 * between university employment and Nexus client work. Prior appointments
 * (Penn, SIU) and his PhD stay — they are history, not a current employer.
 * Do not reintroduce the UVU title, course list, or directory link here.
 *
 * NAMED PRIOR RESEARCH (2026-09-12, owner request): prior research
 * institutions ARE named and promoted — Penn, Stanford, Johns Hopkins, the
 * University of Utah One-U Responsible AI Initiative, SIU Carbondale. Two
 * hard limits:
 *   1. The postdoctoral appointment was **Penn**. Stanford and Johns Hopkins
 *      were research **collaborations that came through** that appointment.
 *      Never write them as employers, appointments, or affiliations, and never
 *      imply any of them sponsors or endorses Nexus.
 *   2. The diploma is a **PhD in Computer Science**; the doctoral research was
 *      generative AI. Write "PhD in Computer Science with doctoral research in
 *      generative AI" — never a degree titled "PhD in Generative AI", and
 *      never in structured data or a formal credential line.
 * Present-day emphasis is LLMs, agents, retrieval, and evaluation. Do not
 * backdate that: the doctoral research was generative models, not LLMs.
 */

export const MAJID = {
  fullName: "Majid Memari, PhD",
  /** Bare name for mid-sentence or spoken use — no title, no postnominal. */
  name: "Majid Memari",
  displayName: "Majid (MJ) Memari",
  shortBio:
    "NVIDIA DLI Certified Instructor for industry workshops; University Ambassador for free campus workshops. LLMs, agents, and retrieval. PhD in Computer Science with doctoral research in generative AI, in applied AI since 2015.",
  headlineRole: "AI Scientist & Solution Architect",
  roles: {
    nvidia:
      "NVIDIA DLI Certified Instructor (industry workshops) and University Ambassador (free campus workshops)",
    herbert: "Principal AI Architect, Gary R. Herbert Institute for Public Policy",
    rai: "AI Consultant, University of Utah One-U Responsible AI Initiative",
    nexus: "Founder & CEO, Nexus AI Solutions LLC",
  },
  clientOffer: {
    label: "AI consulting and training",
    summary:
      "We advise organizations on how to adopt AI — and when not to — and we train teams through workshops and in-house sessions.",
  },
  education: {
    /** Formal credential line — the official degree name, never "Generative AI". */
    phd: "PhD in Computer Science, Southern Illinois University Carbondale (2023)",
    /** What the doctorate was *about*. Safe to promote; the degree title is not. */
    phdResearch:
      "Doctoral research in generative AI — conditional VAE and GAN models for synthetic-image generation and evaluation",
    ms: "M.S. in Computer Science, Southern Illinois University Carbondale (2017)",
    mba: "M.B.A., Islamic Azad University (2015)",
    basc: "B.A.Sc. in Industrial Engineering, Islamic Azad University (2010)",
  },
  prior: {
    /**
     * A 2023–2024 postdoc at his current university employer also exists. It is
     * deliberately not stored as publishable copy here — naming it would name
     * the employer this site omits. Do not add it back as a string.
     */
    penn: "Postdoctoral Researcher, University of Pennsylvania (2023)",
    /** Collaborations only — never phrase these as appointments or employers. */
    pennCollaborations:
      "Research collaborations with Stanford and Johns Hopkins came through the Penn appointment — collaborations, not appointments",
    utahRai: "AI Consultant, University of Utah One-U Responsible AI Initiative",
    siu: "Research Assistant, Southern Illinois University Carbondale (2015–2022)",
  },
  /**
   * Experience is stated as a **start year**, never as a running count —
   * "since 2015", not "11 years". Counts go stale the moment they ship.
   * For the same reason, do not publish Google Scholar citation totals or
   * publication counts on this site; they change and invite inflation.
   * 2015 = start of graduate research in applied AI & CS. Do not claim 20 years.
   * PhD: Computer Science (2023); thesis is synthetic-image / generative-model
   *      evaluation (C-VAE, C-GAN). Do not market it as an "R1 PhD".
   * AI Utah 100: 2026 Yearbook Honoree List (official name; not "Utah AI 100").
   *      Community-nominated, then expert panel. No category, not a winner or
   *      a ranking. No $1M claim anywhere (GridEye USHE is a proposal).
   */
  careerStartYear: 2015,
  aiUtah100: {
    label: "2026 AI Utah 100 honoree",
    url: "https://www.aiutah.org/ai-utah-100/",
  },
  /**
   * Three public buckets. **Prior** research institutions are named; the
   * current employer is not, and no campus, agency, or partner firm is
   * presented as a Nexus sponsor. Academia leads with LLMs — that is the
   * present-day work and what Nexus sells — with the doctoral generative-AI
   * research behind it. Keep the Penn-appointment / Stanford-and-JHU-
   * collaboration distinction intact in any rewrite.
   */
  bio: {
    academia:
      "Research on LLMs, agents, and retrieval. PhD in Computer Science with doctoral research in generative AI — conditional VAE and GAN models for synthetic-image generation and evaluation. Postdoctoral research at the University of Pennsylvania; that appointment brought research collaborations with Stanford and Johns Hopkins. Teaches applied AI and AI entrepreneurship at the university level.",
    industry:
      "Advises on LLM and agent workflows: RAG over private data, agentic tool use, evaluation and guardrails — and when not to use AI. Earlier work in healthcare data science.",
    community:
      "AI for data governance and privacy with public institutions, and responsible-AI policy. 2026 AI Utah 100 honoree.",
  },
  scholar: "https://scholar.google.com/citations?user=LQI4T24AAAAJ&hl=en",
  linkedin: "https://www.linkedin.com/in/majid-memari",
  github: "https://github.com/memari-majid",
  orcid: "https://orcid.org/0000-0001-5654-4996",
  researchGate: "https://www.researchgate.net/profile/Majid-Memari",
  nvidiaInstructorDirectory:
    "https://www.nvidia.com/en-eu/training/instructor-directory/bio/?instructorId=003Vv00000J9hZLIAZ",
  nvidiaTraining: "https://www.nvidia.com/en-us/training/",
  personalSite: "https://www.majidmemari.com",
  nexusSite: "https://nexusaisolution.net",
  /**
   * No publication or citation counts live here — they go stale and invite
   * inflation. Link to Scholar and ORCID instead and let them do the counting.
   */
  /**
   * Academic experience is referenced **indirectly** on this site — university
   * teaching and research as background, never a named current employer,
   * department, course catalog, or campus program.
   */
  teachingBackground:
    "He teaches applied AI, machine learning, and AI entrepreneurship at the university level, and brings that classroom method into Nexus team training.",
} as const;
