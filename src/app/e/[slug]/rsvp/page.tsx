import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getEventBySlug,
  getRedirectForRetiredSlug,
} from "@/lib/event-page-loader";
import { formatEventDateLong } from "@/lib/utils";
import { CodeForm } from "./code-form";

// Same rationale as /e/[slug]: every request resolves the slug + status
// freshly. RSVP eligibility (deadline / start) is time-sensitive and not
// safe to cache.
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug, undefined);
  if (!event) return { title: "RSVP" };
  return {
    title: `RSVP — ${event.title}`,
    description: `RSVP to ${event.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function RsvpEntryPage({ params }: PageProps) {
  const { slug } = await params;

  const event = await getEventBySlug(slug, undefined);
  if (!event) {
    const renamed = await getRedirectForRetiredSlug(slug);
    if (renamed) permanentRedirect(`/e/${renamed}/rsvp`);
    notFound();
  }

  const now = new Date();
  const deadlinePassed = !!event.rsvpDeadline && event.rsvpDeadline < now;
  const eventEnded = event.startAt < now;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 py-12 sm:py-20">
        <header className="mb-8 text-center">
          <Link
            href={`/e/${slug}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to event
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{event.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatEventDateLong(event.startAt, event.timezone)}
          </p>
        </header>

        {deadlinePassed ? (
          <ClosedNotice
            heading="RSVPs are closed"
            body="The RSVP deadline for this event has passed. If you think this is a mistake, please contact the host."
          />
        ) : eventEnded ? (
          <ClosedNotice
            heading="This event has already taken place"
            body="The event has already started or finished. We're not accepting RSVPs anymore."
          />
        ) : (
          <CodeForm eventId={event.id} eventSlug={slug} />
        )}
      </div>
    </main>
  );
}

function ClosedNotice({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 text-center">
      <h2 className="text-lg font-medium">{heading}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
