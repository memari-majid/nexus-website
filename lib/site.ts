export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nexusaisolution.net";

export const SITE = {
  name: "Nexus AI Solutions LLC",
  team: {
    headline: "Industry meets academia",
    summary: "The knowledge to guide you. The experience to build it.",
  },
  home: {
    intro: "Practical AI for your team",
    delivery: "Across the US. At your office or online.",
    consultingTitle: "Make AI useful",
    consultingIntro: "Choose where AI helps. Leave with a plan.",
    offerings: [
      { title: "Plan", text: "Find your best AI use case", href: "/contact" },
      { title: "Learn", text: "Build skills your team can use", href: "/nvidia-dli-workshops" },
      { title: "Build", text: "Turn your plan into a working solution", href: "/contact" },
    ],
  },
  /**
   * One description for the layout metadata, the homepage, and organization
   * schema. NVIDIA appears as the founder's individual credential — never as a
   * partnership or endorsement.
   */
  description:
    "Nexus AI Solutions provides AI consulting and training to industry teams across the United States: NVIDIA Deep Learning Institute workshops hosted by a Certified Instructor, plus custom training designed around your company. Based in Utah, delivered on site or online. Combining industry engineering experience with academic AI research and teaching.",
} as const;
