import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";

// Dynamic sitemap - generated at runtime, not build time
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  // Only fetch from database if DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    return staticPages;
  }

  try {
    // Dynamic import to avoid build-time issues
    const { db } = await import("@/lib/db");

    // Get all published public events
    const events = await db.event.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
      },
      select: {
        slug: true,
        updatedAt: true,
        startAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
      url: `${BASE_URL}/events/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: event.startAt > new Date() ? "daily" : "monthly",
      priority: event.startAt > new Date() ? 0.8 : 0.5,
    }));

    // Get unique cities with events
    const cities = await db.event.groupBy({
      by: ["city"],
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
        city: { not: null },
      },
    });

    const cityPages: MetadataRoute.Sitemap = cities
      .filter((c) => c.city)
      .map((c) => ({
        url: `${BASE_URL}/cities/${encodeURIComponent((c.city as string).toLowerCase().replace(/\s+/g, "-"))}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));

    return [...staticPages, ...eventPages, ...cityPages];
  } catch {
    // Return static pages only if database is unavailable
    return staticPages;
  }
}
