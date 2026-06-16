import Link from "next/link";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { COVER_ASSET_SELECT } from "@/lib/cover-media-asset";
import { EventFilters } from "@/components/features/EventFilters";
import {
  DiscoveryHero,
  FeaturedEvents,
  DiscoveryEventList,
  getDateRangeBounds,
  isDateRange,
  type DateRange,
  type DiscoveryEventCardData,
} from "./_components";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Events",
  description:
    "Find and attend amazing events near you. Browse public events, meetups, conferences, and more.",
  openGraph: {
    title: "Discover Events | EventFXr",
    description:
      "Find and attend amazing events near you. Browse public events, meetups, conferences, and more.",
  },
};

type SearchParams = Promise<{
  q?: string;
  city?: string;
  when?: string;
  page?: string;
}>;

type EventsPageProps = {
  searchParams: SearchParams;
};

const DISCOVERY_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  startAt: true,
  timezone: true,
  venueName: true,
  city: true,
  coverImageUrl: true,
  ...COVER_ASSET_SELECT,
  _count: { select: { rsvps: { where: { response: "YES" as const } } } },
} as const;

async function getPublicEvents(opts: {
  q?: string;
  city?: string;
  range?: DateRange;
  page: number;
  limit: number;
}) {
  const { q, city, range, page, limit } = opts;
  const offset = (page - 1) * limit;

  const dateBounds = range
    ? getDateRangeBounds(range)
    : { gte: new Date(), lt: undefined as Date | undefined };

  const where = {
    status: "PUBLISHED" as const,
    visibility: "PUBLIC" as const,
    startAt: dateBounds.lt
      ? { gte: dateBounds.gte, lt: dateBounds.lt }
      : { gte: dateBounds.gte },
    ...(city && { city: { equals: city, mode: "insensitive" as const } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      select: DISCOVERY_SELECT,
      orderBy: { startAt: "asc" },
      take: limit,
      skip: offset,
    }),
    db.event.count({ where }),
  ]);

  return { events, total };
}

async function getFeaturedEvents(): Promise<DiscoveryEventCardData[]> {
  return db.event.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
      startAt: { gte: new Date() },
    },
    select: DISCOVERY_SELECT,
    orderBy: { rsvps: { _count: "desc" } },
    take: 3,
  });
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
    take: 20,
  });

  return cities
    .filter((c) => c.city)
    .map((c) => ({ name: c.city as string, count: c._count.city }));
}

function buildPageHref(opts: {
  page: number;
  q?: string;
  city?: string;
  when?: DateRange;
}): string {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.city) params.set("city", opts.city);
  if (opts.when) params.set("when", opts.when);
  if (opts.page > 1) params.set("page", String(opts.page));
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

const PAGE_LIMIT = 12;

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const city = params.city || undefined;
  const range = isDateRange(params.when) ? params.when : undefined;
  const page = params.page ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const hasActiveFilters = Boolean(q || city || range);
  const showFeatured = !hasActiveFilters && page === 1;

  const [{ events, total }, cities, featured] = await Promise.all([
    getPublicEvents({ q, city, range, page, limit: PAGE_LIMIT }),
    getPopularCities(),
    showFeatured ? getFeaturedEvents() : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(total / PAGE_LIMIT);

  return (
    <>
      <DiscoveryHero
        query={q}
        selectedCity={city}
        selectedRange={range}
        cities={cities}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {showFeatured && featured.length > 0 && (
          <FeaturedEvents events={featured} />
        )}

        <div className="grid gap-8 lg:grid-cols-4">
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20">
              <EventFilters
                cities={cities}
                selectedCity={city}
                query={q}
                selectedRange={range}
              />
            </div>
          </aside>

          <div className="lg:col-span-3">
            {(hasActiveFilters || total > 0) && (
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {hasActiveFilters ? "Results" : "All upcoming events"}
                </h2>
                {total > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {total} {total === 1 ? "event" : "events"}
                  </span>
                )}
              </div>
            )}

            <DiscoveryEventList
              events={events}
              hasActiveFilters={hasActiveFilters}
            />

            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-10 flex items-center justify-center gap-1"
              >
                <Link
                  href={buildPageHref({ page: page - 1, q, city, when: range })}
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
                      href={buildPageHref({
                        page: item,
                        q,
                        city,
                        when: range,
                      })}
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
                  href={buildPageHref({ page: page + 1, q, city, when: range })}
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
    </>
  );
}
