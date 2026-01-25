import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { RSVPForm } from "@/components/features";
import { PageViewTracker } from "@/components/features/Analytics";
import { hashToken } from "@/lib/tokens";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

async function getInviteByToken(token: string) {
  const tokenHash = hashToken(token);

  const invite = await db.invite.findUnique({
    where: { tokenHash },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          startAt: true,
          endAt: true,
          timezone: true,
          venueName: true,
          address: true,
          city: true,
          country: true,
          coverImageUrl: true,
          status: true,
        },
      },
      rsvp: {
        select: {
          id: true,
          response: true,
          guestName: true,
          guestCount: true,
          respondedAt: true,
        },
      },
    },
  });

  return invite;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    const invite = await getInviteByToken(token);

    if (!invite) {
      return {
        title: "Invitation Not Found | EventsFixer",
        description: "This invitation link is invalid or has expired.",
      };
    }

    return {
      title: `RSVP to ${invite.event.title} | EventsFixer`,
      description: invite.event.description || `You're invited to ${invite.event.title}. RSVP now!`,
    };
  } catch {
    return {
      title: "RSVP | EventsFixer",
      description: "Respond to your event invitation.",
    };
  }
}

export default async function RSVPPage({ params }: PageProps) {
  const { token } = await params;

  let invite;
  try {
    invite = await getInviteByToken(token);
  } catch {
    notFound();
  }

  if (!invite) {
    notFound();
  }

  const event = invite.event;

  // Check if event is still active
  if (event.status === "CANCELLED") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Event Cancelled</h1>
          <p className="text-muted-foreground">
            Unfortunately, this event has been cancelled.
          </p>
        </div>
      </div>
    );
  }

  // Check if invite is expired
  if (invite.status === "EXPIRED") {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Invitation Expired</h1>
          <p className="text-muted-foreground">
            This invitation has expired and is no longer valid.
          </p>
        </div>
      </div>
    );
  }

  // Check if already responded
  if (invite.rsvp) {
    const responseLabels = {
      YES: "attending",
      NO: "not attending",
      MAYBE: "undecided about attending",
    };

    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Already Responded</h1>
          <p className="text-muted-foreground">
            You already responded to this invitation. You indicated that you are{" "}
            <strong>{responseLabels[invite.rsvp.response]}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            If you need to change your response, please contact the event organizer.
          </p>
        </div>
      </div>
    );
  }

  // Format event date
  const startDate = new Date(event.startAt);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background">
      <PageViewTracker eventId={event.id} source="rsvp_page" />
      {/* Event Header */}
      {event.coverImageUrl && (
        <div className="relative h-64 w-full">
          <Image
            src={event.coverImageUrl}
            alt={event.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Event Info */}
        <div className="mb-8 text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{event.title}</h1>
          {event.description && (
            <p className="text-lg text-muted-foreground">{event.description}</p>
          )}

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formattedTime}</span>
            </div>
            {(event.venueName || event.city) && (
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{event.venueName || event.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* RSVP Form */}
        <RSVPForm
          inviteToken={token}
          guestName={invite.name || ""}
          plusOnesAllowed={invite.plusOnesAllowed}
        />
      </div>
    </div>
  );
}
