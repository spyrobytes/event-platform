"use client";

import { cn } from "@/lib/utils";
import { InviteeGreeting } from "./InviteeGreeting";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";

type InvitationCardProps = {
  /** Invitation data to display */
  data: InvitationData;
  /** Whether to show the RSVP button */
  showRsvpButton?: boolean;
  /** Custom RSVP button text */
  rsvpButtonText?: string;
  /** Callback when RSVP button is clicked */
  onRsvpClick?: () => void;
  /** Additional CSS classes */
  className?: string;
};

/**
 * The invitation card content displayed inside the envelope.
 *
 * Shows couple names, event details, venue, and RSVP call-to-action.
 * Uses theme tokens for consistent styling.
 *
 * @example
 * ```tsx
 * <InvitationCard
 *   data={invitationData}
 *   onRsvpClick={() => router.push(data.rsvpUrl)}
 * />
 * ```
 */
export function InvitationCard({
  data,
  showRsvpButton = true,
  rsvpButtonText = "RSVP",
  onRsvpClick,
  className,
}: InvitationCardProps) {
  const {
    coupleNames,
    eventTitle,
    eventDate,
    eventTime,
    timezone,
    venue,
    inviteeName,
    salutation,
    dressCode,
    customMessage,
    rsvpUrl,
  } = data;

  // Format date for display
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  }).format(eventDate);

  return (
    <div
      className={cn(
        "invitation-card",
        "bg-[var(--inv-card-bg)]",
        "rounded-lg",
        "shadow-[var(--inv-shadow-soft)]",
        "p-8 md:p-12",
        "text-center",
        "max-w-md mx-auto",
        className
      )}
    >
      {/* Personalized greeting */}
      {inviteeName && (
        <InviteeGreeting
          name={inviteeName}
          salutation={salutation}
          className="mb-6"
        />
      )}

      {/* Couple names */}
      <h1
        className={cn(
          "font-[var(--inv-font-script)]",
          "text-4xl md:text-5xl lg:text-6xl",
          "text-[var(--inv-text-primary)]",
          "mb-2",
          "leading-tight"
        )}
      >
        {truncateWithEllipsis(coupleNames, CONTENT_LIMITS.coupleDisplayName.max)}
      </h1>

      {/* Event title / "request the pleasure of your company" */}
      <p
        className={cn(
          "font-[var(--inv-font-body)]",
          "text-sm md:text-base",
          "text-[var(--inv-text-secondary)]",
          "uppercase tracking-widest",
          "mb-8"
        )}
      >
        {truncateWithEllipsis(eventTitle, CONTENT_LIMITS.eventTitle.max)}
      </p>

      {/* Decorative divider */}
      <div
        className="w-16 h-px bg-[var(--inv-accent)] mx-auto mb-8"
        aria-hidden="true"
      />

      {/* Date and time */}
      <div className="mb-6">
        <p
          className={cn(
            "font-[var(--inv-font-heading)]",
            "text-xl md:text-2xl",
            "text-[var(--inv-text-primary)]",
            "mb-1"
          )}
        >
          {formattedDate}
        </p>
        <p
          className={cn(
            "font-[var(--inv-font-body)]",
            "text-base",
            "text-[var(--inv-text-secondary)]"
          )}
        >
          {eventTime}
        </p>
      </div>

      {/* Venue */}
      {venue.name && (
        <div className="mb-6">
          <p
            className={cn(
              "font-[var(--inv-font-heading)]",
              "text-lg",
              "text-[var(--inv-text-primary)]",
              "mb-1"
            )}
          >
            {truncateWithEllipsis(venue.name, CONTENT_LIMITS.venueName.max)}
          </p>
          <p
            className={cn(
              "font-[var(--inv-font-body)]",
              "text-sm",
              "text-[var(--inv-text-secondary)]",
              "whitespace-pre-line"
            )}
          >
            {venue.address && (
              <>
                {truncateWithEllipsis(venue.address, CONTENT_LIMITS.address.max)}
                <br />
              </>
            )}
            {[venue.city, venue.state, venue.zipCode].filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {/* Dress code */}
      {dressCode && (
        <p
          className={cn(
            "font-[var(--inv-font-body)]",
            "text-sm",
            "text-[var(--inv-text-secondary)]",
            "italic",
            "mb-6"
          )}
        >
          Attire: {truncateWithEllipsis(dressCode, CONTENT_LIMITS.dressCode.max)}
        </p>
      )}

      {/* Custom message */}
      {customMessage && (
        <p
          className={cn(
            "font-[var(--inv-font-body)]",
            "text-base",
            "text-[var(--inv-text-secondary)]",
            "mb-8",
            "max-w-sm mx-auto"
          )}
        >
          {truncateWithEllipsis(customMessage, CONTENT_LIMITS.customMessage.max)}
        </p>
      )}

      {/* RSVP Button */}
      {showRsvpButton && (
        <a
          href={rsvpUrl}
          onClick={(e) => {
            if (onRsvpClick) {
              e.preventDefault();
              onRsvpClick();
            }
          }}
          className={cn(
            "inline-block",
            "px-8 py-3",
            "bg-[var(--inv-accent)]",
            "text-[var(--inv-card-bg)]",
            "font-[var(--inv-font-body)]",
            "font-semibold",
            "text-sm uppercase tracking-wider",
            "rounded-full",
            "shadow-md",
            "transition-all duration-200",
            "hover:shadow-lg hover:scale-105",
            "focus:outline-none focus:ring-2 focus:ring-[var(--inv-accent)] focus:ring-offset-2"
          )}
        >
          {rsvpButtonText}
        </a>
      )}
    </div>
  );
}
