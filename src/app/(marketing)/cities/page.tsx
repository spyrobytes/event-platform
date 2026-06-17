import Link from "next/link";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browse Events by City",
  description:
    "Find upcoming events by city — browse public events, meetups, conferences, and more happening near you.",
  openGraph: {
    title: "Browse Events by City | EventFXr",
    description:
      "Find upcoming events by city — browse public events, meetups, conferences, and more happening near you.",
  },
};

/** Slug format matching `/cities/[city]` (lowercased, spaces → hyphens). */
function citySlug(name: string): string {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
}

async function getCitiesWithUpcomingEvents() {
  const cities = await db.event.groupBy({
    by: ["city"],
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      city: { not: null },
      startAt: { gte: new Date() },
    },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
  });

  return cities
    .filter((c) => c.city)
    .map((c) => ({ name: c.city as string, count: c._count.city }));
}

export default async function CitiesPage() {
  const cities = await getCitiesWithUpcomingEvents();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/events"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← All events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Browse by city
        </h1>
        <p className="mt-2 text-muted-foreground">
          {cities.length > 0
            ? `Upcoming events across ${cities.length} ${
                cities.length === 1 ? "city" : "cities"
              }.`
            : "No cities with upcoming events yet."}
        </p>
      </div>

      {cities.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <li key={city.name}>
              <Link
                href={`/cities/${citySlug(city.name)}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-surface-2"
              >
                <span className="font-medium text-foreground">{city.name}</span>
                <span className="text-sm text-muted-foreground">
                  {city.count} event{city.count !== 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          Check back soon, or{" "}
          <Link href="/events" className="text-foreground underline">
            browse all events
          </Link>
          .
        </p>
      )}
    </div>
  );
}
