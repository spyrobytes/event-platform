import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventJsonLd } from "@/components/seo/EventJsonLd";
import type { Metadata } from "next";

type PageParams = Promise<{ slug: string }>;

type EventPageProps = {
  params: PageParams;
};

async function getEvent(slug: string) {
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      creator: {
        select: { id: true, name: true },
      },
      organization: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      _count: {
        select: {
          rsvps: { where: { response: "YES" } },
        },
      },
    },
  });

  if (!event) return null;

  // Only return published public events
  if (event.status !== "PUBLISHED" || event.visibility === "PRIVATE") {
    return null;
  }

  return event;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return {
      title: "Event Not Found",
    };
  }

  const description = event.description
    ? event.description.slice(0, 160)
    : `Join us for ${event.title}${event.city ? ` in ${event.city}` : ""} on ${format(event.startAt, "MMMM d, yyyy")}`;

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      images: event.coverImageUrl
        ? [{ url: event.coverImageUrl, width: 1200, height: 630 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: event.coverImageUrl ? [event.coverImageUrl] : undefined,
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.startAt);
  const endDate = event.endAt ? new Date(event.endAt) : null;
  const isPast = startDate < new Date();
  const attendeeCount = event._count.rsvps;

  return (
    <>
      <EventJsonLd event={event} />

      <article className="container py-8">
        {/* Hero Section */}
        {event.coverImageUrl && (
          <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-xl">
            <Image
              src={event.coverImageUrl}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>
              {event.organization && (
                <p className="mt-2 text-muted-foreground">
                  Hosted by{" "}
                  <span className="font-medium text-foreground">
                    {event.organization.name}
                  </span>
                </p>
              )}
            </header>

            {event.description && (
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">About this event</h2>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{event.description}</p>
                </div>
              </section>
            )}

            {(event.venueName || event.address || event.city) && (
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold">Location</h2>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📍</span>
                      <div>
                        {event.venueName && (
                          <p className="font-medium">{event.venueName}</p>
                        )}
                        {event.address && (
                          <p className="text-muted-foreground">{event.address}</p>
                        )}
                        {(event.city || event.country) && (
                          <p className="text-muted-foreground">
                            {[event.city, event.country].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="font-medium">
                      {format(startDate, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(startDate, "h:mm a")}
                      {endDate && ` - ${format(endDate, "h:mm a")}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.timezone}
                    </p>
                  </div>
                </div>

                {/* Attendees */}
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="font-medium">{attendeeCount} attending</p>
                    {event.maxAttendees && (
                      <p className="text-sm text-muted-foreground">
                        {event.maxAttendees - attendeeCount} spots left
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                {isPast ? (
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      This event has ended
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button className="w-full" size="lg">
                      RSVP Now
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Free to attend
                    </p>
                  </div>
                )}

                {/* Share */}
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Share this event</p>
                  <div className="flex gap-2">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/events/${event.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Twitter
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/events/${event.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      LinkedIn
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link
            href="/events"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to all events
          </Link>
        </div>
      </article>
    </>
  );
}
