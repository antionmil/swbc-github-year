import type { MetadataRoute } from "next";

/* Only the entry point. Username pages are unbounded and generated on demand,
   so listing them is impossible and pointless — they are reached by links. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://githubyearcommits.onedaybuilt.com",
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
