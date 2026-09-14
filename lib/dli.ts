import { MAJID } from "@/lib/majid";

/**
 * NVIDIA Deep Learning Institute workshop offering.
 *
 * This commercial site sells INDUSTRY delivery only. Public title:
 * **DLI Certified Instructor**. Do not publish University Ambassador,
 * free campus workshops, or academia as an audience.
 *
 * MARKET: Nexus is based in Sandy, Utah and delivers to companies across the
 * United States. In person means at the client site anywhere in the US, and
 * online is always an option. Utah is the home base, never the service area,
 * so no copy here may imply a Utah-only or regional market.
 *
 * Never write "NVIDIA partner", "NVIDIA-sponsored", or anything implying
 * NVIDIA endorses Nexus. $500/seat is Nexus's own industry rate — never call
 * it an NVIDIA-set or "official" price. Only name workshops from `catalog`.
 *
 * Link official NVIDIA pages in the categorized `referenceGroups` — never a
 * random dump, and not framed as "verify our claims". Re-check URLs before
 * changing them; several sibling NVIDIA paths 404. Last HTTP 200 check:
 * 2026-09-12.
 */

export const DLI = {
  instructorTitle: "NVIDIA DLI Certified Instructor",
  credential: "NVIDIA DLI Certified Instructor",
  instructorDirectory: MAJID.nvidiaInstructorDirectory,
  instructorProgramUrl: "https://www.nvidia.com/en-us/learn/certified-instructor-program/",
  audiences:
    "For industry teams across the United States. A Certified Instructor hosts the official workshop, in person at your offices or online.",
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
   * NVIDIA owns the product; Nexus hosts, teaches, and invoices.
   */
  model:
    "NVIDIA owns the labs, curriculum, assessment, and certificate. Nexus hosts and teaches, on site anywhere in the United States or online, and handles enrollment and invoicing. Your company needs nothing: no GPUs, no local compute, no special infrastructure.",
  /** What NVIDIA controls vs what Nexus does. */
  boundary:
    "NVIDIA owns the content, cloud GPU labs, assessment, and the DLI certificate. Nexus hosts, teaches as a Certified Instructor, and invoices you directly at $500 per seat.",
  nvidiaProvides: {
    heading: "NVIDIA provides",
    items: [
      "Cloud GPU VMs: you need no compute",
      "Course content and curriculum",
      "Assessment",
      "DLI certificate",
    ],
  },
  weProvide: {
    heading: "Nexus provides",
    items: [
      "Consulting to scope the training your team actually needs",
      "In-person hosting and teaching at your offices anywhere in the United States, or online",
      "The right NVIDIA-certified instructor for the topic",
      "A private cohort built around your team",
      "Help every participant pass the assessment",
      "Enrollment and a single invoice",
    ],
  },
  logistics:
    "Private industry cohorts anywhere in the United States, in person at your offices or online. NVIDIA supplies the cloud labs. Allow six weeks to schedule.",
  industry: {
    heading: "Industry workshops",
    role: "DLI Certified Instructor",
    text: "We host the official workshop for company teams anywhere in the United States, in person at your offices or online. A Certified Instructor teaches, and Nexus handles enrollment and invoicing.",
  },
  /**
   * Nexus's own industry pricing. $500/seat is a Nexus business decision, not
   * an NVIDIA public rate. Never quote a dollar figure for the quote tiers.
   */
  pricing: {
    seatPrice: 500,
    standardMax: 20,
    cohortMax: 40,
    currency: "USD",
    summary:
      "$500 per seat for groups up to 20, invoiced by Nexus. For 21 or more we send a tailored quote. Up to 40 per cohort for the best hands-on results; larger teams run as multiple cohorts.",
  },
  /** Why buy the training from Nexus instead of NVIDIA's public online seats. */
  whyNexus: {
    heading: "Why Nexus",
    points: [
      "We consult first to scope the right training, then deliver it, not a one-size course off a shelf.",
      "In person and hands-on. NVIDIA's public workshops are virtual; we come to your team anywhere in the United States (or run it online if you prefer).",
      "The full NVIDIA catalog, with the certified instructor matched to your topic.",
      "A private cohort built around your team's real work, not a room of strangers.",
      "We help every participant pass the assessment and earn the NVIDIA DLI certificate.",
    ],
  },
  /**
   * The engagement is consultative and bespoke, not a quick checkout. Set this
   * expectation early so nobody thinks they're buying a seat in five minutes.
   */
  process: {
    heading: "How it works",
    text: "We start with a conversation to understand your team and goals, give you honest AI guidance, then scope the right NVIDIA DLI training, match the certified instructor for it, and deliver in person at your offices anywhere in the United States, or online. Plan on roughly two to three months end to end.",
  },
  /** NVIDIA DLI training spans far more than generative AI. */
  domains: [
    "Generative AI & LLMs",
    "Accelerated Computing",
    "Data Science",
    "Deep Learning",
    "Graphics & Simulation",
  ],
  /**
   * NVIDIA keeps releasing new generative AI / LLM workshops, so the catalog
   * Nexus can arrange keeps growing.
   */
  alwaysNew:
    "NVIDIA's Deep Learning Institute adds new generative AI and LLM workshops regularly, so the catalog we can arrange keeps growing.",
  /**
   * How Nexus arranges catalog courses beyond the one it teaches: NVIDIA's own
   * enterprise request-training flow. Internal grounding — do not describe ALP
   * mechanics or the exact form fields to visitors.
   */
  reseller: {
    text: "Nexus teaches Building Agentic AI Applications With LLMs itself. For other catalog courses, Nexus can arrange delivery through NVIDIA's enterprise request-training flow, or point you to NVIDIA or another certified instructor.",
    requestTrainingUrl: "https://enterprise-support.nvidia.com/s/training/request-training",
  },
  /**
   * Verified NVIDIA Gen AI / LLM catalog. `hosted` marks the ONE course Nexus
   * teaches in-house; the rest are courses Nexus can arrange. `keywords` drive
   * the needs-based recommendation in lib/recommend.ts. Never surface a title
   * that is not in this list. Last verified: 2026-09-12.
   */
  catalog: [
    {
      key: "agentic-llm",
      title: "Building Agentic AI Applications With LLMs",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-25+V1",
      blurb:
        "Design agents that retrieve and refine information, route queries, and run tasks concurrently with NVIDIA NIM, LangChain, and LangGraph. Instructor-led.",
      track: "instructor-led",
      hosted: true,
      keywords: ["agent", "agentic", "llm app", "langgraph", "langchain", "tool use", "multi-agent", "nim"],
    },
    {
      key: "multimodal-agents",
      title: "Building AI Agents With Multimodal Models",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-17+V1",
      blurb: "Build agents that reason over text and visual inputs using multimodal models. Instructor-led.",
      track: "instructor-led",
      keywords: ["multimodal", "image", "vision", "video", "document", "ocr"],
    },
    {
      key: "add-knowledge",
      title: "Adding New Knowledge to LLMs",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-26+V1",
      blurb:
        "Take raw data through to a fine-tuned, optimized model with NeMo Curator, continued pretraining, SFT, DPO, and quantization. Instructor-led.",
      track: "instructor-led",
      keywords: ["fine-tune", "fine tuning", "finetune", "pretraining", "sft", "dpo", "nemo", "customize", "quantization", "distillation", "train"],
    },
    {
      key: "rag-agents",
      title: "Building RAG Agents With LLMs",
      url: "https://courses.nvidia.com/courses/course-v1%3ADLI+S-FX-15+V1/",
      blurb: "Design retrieval-augmented generation systems with advanced LLM composition, dialog management, and tooling. Self-paced.",
      track: "self-paced",
      keywords: ["rag", "retrieval", "augmented", "knowledge", "embedding", "vector", "grounding", "search", "docs"],
    },
    {
      key: "eval-rag",
      title: "Evaluating RAG and Semantic Search Systems",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+S-FX-32+V1",
      blurb: "Assess and improve the quality of RAG and semantic search pipelines. Self-paced.",
      track: "self-paced",
      keywords: ["evaluation", "eval", "quality", "semantic search", "benchmark", "metrics"],
    },
    {
      key: "deploy-rag-scale",
      title: "Deploying RAG Pipelines for Production at Scale",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-18+V1",
      blurb: "Deploy and operate production-grade RAG pipelines at scale. Instructor-led.",
      track: "instructor-led",
      keywords: ["deploy", "production", "scale", "latency", "throughput", "serving", "inference", "optimize", "cost"],
    },
    {
      key: "prompt-engineering",
      title: "Building LLM Applications With Prompt Engineering",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+S-FX-12+V2",
      blurb: "Build LLM-powered applications using prompt-engineering techniques. Self-paced.",
      track: "self-paced",
      keywords: ["prompt", "prompt engineering", "few-shot", "instructions"],
    },
    {
      key: "conversational-ai",
      title: "Building Conversational AI Applications",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-06+V2",
      blurb: "Build conversational AI and dialog applications powered by LLMs. Instructor-led.",
      track: "instructor-led",
      keywords: ["conversational", "chatbot", "chat", "dialog", "voice", "assistant", "support"],
    },
    {
      key: "diffusion",
      title: "Generative AI With Diffusion Models",
      url: "https://courses.nvidia.com/courses/course-v1%3ADLI+S-FX-14+V1/",
      blurb: "Build and train diffusion models for image and data generation. Self-paced.",
      track: "self-paced",
      keywords: ["diffusion", "image generation", "images", "generative art", "stable diffusion"],
    },
    {
      key: "genai-explained",
      title: "Generative AI Explained",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+S-FX-07+V1",
      blurb: "A non-technical overview of generative AI concepts and applications. Free, self-paced.",
      track: "self-paced",
      keywords: ["intro", "overview", "explained", "beginner", "non-technical", "leadership", "executive", "getting started"],
    },
    {
      key: "rapid-app-dev",
      title: "Rapid Application Development Using Large Language Models",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+S-FX-26+V1",
      blurb:
        "Practical LLM application development across the open-source ecosystem, from pretrained models to a working app. Self-paced.",
      track: "self-paced",
      keywords: ["rapid", "application development", "prototype", "mvp", "open-source", "build an app", "ship"],
    },
    {
      key: "intro-deploy-rag",
      title: "Introduction to Deploying RAG Pipelines for Production at Scale",
      url: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+S-FX-19+V1",
      blurb: "An introduction to taking RAG pipelines from prototype toward production. Self-paced.",
      track: "self-paced",
      keywords: ["rag", "deploy", "production", "pipeline", "intro", "scale"],
    },
  ],
  /**
   * Module list summarised from NVIDIA's published course outline (courseUrl).
   * Describe only what NVIDIA documents — do not embellish the syllabus.
   */
  outline: [
    {
      title: "Agent fundamentals",
      text: "What an LLM agent is, where language models are strong, and where they fail, so your team can tell an agent-shaped problem from one that needs ordinary software.",
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
      text: "Deploying an agent that schedules multiple retrieval operations and reports back, the hands-on assessment behind the NVIDIA DLI certificate.",
    },
  ],
  tools: ["NVIDIA NIM", "build.nvidia.com", "LangChain", "LangGraph", "Python", "PyTorch"],
  catalogNote:
    "We specialize in generative AI. Beyond these NVIDIA workshops, we also design customized Gen AI training around your team and stack. We are not limited to NVIDIA's courses, but Gen AI is our focus.",
  catalogUrl: "https://www.nvidia.com/en-us/training/",
  /**
   * Official NVIDIA pages, grouped by purpose so they read as a tidy resource
   * list rather than a random dump. Rendered on the workshops page and used in
   * the workshop email.
   */
  referenceGroups: [
    {
      heading: "The workshop",
      links: [
        {
          label: "Building Agentic AI Applications With LLMs",
          href: "https://learn.nvidia.com/courses/course-detail?course_id=course-v1%3ADLI+C-FX-25+V1",
        },
        { label: "Agentic AI", href: "https://www.nvidia.com/en-us/solutions/ai/agentic-ai/" },
      ],
    },
    {
      heading: "Instructor credential",
      links: [
        { label: "NVIDIA Certified Instructor Directory", href: MAJID.nvidiaInstructorDirectory },
        {
          label: "Certified Instructor Program",
          href: "https://www.nvidia.com/en-us/learn/certified-instructor-program/",
        },
      ],
    },
    {
      heading: "Browse NVIDIA training",
      links: [
        { label: "Deep Learning Institute", href: "https://www.nvidia.com/en-us/training/" },
        {
          label: "Instructor-led workshops",
          href: "https://www.nvidia.com/en-us/training/instructor-led-workshops/",
        },
        {
          label: "Full course catalog (PDF)",
          href: "https://dam-cdn.nvd.orangelogic.com/AssetLink/12gb57sa4o276e5yl0kt6lnh70127335.pdf",
        },
      ],
    },
    {
      heading: "Tools & docs",
      links: [
        { label: "NIM documentation", href: "https://docs.nvidia.com/nim/" },
        { label: "build.nvidia.com", href: "https://build.nvidia.com/" },
      ],
    },
  ],
} as const;

export type DliLink = { label: string; href: string };

/** Flat list of every reference link (grouped in DLI.referenceGroups) for the
 * places that want a single list — the workshop email and chat knowledge. */
export const DLI_REFERENCE_LINKS: DliLink[] = DLI.referenceGroups.flatMap((g) =>
  (g.links as readonly DliLink[]).map((l) => ({ label: l.label, href: l.href })),
);
