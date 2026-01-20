import Link from "next/link";
import { db } from "@/lib/db";
import { PublicNav, Footer } from "@/components/layout";
import { EventList } from "@/components/features";
import { Button } from "@/components/ui/button";

// This page uses database queries, so it must be dynamic
export const dynamic = "force-dynamic";

async function getFeaturedEvents() {
  const events = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      visibility: "PUBLIC",
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
    take: 6,
  });

  return events;
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
    take: 6,
  });

  return cities
    .filter((c) => c.city)
    .map((c) => ({ name: c.city as string, count: c._count.city }));
}

export default async function HomePage() {
  const [events, cities] = await Promise.all([
    getFeaturedEvents(),
    getPopularCities(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNav />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="container relative py-24 md:py-32">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Create, Discover, and{" "}
                <span className="text-primary">Manage Events</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                The modern event platform for organizers. Create beautiful event
                pages, send invitations, and track RSVPs — all for free.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/dashboard/events/new">
                  <Button size="lg" className="w-full sm:w-auto">
                    Create Your Event
                  </Button>
                </Link>
                <Link href="/events">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Browse Events
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-b border-border py-16">
          <div className="container">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                  ✨
                </div>
                <h3 className="mb-2 font-semibold">Easy Event Creation</h3>
                <p className="text-sm text-muted-foreground">
                  Create professional event pages in minutes with our intuitive
                  editor.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                  📧
                </div>
                <h3 className="mb-2 font-semibold">Smart Invitations</h3>
                <p className="text-sm text-muted-foreground">
                  Send beautiful email invitations and track opens and responses.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
                  📊
                </div>
                <h3 className="mb-2 font-semibold">RSVP Management</h3>
                <p className="text-sm text-muted-foreground">
                  Track attendance and manage guest lists with real-time updates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Events Section */}
        {events.length > 0 && (
          <section className="py-16">
            <div className="container">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Upcoming Events
                  </h2>
                  <p className="mt-1 text-muted-foreground">
                    Discover events happening soon
                  </p>
                </div>
                <Link href="/events">
                  <Button variant="outline">View All Events</Button>
                </Link>
              </div>

              <EventList
                events={events}
                showStatus={false}
              />
            </div>
          </section>
        )}

        {/* Cities Section */}
        {cities.length > 0 && (
          <section className="border-t border-border bg-muted/30 py-16">
            <div className="container">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold tracking-tight">
                  Events by City
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Find events happening near you
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {cities.map((city) => (
                  <Link
                    key={city.name}
                    href={`/cities/${encodeURIComponent(city.name.toLowerCase().replace(/\s+/g, "-"))}`}
                    className="flex flex-col items-center rounded-lg border bg-background p-4 transition-colors hover:border-primary hover:bg-muted/50"
                  >
                    <span className="font-medium">{city.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {city.count} event{city.count !== 1 ? "s" : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="border-t border-border py-16">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                Ready to host your event?
              </h2>
              <p className="mt-4 text-muted-foreground">
                Join thousands of organizers who use EventsFixer to create
                memorable experiences. It&apos;s free to get started.
              </p>
              <div className="mt-8">
                <Link href="/signup">
                  <Button size="lg">Get Started Free</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
