import { MAJID } from "@/lib/majid";

/**
 * NVIDIA Deep Learning Institute workshop offering.
 *
 * Public claims are limited to the two accurate titles: **DLI Certified
 * Instructor** and **University Ambassador**. Never write "NVIDIA partner",
 * "NVIDIA-sponsored", or anything implying NVIDIA endorses Nexus.
 * Never publish the Ambassador program cost, projected profit, or any
 * workshop he is not certified to teach. Only list workshops below.
 *
 * Link official NVIDIA pages inline and in the quiet Resources list — do not
 * frame them as a “verify our claims” section. Re-check URLs before changing
 * them; several sibling NVIDIA paths 404. Last HTTP 200 check: 2026-09-12.
 */

export const DLI = {
  instructorTitle: "NVIDIA DLI Certified Instructor",
  ambassadorTitle: "NVIDIA University Ambassador",
  /** Person holds both titles — never mash them into one job. */
  credential:
    "NVIDIA DLI Certified Instructor (industry workshops) and University Ambassador (free campus workshops)",
  instructorDirectory: MAJID.nvidiaInstructorDirectory,
  instructorProgramUrl: "https://www.nvidia.com/en-us/learn/certified-instructor-program/",
  ambassadorProgramUrl:
    "https://www.nvidia.com/en-us/training/educator-programs/university-ambassador-program/",
  audiences: "Two tracks: industry teams hosted by a Certified Instructor, and free campus workshops through the University Ambassador Program.",
  workshop: {
    status: "Available now",
    title: "Building Agentic AI Applications With LLMs",
    length: "Eight hours · hands-on",
    summary:
      "NVIDIA NIM, LangChain, LangGraph, retrieval, multi-agent workflows, and agent deployment.",
    /** NVIDIA's own course outline, prerequisites, and certificate details. */
    courseUrl:
      "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-25+V1",
  },
  /**
   * Delivery model — keep this the first thing a busy buyer understands.
   * NVIDIA owns the product end to end; Nexus only hosts and teaches.
   * Never imply Nexus sets price, authors content, controls assessment,
   * issues the certificate, or that the customer needs local GPUs / infra.
   */
  model:
    "NVIDIA takes care of everything. Nexus only hosts and teaches — in person or online. Your company needs nothing: no GPUs, no local compute, no special infrastructure.",
  /** Explicit boundary — Nexus has no control over these. */
  boundary:
    "Nexus has no control over pricing, content, curriculum, assessment, or the certificate. Seats are purchased through NVIDIA at NVIDIA's rate.",
  nvidiaProvides: {
    heading: "NVIDIA provides",
    items: [
      "Cloud GPU VMs — you need no compute",
      "Pricing and purchase",
      "Course content and curriculum",
      "Assessment",
      "DLI certificate",
    ],
  },
  weProvide: {
    heading: "Nexus provides",
    items: [
      "Host — in person or online",
      "Teach",
      "Help participants pass the assessment",
    ],
  },
  logistics:
    "Private cohorts, in person or online. NVIDIA supplies the cloud labs. Allow six weeks to schedule.",
  /**
   * Two NVIDIA roles, two offers. Do not combine them into one sentence
   * that makes Ambassador and Certified Instructor sound like the same job.
   */
  industry: {
    heading: "Industry workshops",
    role: "DLI Certified Instructor",
    text: "We host the official workshop for company teams — in person or online. NVIDIA prices and sells the seats; a Certified Instructor teaches.",
  },
  /**
   * University Ambassador delivery: free to academic audiences. This is the
   * Ambassador program working as intended — students, faculty, and
   * researchers are not charged. Keep the six-week lead time attached, since
   * scheduling and lab access run through NVIDIA.
   */
  academia: {
    heading: "Free campus workshops",
    role: "University Ambassador",
    text: "Through the University Ambassador Program we teach this workshop at no cost to US academic institutions — students, faculty, and researchers. Give us six weeks' notice.",
  },
  /**
   * Module list summarised from NVIDIA's published course outline (courseUrl).
   * Describe only what NVIDIA documents — do not embellish the syllabus.
   */
  outline: [
    {
      title: "Agent fundamentals",
      text: "What an LLM agent is, where language models are strong, and where they fail — so your team can tell an agent-shaped problem from one that needs ordinary software.",
    },
    {
      title: "Structured outputs and tool use",
      text: "Constraining a model to machine-readable output so its responses can drive function calls and API integrations reliably.",
    },
    {
      title: "Retrieval and knowledge graphs",
      text: "Grounding agents in your domain knowledge with retrieval mechanisms and graph-backed context.",
    },
    {
      title: "Multi-agent systems with LangGraph",
      text: "Decomposing work across specialist agents, giving them communication channels, and running them concurrently with LangGraph orchestration.",
    },
    {
      title: "Deployment and final assessment",
      text: "Deploying an agent that schedules multiple retrieval operations and reports back — the hands-on assessment behind the NVIDIA DLI certificate.",
    },
  ],
  tools: [
    "NVIDIA NIM",
    "build.nvidia.com",
    "LangChain",
    "LangGraph",
    "Python",
    "PyTorch",
  ],
  /**
   * NVIDIA runs a much larger generative AI catalog. We link it so visitors can
   * browse, but we only deliver the workshop listed above — never imply
   * otherwise.
   */
  catalogNote:
    "NVIDIA publishes a wider generative AI catalog. We deliver the workshop above; for other DLI courses we will point you to NVIDIA or an instructor certified for it.",
  catalogUrl: "https://www.nvidia.com/en-us/training/",
  /** Official NVIDIA pages linked from Resources — labels only, no “verify” framing. */
  references: [
    {
      label: "Building Agentic AI Applications With LLMs",
      href: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-25+V1",
    },
    {
      label: "Certified Instructor Directory",
      href: MAJID.nvidiaInstructorDirectory,
    },
    {
      label: "Certified Instructor Program",
      href: "https://www.nvidia.com/en-us/learn/certified-instructor-program/",
    },
    {
      label: "University Ambassador Program",
      href: "https://www.nvidia.com/en-us/training/educator-programs/university-ambassador-program/",
    },
    {
      label: "Deep Learning Institute",
      href: "https://www.nvidia.com/en-us/training/",
    },
    {
      label: "Instructor-led workshops",
      href: "https://www.nvidia.com/en-us/training/instructor-led-workshops/",
    },
    {
      label: "Training course catalog (PDF)",
      href: "https://dam-cdn.nvd.orangelogic.com/AssetLink/12gb57sa4o276e5yl0kt6lnh70127335.pdf",
    },
    {
      label: "NIM documentation",
      href: "https://docs.nvidia.com/nim/",
    },
    {
      label: "build.nvidia.com",
      href: "https://build.nvidia.com/",
    },
    {
      label: "Agentic AI",
      href: "https://www.nvidia.com/en-us/solutions/ai/agentic-ai/",
    },
  ],
} as const;
