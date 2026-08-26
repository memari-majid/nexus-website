import { MAJID } from "@/lib/majid";
import { SITE_URL } from "@/lib/site";

export const INDEXABLE_PATHS = ["/", "/about"] as const;

export function absoluteUrl(path = "/"): string {
  if (path === "/") return SITE_URL;
  return `${SITE_URL}${path}`;
}

export const FOUNDER_SAME_AS = [
  MAJID.personalSite,
  MAJID.linkedin,
  MAJID.github,
  MAJID.scholar,
  MAJID.orcid,
  MAJID.researchGate,
  MAJID.uvuDirectory,
] as const;
