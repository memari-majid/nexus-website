/**
 * Canonical public facts about Dr. Majid Memari.
 * Sources (do not invent grants, employers, or metrics):
 *   Teaching/uvu_courses/template/instructor_profile.py
 *   Teaching/uvu_courses/portfolio/tenure/data/personal.md
 *   Teaching/uvu_courses/portfolio/tenure/data/teaching.md
 *   Teaching/uvu_courses/portfolio/tenure/data/scholarship.md
 *   Teaching/uvu_courses/portfolio/tenure/data/service_professional.md
 * Stanford / Johns Hopkins are Penn collaborations, not employers.
 * Silicon Slopes is community, not an employer. NVIDIA DLI is instructional certification.
 * Public bio is three buckets: Academia · Industry · Community (instructor_profile bio_full).
 * AI Utah 100 (2026): say "selected for"; do not invent a winner category.
 */

export const MAJID = {
  fullName: "Dr. Majid Memari",
  displayName: "Majid (MJ) Memari",
  shortBio:
    "Assistant Professor of Computer Science at Utah Valley University; NVIDIA University Ambassador and DLI Certified Instructor.",
  jobTitle: "Assistant Professor of Computer Science",
  department: "Department of Computer Science",
  university: "Utah Valley University",
  roles: {
    uvu: "Assistant Professor of Computer Science, Utah Valley University (2024–present)",
    nvidia: "NVIDIA University Ambassador and Deep Learning Institute Certified Instructor",
    herbert: "Principal AI Architect, Gary R. Herbert Institute for Public Policy",
    rai: "AI Consultant, University of Utah One-U Responsible AI Initiative",
    nexus: "Founder & Principal AI Architect, Nexus AI Solutions LLC",
  },
  clientOffer: {
    label: "AI consulting and team training",
    summary:
      "Advisory engagements on how to adopt AI, plus instructor-led workshops and in-house team training.",
  },
  education: {
    phd: "Ph.D. in Computer Science, Southern Illinois University Carbondale (2023)",
    ms: "M.S. in Computer Science, Southern Illinois University Carbondale (2017)",
    mba: "M.B.A., Islamic Azad University (2015)",
  },
  prior: {
    uvuPostdoc: "Postdoctoral Researcher, Utah Valley University (2023–2024)",
    penn: "Postdoc, University of Pennsylvania (2023); Stanford and Johns Hopkins collaborations from that appointment",
    siu: "Research Assistant, Southern Illinois University Carbondale (2015–2022)",
  },
  siliconSlopes: "https://www.siliconslopes.com/",
  clarion: "Clarion AI Partners",
  potentia: "Potentia Analytics",
  aiUtah100: {
    label: "selected for the 2026 AI Utah 100",
    url: "https://www.aiutah.org/ai-utah-100/",
  },
  bio: {
    academia:
      "Majid is Assistant Professor of Computer Science at Utah Valley University. He teaches and researches applied AI, machine learning, and generative AI, including UVU work on drone RGB and thermal imaging for wind-turbine maintenance. Prior research includes the University of Utah One-U Responsible AI Initiative, a postdoc at the University of Pennsylvania (with Stanford and Johns Hopkins collaborations), and research-assistant work at Southern Illinois University Carbondale.",
    industry:
      "In Utah's Silicon Slopes tech community he consults with Clarion AI Partners on LLM and agent workflows—including when to use AI and when not to. Through Nexus AI Solutions he provides AI consulting and team training: advisory work, workshops, and in-house sessions. He is a Certified Instructor for the NVIDIA Deep Learning Institute, and earlier did data-science work at Potentia Analytics.",
    community:
      "At the Gary R. Herbert Institute for Public Policy he collaborates with the Utah Office of Data Privacy and the Utah Department of Health and Human Services (DHHS) on AI for data governance and privacy, and contributes to One-U RAI public and policy conversations. He was selected for the 2026 AI Utah 100.",
  },
  scholar: "https://scholar.google.com/citations?user=LQI4T24AAAAJ&hl=en",
  linkedin: "https://www.linkedin.com/in/majid-memari",
  github: "https://github.com/memari-majid",
  orcid: "https://orcid.org/0000-0001-5654-4996",
  researchGate: "https://www.researchgate.net/profile/Majid-Memari",
  uvuDirectory: "https://www.uvu.edu/directory/employee/?id=VW1ra3dUZ0I5YmpXcUYwaE1LN1kxZz09",
  personalSite: "https://www.majidmemari.com",
  nexusSite: "https://nexusaisolution.net",
  scholarListedWorks: 20,
  fall2026Courses: [
    "CS-1400 Fundamentals of Programming (online)",
    "CS-2700 Causal Inference (online)",
    "CS 6470 Machine Learning (online, MS-AAI)",
    "CS 4720R AI Business and Tech Solutions (in-person)",
  ],
} as const;
