import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return INDEXABLE_PATHS.map((path, i) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8 - i * 0.05,
  }));
}
