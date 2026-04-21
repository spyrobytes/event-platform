import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/rsvp/",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
