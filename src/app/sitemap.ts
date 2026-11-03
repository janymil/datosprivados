import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { INDUSTRIES } from "@/lib/industries";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/diagnostico`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/guias`, changeFrequency: "weekly", priority: 0.8 },
    ...GUIDES.map((guide) => ({
      url: `${base}/guias/${guide.slug}`,
      lastModified: guide.updated,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${base}/sectores`, changeFrequency: "monthly", priority: 0.7 },
    ...INDUSTRIES.map((industry) => ({
      url: `${base}/sectores/${industry.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/plantillas`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/glosario`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
