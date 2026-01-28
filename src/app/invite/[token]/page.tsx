import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hashToken } from "@/lib/tokens";
import { db } from "@/lib/db";
import {
  InvitationShell,
  InvitationCard,
  EnvelopeReveal,
  LayeredUnfold,
  CinematicScroll,
  TimeBasedReveal,
  templateMetadata,
  type TemplateId,
} from "@/components/features/Invitation";
import { PageViewTracker } from "@/components/features/Analytics";
import type { ThemeId, TypographyPair } from "@/lib/invitation-themes";
import type { InvitationData, VenueInfo } from "@/schemas/invitation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Fetches invite with event and invitation config
 */
async function getInviteWithConfig(token: string) {
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
          maxAttendees: true,
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

  if (!invite) return null;

  // Fetch invitation config separately (optional relation)
  const invitationConfig = await db.invitationConfig.findUnique({
    where: { eventId: invite.eventId },
  });

  return { invite, invitationConfig };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;

  try {
    const result = await getInviteWithConfig(token);

    if (!result) {
      return {
        title: "Invitation Not Found | EventFXr",
        description: "This invitation link is invalid or has expired.",
      };
    }

    const { invite, invitationConfig } = result;
    const coupleNames =
      invitationConfig?.coupleDisplayName || invite.event.title;

    return {
      title: `You're Invited | ${coupleNames}`,
      description:
        invite.event.description ||
        `You're invited to celebrate with ${coupleNames}`,
      openGraph: {
        title: `You're Invited | ${coupleNames}`,
        description: `You're invited to celebrate with ${coupleNames}`,
        images: invite.event.coverImageUrl
          ? [{ url: invite.event.coverImageUrl }]
          : undefined,
      },
    };
  } catch {
    return {
      title: "Invitation | EventFXr",
      description: "View your invitation.",
    };
  }
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;

  const result = await getInviteWithConfig(token);

  if (!result) {
    notFound();
  }

  const { invite, invitationConfig } = result;
  const event = invite.event;

  // Check if event is cancelled
  if (event.status === "CANCELLED") {
    return (
      <CancelledEventView
        eventTitle={invitationConfig?.coupleDisplayName || event.title}
      />
    );
  }

  // Check if invite is expired
  if (
    invite.status === "EXPIRED" ||
    (invite.expiresAt && new Date(invite.expiresAt) < new Date())
  ) {
    return (
      <ExpiredInviteView
        eventTitle={invitationConfig?.coupleDisplayName || event.title}
      />
    );
  }

  // Update invite status to OPENED if SENT or PENDING
  if (invite.status === "SENT" || invite.status === "PENDING") {
    await db.invite.update({
      where: { id: invite.id },
      data: {
        status: "OPENED",
        openedAt: new Date(),
      },
    });
  }

  // Get theme and typography configuration
  const themeId: ThemeId = (invitationConfig?.themeId as ThemeId) || "ivory";
  const typographyPair: TypographyPair =
    (invitationConfig?.typographyPair as TypographyPair) || "classic";
  const textDirection = invitationConfig?.textDirection === "RTL" ? "rtl" : "ltr";

  // Build invitation data
  const venue: VenueInfo = {
    name: event.venueName || "",
    address: event.address || "",
    city: event.city || "",
    state: undefined,
    zipCode: undefined,
  };

  // Format time
  const eventTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
  }).format(new Date(event.startAt));

  const invitationData: InvitationData = {
    coupleNames: invitationConfig?.coupleDisplayName || event.title,
    eventTitle: event.title,
    eventDate: new Date(event.startAt),
    eventTime,
    timezone: event.timezone,
    venue,
    inviteeName: invite.name || undefined,
    salutation: "Dear",
    dressCode: invitationConfig?.dressCode || undefined,
    customMessage: invitationConfig?.customMessage || undefined,
    heroImageUrl: invitationConfig?.heroImageUrl || event.coverImageUrl || undefined,
    rsvpUrl: `/invite/${token}/rsvp`,
  };

  // Check if already responded
  const hasResponded = !!invite.rsvp;
  const responseLabels = {
    YES: "Going",
    NO: "Not Going",
    MAYBE: "Maybe",
  };

  // Get template configuration
  const templateId = (invitationConfig?.template as TemplateId) || "ENVELOPE_REVEAL";
  const templateMeta = templateMetadata[templateId];
  const isDataDriven = templateMeta?.type === "data-driven";

  // Render the appropriate template
  const renderTemplate = () => {
    if (isDataDriven) {
      // Data-driven templates render their own content
      switch (templateId) {
        case "LAYERED_UNFOLD":
          return (
            <LayeredUnfold
              data={invitationData}
              initialState={hasResponded ? "open" : undefined}
              showReplay={!hasResponded}
            />
          );
        case "CINEMATIC_SCROLL":
          return (
            <CinematicScroll
              data={invitationData}
              initialState={hasResponded ? "open" : undefined}
              showReplay={!hasResponded}
            />
          );
        case "TIME_BASED_REVEAL":
          return (
            <TimeBasedReveal
              data={invitationData}
              initialState={hasResponded ? "open" : undefined}
              autoPlay={!hasResponded}
              showReplay={!hasResponded}
            />
          );
        default:
          // Fall back to EnvelopeReveal for unimplemented templates
          return (
            <EnvelopeReveal
              initialState={hasResponded ? "open" : undefined}
              showReplay={!hasResponded}
            >
              <InvitationCard
                data={invitationData}
                rsvpButtonText={
                  hasResponded
                    ? `Responded: ${responseLabels[invite.rsvp!.response]}`
                    : "RSVP"
                }
                showRsvpButton={true}
              />
            </EnvelopeReveal>
          );
      }
    }

    // Wrapper-style templates (EnvelopeReveal and future wrapper templates)
    return (
      <EnvelopeReveal
        initialState={hasResponded ? "open" : undefined}
        showReplay={!hasResponded}
      >
        <InvitationCard
          data={invitationData}
          rsvpButtonText={
            hasResponded
              ? `Responded: ${responseLabels[invite.rsvp!.response]}`
              : "RSVP"
          }
          showRsvpButton={true}
        />
      </EnvelopeReveal>
    );
  };

  return (
    <InvitationShell
      themeId={themeId}
      typographyPair={typographyPair}
      textDirection={textDirection}
    >
      <PageViewTracker eventId={event.id} source="invitation_page" />

      {renderTemplate()}

      {/* Response status banner (when already responded) */}
      {hasResponded && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--inv-card-bg)] border-t border-[var(--inv-border)] p-4 text-center z-50">
          <p className="text-sm text-[var(--inv-text-secondary)]">
            You responded:{" "}
            <strong className="text-[var(--inv-text-primary)]">
              {responseLabels[invite.rsvp!.response]}
            </strong>
            {invite.rsvp!.guestCount > 1 && (
              <span> ({invite.rsvp!.guestCount} guests)</span>
            )}
          </p>
        </div>
      )}
    </InvitationShell>
  );
}

/**
 * View shown when event is cancelled
 */
function CancelledEventView({ eventTitle }: { eventTitle: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Event Cancelled</h1>
        <p className="text-muted-foreground">
          Unfortunately, <strong>{eventTitle}</strong> has been cancelled. We
          apologize for any inconvenience.
        </p>
      </div>
    </div>
  );
}

/**
 * View shown when invite has expired
 */
function ExpiredInviteView({ eventTitle }: { eventTitle: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-warning"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Invitation Expired
        </h1>
        <p className="text-muted-foreground">
          Your invitation to <strong>{eventTitle}</strong> has expired. Please
          contact the event organizer for assistance.
        </p>
      </div>
    </div>
  );
}
