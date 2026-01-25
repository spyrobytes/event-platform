import { Suspense } from "react";
import { db } from "@/lib/db";
import { EventList } from "@/components/features";
import { EventFilters } from "@/components/features/EventFilters";
import type { Metadata } from "next";

// This page uses database queries, so it must be dynamic
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Events",
  description: "Find and attend amazing events near you. Browse public events, meetups, conferences, and more.",
  openGraph: {
    title: "Discover Events | EventsFixer",
    description: "Find and attend amazing events near you. Browse public events, meetups, conferences, and more.",
  },
};

type SearchParams = Promise<{
  city?: string;
  page?: string;
}>;

type EventsPageProps = {
  searchParams: SearchParams;
};

async function getPublicEvents(city?: string, page: number = 1, limit: number = 12) {
  const offset = (page - 1) * limit;

  const where = {
    status: "PUBLISHED" as const,
    visibility: "PUBLIC" as const,
    startAt: { gte: new Date() },
    ...(city && { city: { equals: city, mode: "insensitive" as const } }),
  };

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
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
      take: limit,
      skip: offset,
    }),
    db.event.count({ where }),
  ]);

  return { events, total, page, limit };
}

async function getPopularCities() {
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
    take: 10,
  });

  return cities
    .filter((c) => c.city)
    .map((c) => ({ name: c.city as string, count: c._count.city }));
}

function EventsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  );
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const city = params.city;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const [{ events, total, limit }, cities] = await Promise.all([
    getPublicEvents(city, page),
    getPopularCities(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {city ? `Events in ${city}` : "Discover Events"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {city
            ? `Browse upcoming events happening in ${city}`
            : "Find amazing events happening near you"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
            <EventFilters cities={cities} selectedCity={city} />
          </Suspense>
        </aside>

        <div className="lg:col-span-3">
          <Suspense fallback={<EventsLoading />}>
            <EventList
              events={events}
              showStatus={false}
              emptyMessage={
                city
                  ? `No upcoming events in ${city}. Check back later!`
                  : "No upcoming events found. Check back later!"
              }
            />

            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <a
                    key={pageNum}
                    href={`/events?${city ? `city=${city}&` : ""}page=${pageNum}`}
                    className={`rounded-md px-4 py-2 text-sm ${
                      pageNum === page
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-3 text-foreground hover:bg-surface-2"
                    }`}
                  >
                    {pageNum}
                  </a>
                ))}
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
