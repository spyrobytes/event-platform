import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { hashToken } from "@/lib/tokens";
import { db } from "@/lib/db";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { ThemeId } from "@/lib/invitation-themes";
import { themes } from "@/lib/invitation-themes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

/**
 * Fetches invite with event and invitation config for print
 */
async function getInviteForPrint(token: string) {
  const tokenHash = hashToken(token);

  const invite = await db.invite.findUnique({
    where: { tokenHash },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          timezone: true,
          venueName: true,
          address: true,
          city: true,
          country: true,
          status: true,
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
    const result = await getInviteForPrint(token);

    if (!result) {
      return {
        title: "Print Invitation | EventFXr",
      };
    }

    const { invite, invitationConfig } = result;
    const coupleNames =
      invitationConfig?.coupleDisplayName || invite.event.title;

    return {
      title: `Print Invitation | ${coupleNames}`,
    };
  } catch {
    return {
      title: "Print Invitation | EventFXr",
    };
  }
}

export default async function PrintInvitationPage({ params }: PageProps) {
  const { token } = await params;

  const result = await getInviteForPrint(token);

  if (!result) {
    notFound();
  }

  const { invite, invitationConfig } = result;
  const event = invite.event;

  // Check if event is cancelled
  if (event.status === "CANCELLED") {
    return (
      <div className="print-page p-8 text-center">
        <h1 className="text-2xl font-bold">Event Cancelled</h1>
        <p>This event has been cancelled.</p>
      </div>
    );
  }

  // Get theme colors for print
  const themeId: ThemeId = (invitationConfig?.themeId as ThemeId) || "ivory";
  const themeColors = themes[themeId];

  // Format date
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: event.timezone,
  }).format(new Date(event.startAt));

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
  }).format(new Date(event.startAt));

  const coupleNames = invitationConfig?.coupleDisplayName || event.title;

  // Build address
  const addressParts = [event.venueName, event.address, event.city, event.country]
    .filter(Boolean);

  return (
    <>
      {/* Print-specific styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A5 portrait;
                margin: 0.5in;
              }

              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              .no-print {
                display: none !important;
              }
            }

            .print-page {
              --inv-text-primary: ${themeColors["--inv-text-primary"]};
              --inv-text-secondary: ${themeColors["--inv-text-secondary"]};
              --inv-accent: ${themeColors["--inv-accent"]};
              --inv-card-bg: ${themeColors["--inv-card-bg"]};
              --inv-border: ${themeColors["--inv-border"]};

              font-family: 'Georgia', 'Times New Roman', serif;
              background: ${themeColors["--inv-card-bg"]};
              color: ${themeColors["--inv-text-primary"]};
            }
          `,
        }}
      />

      {/* Print button (hidden in print) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90"
        >
          Print Invitation
        </button>
        <a
          href={`/invite/${token}`}
          className="px-4 py-2 bg-surface-2 text-foreground rounded-md text-sm font-medium hover:bg-surface-3"
        >
          Back
        </a>
      </div>

      {/* Print content */}
      <div className="print-page min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Decorative top border */}
          <div
            className="w-24 h-1 mx-auto mb-8"
            style={{ backgroundColor: themeColors["--inv-accent"] }}
          />

          {/* Greeting */}
          {invite.name && (
            <p
              className="text-xl italic"
              style={{ color: themeColors["--inv-text-primary"] }}
            >
              Dear {truncateWithEllipsis(invite.name, CONTENT_LIMITS.inviteeDisplayName.max)},
            </p>
          )}

          {/* Main text */}
          <p
            className="text-sm uppercase tracking-widest"
            style={{ color: themeColors["--inv-text-secondary"] }}
          >
            You are cordially invited to celebrate
          </p>

          {/* Couple names */}
          <h1
            className="text-4xl font-serif"
            style={{ color: themeColors["--inv-text-primary"] }}
          >
            {truncateWithEllipsis(coupleNames, CONTENT_LIMITS.coupleDisplayName.max)}
          </h1>

          {/* Divider */}
          <div
            className="w-16 h-px mx-auto"
            style={{ backgroundColor: themeColors["--inv-accent"] }}
          />

          {/* Date and time */}
          <div className="space-y-1">
            <p
              className="text-lg"
              style={{ color: themeColors["--inv-text-primary"] }}
            >
              {formattedDate}
            </p>
            <p style={{ color: themeColors["--inv-text-secondary"] }}>
              {formattedTime}
            </p>
          </div>

          {/* Venue */}
          {addressParts.length > 0 && (
            <div className="space-y-1">
              {event.venueName && (
                <p
                  className="font-medium"
                  style={{ color: themeColors["--inv-text-primary"] }}
                >
                  {truncateWithEllipsis(event.venueName, CONTENT_LIMITS.venueName.max)}
                </p>
              )}
              <p
                className="text-sm"
                style={{ color: themeColors["--inv-text-secondary"] }}
              >
                {[event.address, event.city, event.country].filter(Boolean).join(", ")}
              </p>
            </div>
          )}

          {/* Dress code */}
          {invitationConfig?.dressCode && (
            <p
              className="text-sm italic"
              style={{ color: themeColors["--inv-text-secondary"] }}
            >
              Attire: {invitationConfig.dressCode}
            </p>
          )}

          {/* Custom message */}
          {invitationConfig?.customMessage && (
            <p
              className="text-sm max-w-xs mx-auto"
              style={{ color: themeColors["--inv-text-secondary"] }}
            >
              {truncateWithEllipsis(
                invitationConfig.customMessage,
                CONTENT_LIMITS.customMessage.max
              )}
            </p>
          )}

          {/* RSVP note */}
          <div className="pt-6">
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: themeColors["--inv-text-secondary"] }}
            >
              Please respond at
            </p>
            <p
              className="text-sm font-medium"
              style={{ color: themeColors["--inv-accent"] }}
            >
              eventsfixer.com/invite/...
            </p>
          </div>

          {/* Decorative bottom border */}
          <div
            className="w-24 h-1 mx-auto mt-8"
            style={{ backgroundColor: themeColors["--inv-accent"] }}
          />
        </div>
      </div>
    </>
  );
}
