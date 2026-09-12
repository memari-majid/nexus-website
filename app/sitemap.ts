import type { MetadataRoute } from "next";
import { PERSON_PATHS } from "@/lib/people";
import { INDEXABLE_PATHS, absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = [...INDEXABLE_PATHS.map((path, i) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: (path === "/" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "/" ? 1 : 0.8 - i * 0.05,
  }))];

  for (const path of PERSON_PATHS) {
    pages.push({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return pages;
}
