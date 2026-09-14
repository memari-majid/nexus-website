/** Homepage FAQ, also used for FAQPage JSON-LD. Keep answers honest. */
import { HAMID } from "@/lib/hamid";
import { MAJID } from "@/lib/majid";

export const FAQS = [
  {
    q: "What do you do for clients?",
    a: "Our active client work is AI consulting and team training. We advise organizations on how to adopt AI, and when not to, and we train teams through workshops and hands-on sessions. When you need a system built, that is a separate, scoped statement of work: retrieval over private documents, agentic tool-use, evaluation and guardrails, and multimodal vision-language work where it fits.",
  },
  {
    q: "Is Nexus a generic IT shop?",
    a: "No. Nexus AI Solutions is an AI solutions firm: consulting, workshops and team training, then scoped implementation (RAG, agents, evaluation, multimodal). We do not sell standalone helpdesk, cybersecurity assessments, or lift-and-shift cloud migration.",
  },
  {
    q: "Does Nexus teach people to build AI-powered businesses?",
    a: "The founder teaches AI and entrepreneurship: taking a real problem to a working business, end to end. The same model is the direction of Nexus team training: helping people build their own AI-powered businesses. That training direction is not a launched product SKU.",
  },
  {
    q: "How are workshops and team training structured?",
    a: "A DLI Certified Instructor hosts the official NVIDIA workshop for industry teams, and we design custom training when the catalog is not the right fit. Custom curriculum is scoped to your stack, data, and use cases: typically a half-day or full-day session, or a short series, delivered online or on site at your offices anywhere in the United States. Custom sessions are Nexus curriculum, so the NVIDIA DLI certificate applies only to the official DLI workshop.",
  },
  {
    q: "Do you deliver official NVIDIA Deep Learning Institute workshops?",
    a: "Yes. Majid Memari is an NVIDIA Deep Learning Institute Certified Instructor, listed in the NVIDIA Certified Instructor Directory. The workshop available now is Building Agentic AI Applications With LLMs: eight hours, hands-on. NVIDIA takes care of everything: cloud GPU VMs (your company needs no GPUs, local compute, or special infrastructure), course content and curriculum, assessment, and the DLI certificate. Nexus only hosts and teaches, in person or online, and helps participants pass the assessment. NVIDIA owns the content, curriculum, cloud labs, assessment, and certificate; Nexus prices and invoices delivery at $500 per seat for up to 20 people, with a tailored quote for larger groups. Official sources: learn.nvidia.com and nvidia.com/en-us/learn/certified-instructor-program/.",
  },
  {
    q: "How do we schedule a private DLI workshop?",
    a: "Private cohorts can be delivered online or in person at your offices anywhere in the United States, subject to NVIDIA requirements. NVIDIA supplies the cloud labs, so your company needs no compute. Allow at least six weeks for scheduling and workshop access. Contact Nexus to start that conversation; Nexus prices and invoices delivery, $500 per seat for up to 20, larger groups quoted.",
  },
  {
    q: "Who delivers Nexus client work?",
    a: `Every statement of work is executed under Nexus AI Solutions LLC. ${MAJID.fullName}, ${MAJID.companyRole}, NVIDIA DLI Certified Instructor, and a researcher working on LLMs, agents, and retrieval, leads AI consulting and team training. He is a 2026 AI Utah 100 honoree. ${HAMID.fullName}, ${HAMID.role}, brings software engineering experience since 2012. He supports technical consulting and workshop delivery, and leads client partnerships, proposals, deal negotiations and onboarding. Nexus is based in Utah's Salt Lake metro and works with companies across the United States, in person at your offices or online. Every engagement is delivered by this team, not a revolving cast of subcontractors.`,
  },
  {
    q: "What is the founder's research background?",
    a: "Majid Memari, PhD holds a PhD in Computer Science, with doctoral research in generative AI, using conditional VAE and GAN models for synthetic-image generation and evaluation. He then held a postdoctoral research appointment at the University of Pennsylvania, and that appointment brought research collaborations with Stanford and Johns Hopkins; those were collaborations, not appointments, and none of those institutions sponsors or endorses Nexus. Earlier research runs from graduate work at Southern Illinois University Carbondale, starting in 2015, through the University of Utah One-U Responsible AI Initiative. His work today centres on LLMs, agents, retrieval, and evaluation, the same ground the NVIDIA DLI agentic AI workshop covers.",
  },
  {
    q: "Are we employing your team, or hiring Nexus as a vendor?",
    a: "You're engaging Nexus AI Solutions LLC as an independent business, typically milestone- or deliverable-based statements of work, not putting the Nexus team on your payroll. Nexus assigns who does the work. That keeps IP, invoicing, and responsibility with the company delivering the outcomes you bought.",
  },
  {
    q: "What industries do you serve?",
    a: "We work with industry teams across the United States in government, healthcare, public safety, and enterprise. Representative work includes simulation training and privacy-preserving data systems for state agencies, always as AI solutions, not generic IT operations.",
  },
  {
    q: "Can you work with our existing tech stack?",
    a: "Yes, when the stack is in service of an AI system. Typical tools include Python, PyTorch, LangChain / LangGraph, evaluation harnesses, and GPU-accelerated NVIDIA DLI-style labs. Cloud or hybrid hosting is used to run those systems. We do not sell standalone helpdesk, cybersecurity assessments, or lift-and-shift cloud migration.",
  },
  {
    q: "What does a typical engagement look like?",
    a: "We prefer to de-risk with a paid discovery sprint: goals, constraints, architecture, backlog, risks, latency and cost envelopes, then a concrete build proposal or milestone plan. Larger builds proceed in phases, with evaluation hooks early, rather than committing to ambiguous fixed scope without shared understanding.",
  },
  {
    q: "Do you offer ongoing support after project delivery?",
    a: "Yes, normally as separate, signed follow-on work: stabilization windows, model/prompt upkeep, retrieval tuning, observability tweaks, docs, or a clearly bounded sustainment sprint. Nexus sells projects and phased SOWs, not pretending to be embedded FTE unless your procurement deliberately buys a capped sustainment engagement with explicit boundaries (never implied 24/7 on-call unless written into the SOW).",
  },
  {
    q: "How do you handle data privacy and compliance?",
    a: "Security and privacy are core to every AI engagement. We design with encryption at rest and in transit, role-based access, audit logging, and alignment with frameworks like HIPAA, FERPA, and state data-privacy regulations, especially relevant in Utah public-sector work.",
  },
] as const;
