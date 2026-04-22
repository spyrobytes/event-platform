import Link from "next/link";
import { db } from "@/lib/db";
import { EventList } from "@/components/features";
import { EventFilters } from "@/components/features/EventFilters";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

// This page uses database queries, so it must be dynamic
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Events",
  description: "Find and attend amazing events near you. Browse public events, meetups, conferences, and more.",
  openGraph: {
    title: "Discover Events | EventFXr",
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

function buildPageHref(page: number, city?: string): string {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/events?${qs}` : "/events";
}

function getPaginationItems(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: Array<number | "ellipsis"> = [1];
  if (current > 3) items.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) items.push(p);
  if (current < total - 2) items.push("ellipsis");
  items.push(total);
  return items;
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
          <EventFilters cities={cities} selectedCity={city} />
        </aside>

        <div className="lg:col-span-3">
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
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-center gap-1"
            >
              <Link
                href={buildPageHref(page - 1, city)}
                aria-label="Previous page"
                aria-disabled={page === 1}
                tabIndex={page === 1 ? -1 : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-md px-3 text-sm transition-colors",
                  page === 1
                    ? "pointer-events-none text-muted-foreground/40"
                    : "text-foreground hover:bg-surface-2"
                )}
              >
                ← Prev
              </Link>
              {getPaginationItems(page, totalPages).map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${idx}`}
                    aria-hidden="true"
                    className="px-2 text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={buildPageHref(item, city)}
                    aria-current={item === page ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm transition-colors",
                      item === page
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-surface-2"
                    )}
                  >
                    {item}
                  </Link>
                )
              )}
              <Link
                href={buildPageHref(page + 1, city)}
                aria-label="Next page"
                aria-disabled={page === totalPages}
                tabIndex={page === totalPages ? -1 : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-md px-3 text-sm transition-colors",
                  page === totalPages
                    ? "pointer-events-none text-muted-foreground/40"
                    : "text-foreground hover:bg-surface-2"
                )}
              >
                Next →
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
