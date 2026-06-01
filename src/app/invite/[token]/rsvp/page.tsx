import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { hashToken } from "@/lib/tokens";
import { db } from "@/lib/db";
import { buildPortalUrl } from "@/lib/guest-access";
import { loadAndMigrateConfig } from "@/lib/event-page-loader";
import { isWeddingTemplate } from "@/lib/section-nav-defaults";
import { InvitationShell, InvitationRSVPForm } from "@/components/features/Invitation";
import { PageViewTracker, MarkOpenedBeacon } from "@/components/features/Analytics";
import type { ThemeId, TypographyPair } from "@/lib/invitation-themes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Fetches invite with event and invitation config for RSVP
 */
async function getInviteForRSVP(token: string) {
  const tokenHash = hashToken(token);

  const invite = await db.invite.findUnique({
    where: { tokenHash },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          timezone: true,
          rsvpDeadline: true,
          pageConfig: true,
          templateId: true,
        },
      },
      rsvp: {
        select: {
          id: true,
          response: true,
          guestName: true,
          guestCount: true,
        },
      },
    },
  });

  if (!invite) return null;

  // Fetch invitation config separately
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
    const result = await getInviteForRSVP(token);

    if (!result) {
      return {
        title: "RSVP | EventFXr",
        description: "Respond to your invitation.",
      };
    }

    const { invite, invitationConfig } = result;
    const eventName =
      invitationConfig?.coupleDisplayName || invite.event.title;

    return {
      title: `RSVP | ${eventName}`,
      description: `Respond to your invitation for ${eventName}`,
    };
  } catch {
    return {
      title: "RSVP | EventFXr",
      description: "Respond to your invitation.",
    };
  }
}

