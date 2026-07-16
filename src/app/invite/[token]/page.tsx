import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hashToken } from "@/lib/tokens";
import { db } from "@/lib/db";
import { buildPortalUrl } from "@/lib/guest-access";
import {
  InvitationShell,
  InvitationCard,
  EnvelopeReveal,
  EnvelopeRevealV2,
  SplitRevealCard,
  SplitRevealCardV2,
  LayeredUnfold,
  CinematicScroll,
  TimeBasedReveal,
  TimeBasedRevealV2,
  GoldenCardReveal,
  FlipFlapReveal,
  WeddingStorybook,
  templateMetadata,
  type TemplateId,
} from "@/components/features/Invitation";
import { PageViewTracker, MarkOpenedBeacon } from "@/components/features/Analytics";
import { formatEventTime, resolveRsvpDeadlineDisplay } from "@/lib/utils";
import { buildInvitationScheduleFields } from "@/lib/invitation-schedule-fields";
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
          schedule: true,
          venueName: true,
          address: true,
          city: true,
          country: true,
          coverImageUrl: true,
          status: true,
          maxAttendees: true,
          rsvpDeadline: true,
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
  const inviteRef = hashToken(token).substring(0, 16);

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

  // Check if invite has been revoked
  if (invite.status === "REVOKED") {
    return (
      <InvalidInviteView
        eventTitle={invitationConfig?.coupleDisplayName || event.title}
      />
    );
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
  const eventTime = formatEventTime(new Date(event.startAt), event.timezone);

  // Ceremony/reception strings derive from the typed Event.schedule (shared
  // assembly — see invitation-schedule-fields.ts).
  const wordingStyle =
    invitationConfig?.dateWordingStyle === "formal"
      ? ("formal" as const)
      : ("standard" as const);
  const scheduleFields = buildInvitationScheduleFields({
    tz: event.timezone,
    schedule: event.schedule,
    wordingStyle,
  });

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
    // Structured names and customizable wording
    person1Name: invitationConfig?.person1Name || undefined,
    person2Name: invitationConfig?.person2Name || undefined,
    headerText: invitationConfig?.headerText || undefined,
    headerMode: invitationConfig?.headerMode === "traditional" ? "traditional" : undefined,
    person1FamilyName: invitationConfig?.person1FamilyName || undefined,
    person2FamilyName: invitationConfig?.person2FamilyName || undefined,
    familyInviteText: invitationConfig?.familyInviteText || undefined,
    eventTypeText: invitationConfig?.eventTypeText || undefined,
    monogram: invitationConfig?.monogram || undefined,
    // Wedding Storybook extended fields
    couplePhotoUrl: invitationConfig?.couplePhotoUrl || undefined,
    venuePhotoUrl: invitationConfig?.venuePhotoUrl || undefined,
    ...scheduleFields,
    rsvpDeadline: resolveRsvpDeadlineDisplay(
      event.rsvpDeadline,
      event.timezone,
      wordingStyle
    ),
    storyHeading: invitationConfig?.storyHeading || undefined,
    storyParagraphs: invitationConfig?.storyParagraphs?.length ? invitationConfig.storyParagraphs : undefined,
    timeline: invitationConfig?.timelineJson as InvitationData["timeline"] ?? undefined,
    person1Quote: invitationConfig?.person1Quote || undefined,
    person1QuoteAttr: invitationConfig?.person1QuoteAttr || undefined,
    person2Quote: invitationConfig?.person2Quote || undefined,
    person2QuoteAttr: invitationConfig?.person2QuoteAttr || undefined,
  };

  // Check if already responded
  const hasResponded = !!invite.rsvp;
  const responseLabels = {
    YES: "Going",
    NO: "Not Going",
    MAYBE: "Maybe",
  };

  // RSVP window closed. This page (the canonical share target) still shows the
  // invitation post-deadline — guests may want event details / registry — but
  // the RSVP CTA is a dead end once the deadline passes (the sub-page rejects
  // it). Surface a banner so an un-responded guest isn't surprised by that.
  const deadlinePassed =
    !!event.rsvpDeadline && new Date(event.rsvpDeadline) < new Date();

  // Build portal URL for event page access
  const portalUrl = event.slug ? buildPortalUrl(event.slug, token) : null;

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
        case "TIME_BASED_REVEAL_V2":
          return (
            <TimeBasedRevealV2
              data={invitationData}
              initialState={hasResponded ? "open" : undefined}
              autoPlay={!hasResponded}
              showReplay={!hasResponded}
            />
          );
        case "SPLIT_REVEAL":
          return (
            <SplitRevealCard
              data={invitationData}
              themeId={themeId}
              initialState={hasResponded ? "open" : undefined}
              showReplay={!hasResponded}
            />
          );
        case "SPLIT_REVEAL_V2":
          return (
            <SplitRevealCardV2
              data={invitationData}
              themeId={themeId}
              initialState={hasResponded ? "open" : undefined}
              showReplay={!hasResponded}
            />
          );
        case "GOLDEN_CARD_REVEAL":
          return (
            <GoldenCardReveal
              data={invitationData}
              initialState={hasResponded ? "open" : undefined}
              showHint={!hasResponded}
            />
          );
        case "FLIP_FLAP_REVEAL":
          return (
            <FlipFlapReveal
              data={invitationData}
              initialState={hasResponded ? "open" : undefined}
              showCloseButton={!hasResponded}
              showHint={!hasResponded}
            />
          );
        case "WEDDING_STORYBOOK":
          return (
            <WeddingStorybook
              data={invitationData}
              initialState={hasResponded ? "open" : undefined}
              showHint={!hasResponded}
              theme={themeId as "ivory" | "blush" | "sage" | "midnight" | "champagne"}
            />
          );
        default:
          // Fall back to EnvelopeReveal for unimplemented templates
          return (
            <EnvelopeReveal
              initialState={hasResponded ? "open" : undefined}
              showClose={!hasResponded}
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

    // Wrapper-style templates
    if (templateId === "ENVELOPE_REVEAL_V2") {
      return (
        <EnvelopeRevealV2
          autoOpen={hasResponded}
          showClose={!hasResponded}
          addresseeName={invite.name || "Guest"}
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
        </EnvelopeRevealV2>
      );
    }

    // Default to EnvelopeReveal V1
    return (
      <EnvelopeReveal
        initialState={hasResponded ? "open" : undefined}
        showClose={!hasResponded}
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
      <PageViewTracker eventId={event.id} source="invitation_page" inviteRef={inviteRef} />
      {/* Client-side OPENED beacon (post-hydration) — bots that don't run JS
          can't mark this invite OPENED. See issue #148. */}
      <MarkOpenedBeacon token={token} />

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
          {portalUrl && (
            <a
              href={portalUrl}
              className="inline-block mt-2 text-sm text-[var(--inv-accent)] hover:underline"
            >
              View Event Details &rarr;
            </a>
          )}
        </div>
      )}

      {/* Deadline banner — only when the guest hasn't responded (a responded
          guest sees their status above instead). Tells them RSVP is closed
          before they click through to the closed sub-page. */}
      {!hasResponded && deadlinePassed && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--inv-card-bg)] border-t border-[var(--inv-border)] p-4 text-center z-50">
          <p className="text-sm text-[var(--inv-text-secondary)]">
            RSVP for this event has closed.
          </p>
          {portalUrl && (
            <a
              href={portalUrl}
              className="inline-block mt-2 text-sm text-[var(--inv-accent)] hover:underline"
            >
              View Event Details &rarr;
            </a>
          )}
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
 * View shown when invite has been revoked
 */
function InvalidInviteView({ eventTitle }: { eventTitle: string }) {
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
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Invitation No Longer Valid
        </h1>
        <p className="text-muted-foreground">
          Your invitation to <strong>{eventTitle}</strong> is no longer valid. Please
          contact the event organizer for assistance.
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
