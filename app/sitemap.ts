import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://real-estate-listing-ai.real-estate-listing-ai.workers.dev",
      lastModified: new Date(),
    },
  ];
}