export default async function InviteRSVPPage({ params }: PageProps) {
  const { token } = await params;
  const inviteRef = hashToken(token).substring(0, 16);

  const result = await getInviteForRSVP(token);

  if (!result) {
    notFound();
  }

  const { invite, invitationConfig } = result;
  const event = invite.event;

  // Check if event is cancelled
  if (event.status === "CANCELLED") {
    redirect(`/invite/${token}`);
  }

  // Check if invite is expired
  if (
    invite.status === "EXPIRED" ||
    (invite.expiresAt && new Date(invite.expiresAt) < new Date())
  ) {
    redirect(`/invite/${token}`);
  }

  // Revoked invites: route to the canonical invite page, which renders the
  // "no longer valid" terminal view. Parity with /rsvp/[token] and the RSVP
  // API, which both reject a revoked invite before showing the form.
  if (invite.status === "REVOKED") {
    redirect(`/invite/${token}`);
  }

  // Derive whether the RSVP form should expose the "Message for the couple"
  // textarea. Both the wishes section AND its enableSubmissions flag must be
  // on. Falls back to false when the event has no pageConfig or no wishes.
  const pageConfig = loadAndMigrateConfig(event.pageConfig, {
    eventId: event.id,
    eventTitle: event.title,
  });
  const wishesSection = pageConfig.sections.find(
    (s) => s.type === "wishes" && s.enabled
  );
  const enableWishes =
    wishesSection?.type === "wishes"
      ? wishesSection.data.enableSubmissions !== false
      : false;

  // Get theme configuration (use defaults if no config)
  const themeId: ThemeId = (invitationConfig?.themeId as ThemeId) || "ivory";
  const typographyPair: TypographyPair =
    (invitationConfig?.typographyPair as TypographyPair) || "classic";
  const textDirection = invitationConfig?.textDirection === "RTL" ? "rtl" : "ltr";

  const eventName = invitationConfig?.coupleDisplayName || event.title;

  // RSVP window closed. The canonical /invite/[token] page doesn't gate on the
  // deadline (it always renders the invitation), so a redirect there would loop
  // back to a live-looking RSVP button — render the closed state here instead.
  // Checked before the responded/form branches for parity with /rsvp/[token].
  // A genuine open still counts, so keep the beacon on this path.
  if (event.rsvpDeadline && new Date(event.rsvpDeadline) < new Date()) {
    return (
      <InvitationShell
        themeId={themeId}
        typographyPair={typographyPair}
        textDirection={textDirection}
      >
        <MarkOpenedBeacon token={token} />
        <RsvpClosedView eventName={eventName} token={token} />
      </InvitationShell>
    );
  }

  // Check if already responded
  const hasResponded = !!invite.rsvp;
  const responseLabels = {
    YES: "attending",
    NO: "not attending",
    MAYBE: "undecided",
  };

  // Build portal URL for event page access
  const portalUrl = event.slug ? buildPortalUrl(event.slug, token) : null;

  return (
    <InvitationShell
      themeId={themeId}
      typographyPair={typographyPair}
      textDirection={textDirection}
    >
      <PageViewTracker eventId={event.id} source="rsvp_page" inviteRef={inviteRef} />
      {/* Client-side OPENED beacon (post-hydration) — bots can't trigger it. #148 */}
      <MarkOpenedBeacon token={token} />

      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {/* Back to invitation link */}
        <div className="w-full max-w-md mb-6">
          <Link
            href={`/invite/${token}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--inv-text-secondary)] hover:text-[var(--inv-accent)] transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to invitation
          </Link>
        </div>

        {/* RSVP Card */}
        <div className="w-full max-w-md bg-[var(--inv-card-bg)] rounded-lg shadow-[var(--inv-shadow-soft)] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-8 text-center border-b border-[var(--inv-border)]">
            <h1
              className="text-2xl font-[var(--inv-font-heading)] text-[var(--inv-text-primary)] mb-2"
            >
              RSVP
            </h1>
            <p className="text-sm text-[var(--inv-text-secondary)]">
              {eventName}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {hasResponded ? (
              <AlreadyRespondedView
                response={invite.rsvp!.response}
                guestCount={invite.rsvp!.guestCount}
                responseLabels={responseLabels}
                portalUrl={portalUrl}
              />
            ) : (
              <InvitationRSVPForm
                inviteToken={token}
                eventId={event.id}
                guestName={invite.name || ""}
                guestEmail={invite.email || ""}
                plusOnesAllowed={invite.plusOnesAllowed}
                needsEmail={!invite.email}
                inviteRef={inviteRef}
                enableWishes={enableWishes}
                showSideField={isWeddingTemplate(event.templateId)}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-[var(--inv-text-secondary)] text-center">
          Need to change your response?{" "}
          <a
            href="mailto:support@eventfxr.com"
            className="text-[var(--inv-accent)] hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>
    </InvitationShell>
  );
}

/**
 * View shown when guest has already responded
 */
function AlreadyRespondedView({
  response,
  guestCount,
  responseLabels,
  portalUrl,
}: {
  response: "YES" | "NO" | "MAYBE";
  guestCount: number;
  responseLabels: Record<string, string>;
  portalUrl: string | null;
}) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-[var(--inv-accent)]/10 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-[var(--inv-accent)]"
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
      <h2 className="text-xl font-[var(--inv-font-heading)] text-[var(--inv-text-primary)]">
        Already Responded
      </h2>
      <p className="text-[var(--inv-text-secondary)]">
        You indicated that you are{" "}
        <strong className="text-[var(--inv-text-primary)]">
          {responseLabels[response]}
        </strong>
        {guestCount > 1 && <span> with {guestCount} guests total</span>}.
      </p>
      {portalUrl ? (
        <a
          href={portalUrl}
          className="inline-block px-6 py-2 rounded-full text-sm font-medium bg-[var(--inv-accent)] text-[var(--inv-card-bg)] hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          View Event Details
        </a>
      ) : (
        <p className="text-sm text-[var(--inv-text-secondary)]">
          If you need to change your response, please contact the event organizer.
        </p>
      )}
    </div>
  );
}

/**
 * Shown when the RSVP deadline has passed. Mirrors the closed-state view on
 * /rsvp/[token] inside the themed invitation shell, with a way back to the
 * invitation itself.
 */
function RsvpClosedView({
  eventName,
  token,
}: {
  eventName: string;
  token: string;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-6">
        <Link
          href={`/invite/${token}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--inv-text-secondary)] hover:text-[var(--inv-accent)] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to invitation
        </Link>
      </div>

      <div className="w-full max-w-md bg-[var(--inv-card-bg)] rounded-lg shadow-[var(--inv-shadow-soft)] overflow-hidden">
        <div className="px-6 py-10 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--inv-accent)]/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-[var(--inv-accent)]"
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
          <h1 className="text-2xl font-[var(--inv-font-heading)] text-[var(--inv-text-primary)]">
            RSVP Period Closed
          </h1>
          <p className="text-sm text-[var(--inv-text-secondary)]">
            The RSVP deadline for{" "}
            <strong className="text-[var(--inv-text-primary)]">{eventName}</strong>{" "}
            has passed. If you have questions, please contact the event organizer.
          </p>
        </div>
      </div>
    </div>
  );
}
