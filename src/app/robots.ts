import type { MetadataRoute } from "next";

/* Without this, /robots.txt fell through to [username] and was answered with
   an HTML page reading "No public contributions for @robots.txt". */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Nothing to gain from crawling the image endpoint; it costs a render.
      disallow: ["/api/"],
    },
    sitemap: "https://githubyearcommits.onedaybuilt.com/sitemap.xml",
  };
}
