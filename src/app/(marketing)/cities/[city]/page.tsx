import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { EventList } from "@/components/features";
import type { Metadata } from "next";

type PageParams = Promise<{ city: string }>;

type CityPageProps = {
  params: PageParams;
};

async function getCityEvents(citySlug: string) {
  // Decode the city name from URL
  const cityName = decodeURIComponent(citySlug).replace(/-/g, " ");

  const events = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      city: { equals: cityName, mode: "insensitive" },
      startAt: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      startAt: true,
      endAt: true,
      timezone: true,
      venueName: true,
      city: true,
      coverImageUrl: true,
      status: true,
      visibility: true,
      _count: {
        select: {
          rsvps: { where: { response: "YES" } },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 50,
  });

  // Get the actual city name from the first event (preserves casing)
  const actualCityName = events[0]?.city || cityName;

  return { events, cityName: actualCityName };
}

async function getOtherCities(excludeCity: string) {
  const cities = await db.event.groupBy({
    by: ["city"],
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      city: { not: excludeCity },
      startAt: { gte: new Date() },
    },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
    take: 5,
  });

  return cities
    .filter((c) => c.city)
    .map((c) => ({ name: c.city as string, count: c._count.city }));
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const cityName = decodeURIComponent(citySlug).replace(/-/g, " ");

  // Capitalize city name for display
  const displayName = cityName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return {
    title: `Events in ${displayName}`,
    description: `Discover amazing events happening in ${displayName}. Find concerts, meetups, conferences, and more local events.`,
    openGraph: {
      title: `Events in ${displayName} | EventsFixer`,
      description: `Discover amazing events happening in ${displayName}. Find concerts, meetups, conferences, and more local events.`,
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const { events, cityName } = await getCityEvents(citySlug);

  if (events.length === 0) {
    // Check if the city exists at all
    const hasAnyEvents = await db.event.count({
      where: {
        city: { equals: decodeURIComponent(citySlug).replace(/-/g, " "), mode: "insensitive" },
      },
    });

    if (hasAnyEvents === 0) {
      notFound();
    }
  }

  const otherCities = await getOtherCities(cityName);

  // Format for display
  const displayName = cityName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return (
    <div className="container py-8">
      <div className="mb-8">
        <Link
          href="/events"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← All Events
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Events in {displayName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {events.length} upcoming event{events.length !== 1 ? "s" : ""} in{" "}
          {displayName}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <EventList
            events={events}
            showStatus={false}
            emptyMessage={`No upcoming events in ${displayName}. Check back later!`}
          />
        </div>

        <aside>
          {otherCities.length > 0 && (
            <div className="rounded-lg border p-4">
              <h2 className="mb-4 font-semibold">Other Cities</h2>
              <ul className="space-y-2">
                {otherCities.map((city) => (
                  <li key={city.name}>
                    <Link
                      href={`/cities/${encodeURIComponent(city.name.toLowerCase().replace(/\s+/g, "-"))}`}
                      className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground"
                    >
                      <span>{city.name}</span>
                      <span className="text-xs">{city.count} events</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
