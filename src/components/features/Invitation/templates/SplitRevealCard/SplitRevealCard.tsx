"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
import { classifyInvitationDensity } from "@/lib/invitation-density";
import { isAllowedImageHost } from "@/lib/images/host";
import { InvitationHeader } from "../../InvitationHeader";
import styles from "./SplitRevealCard.module.css";

// =============================================================================
// TYPES
// =============================================================================

export type SplitRevealTheme = "ivory" | "blush" | "navy";

export type SplitRevealCardProps = {
  /** Invitation data to display */
  data: InvitationData;
  /** Whether to auto-open on mount */
  autoOpen?: boolean;
  /** Initial state (useful for SSR / already responded) */
  initialState?: InvitationState;
  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;
  /** Whether to show the replay button when open */
  showReplay?: boolean;
  /** Whether to show the hint text */
  showHint?: boolean;
  /** Enable confetti on reveal */
  showConfetti?: boolean;
  /** InvitationShell theme ID (ivory, blush, sage, midnight, champagne) — mapped to one of three SplitReveal palettes. */
  themeId?: string;
  /** Explicit theme override; takes precedence over themeId mapping. */
  theme?: SplitRevealTheme;
  /** Additional CSS classes */
  className?: string;
};

type ConfettiPiece = {
  id: number;
  x: number;
  y: number;
  color: string;
  shape: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const CONFETTI_COLORS: Record<SplitRevealTheme, string[]> = {
  ivory: ["#c9a961", "#e8d5a3", "#a68b3d", "#ffffff", "#8b7759"],
  blush: ["#d4a5a5", "#f0d5d5", "#b78787", "#ffffff", "#c9a5a5"],
  navy: ["#c0c7d1", "#e8ebf0", "#8a939f", "#ffffff", "#7a8699"],
};

const CONFETTI_SHAPES = ["■", "●", "◆", "★", "♥"];

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Parse couple names from a string like "Emma & James" or "Emma Rose & James William"
 */
function parseCoupleNames(coupleNames: string): { person1: string; person2: string } {
  // Try common separators: &, and, +
  const separators = [" & ", " and ", " + "];

  for (const sep of separators) {
    if (coupleNames.includes(sep)) {
      const [person1, person2] = coupleNames.split(sep).map((s) => s.trim());
      return { person1: person1 || "Partner", person2: person2 || "Partner" };
    }
  }

  // Fallback: just use the full string
  return { person1: coupleNames, person2: "" };
}

/**
 * Generate monogram from couple names
 */
function generateMonogram(person1: string, person2: string): string {
  const initial1 = person1.charAt(0).toUpperCase();
  const initial2 = person2.charAt(0).toUpperCase();

  if (initial2) {
    return `${initial1}&${initial2}`;
  }
  return initial1;
}

/**
 * Map InvitationShell theme IDs to SplitRevealCard themes
 */
function mapTheme(themeId?: string): SplitRevealTheme {
  switch (themeId) {
    case "blush":
      return "blush";
    case "midnight":
    case "sage":
      return "navy";
    case "ivory":
    case "champagne":
    default:
      return "ivory";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SplitRevealCard creates a dramatic wedding invitation reveal experience.
 *
 * Features split-door animation, breaking wax seal, and confetti burst.
 * Supports three theme variants: ivory, blush, and navy.
 *
 * @example
 * ```tsx
 * <SplitRevealCard
 *   data={invitationData}
 *   onStateChange={(s) => trackAnalytics(s)}
 * />
 * ```
 */
export function SplitRevealCard({
  data,
  autoOpen = false,
  initialState,
  onStateChange,
  showReplay = true,
  showHint = true,
  showConfetti = true,
  themeId,
  theme,
  className,
}: SplitRevealCardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Determine initial open state
  const shouldStartOpen = initialState === "open" || autoOpen || prefersReducedMotion;

  const [isOpen, setIsOpen] = useState(shouldStartOpen);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  // Derive invitation state from isOpen
  const state: InvitationState = isOpen ? "open" : "idle";

  // Resolve theme — mapTheme translates InvitationShell themeId
  // (ivory|blush|sage|midnight|champagne) into one of V1's three palettes.
  const resolvedTheme = theme || mapTheme(themeId);

  // Use structured names if provided, otherwise parse from coupleNames
  const parsedNames = parseCoupleNames(data.coupleNames);
  const person1 = data.person1Name || parsedNames.person1;
  const person2 = data.person2Name || parsedNames.person2;

  // Use explicit monogram if provided, otherwise generate from names
  const monogram = data.monogram || generateMonogram(person1, person2);

  // Customizable text with defaults
  const isTraditional = data.headerMode === "traditional";
  const eventTypeText = isTraditional ? null : (data.eventTypeText || "Request the pleasure of your company");

  // Format date for display
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: data.timezone,
  }).format(data.eventDate);

  const hasCeremonyReception = !!(data.ceremonyDate || data.receptionDate);

  // Density classifier — extends the compact trigger beyond V1's original
  // ceremony+reception-only gate to also catch traditional headers and long
  // names. isExtremeDense additionally clamps customMessage and tightens
  // typography. Photo size is scoped to hasCeremonyAndReception via the
  // separate .shrinkPhoto class so the V1 photo doesn't shrink under
  // traditional-alone or long-names-alone conditions.
  const { isDense, isExtremeDense, hasCeremonyAndReception, hasLongCoupleNames } =
    classifyInvitationDensity({
      person1Name: person1,
      person2Name: person2,
      person1FamilyName: data.person1FamilyName,
      person2FamilyName: data.person2FamilyName,
      headerMode: data.headerMode,
      hasCeremonyDate: !!data.ceremonyDate,
      hasReceptionDate: !!data.receptionDate,
    });

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Generate confetti pieces
  const triggerConfetti = useCallback(() => {
    if (prefersReducedMotion || !showConfetti) return;

    const colors = CONFETTI_COLORS[resolvedTheme];
    const pieces: ConfettiPiece[] = [];

    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: Date.now() + i,
        x: 50 + (Math.random() - 0.5) * 40,
        y: 30 + Math.random() * 15,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
        size: 8 + Math.random() * 8,
        duration: 2 + Math.random() * 2,
        delay: i * 0.03,
        drift: (Math.random() - 0.5) * 200,
      });
    }

    setConfettiPieces(pieces);

    // Clear confetti after animation completes
    setTimeout(() => {
      setConfettiPieces([]);
    }, 5000);
  }, [resolvedTheme, showConfetti, prefersReducedMotion]);

  // Handle toggle
  const handleToggle = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    if (newIsOpen) {
      // Trigger confetti after doors start opening
      setTimeout(triggerConfetti, 400);
    }
  }, [isOpen, triggerConfetti]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  // Handle RSVP click (stop propagation to prevent toggle)
  const handleRsvpClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigation is handled by the anchor element
  }, []);

  // Handle replay
  const handleReplay = useCallback(() => {
    if (prefersReducedMotion) return;
    setIsOpen(false);
  }, [prefersReducedMotion]);

  return (
    <div
      className={cn(styles.wrapper, prefersReducedMotion && styles.reducedMotion, className)}
      data-theme={resolvedTheme}
    >
      {/* Confetti Container */}
      {confettiPieces.length > 0 && (
        <div className={styles.confettiContainer} aria-hidden="true">
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className={styles.confetti}
              style={{
                left: `${piece.x}%`,
                top: `${piece.y}%`,
                color: piece.color,
                fontSize: `${piece.size}px`,
                animationDuration: `${piece.duration}s`,
                animationDelay: `${piece.delay}s`,
                // @ts-expect-error CSS custom property
                "--drift": `${piece.drift}px`,
              }}
            >
              {piece.shape}
            </div>
          ))}
        </div>
      )}

      {/* Main Invitation Container */}
      <div
        className={cn(styles.container, isOpen && styles.opened)}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={isOpen ? "Wedding invitation" : "Click to open wedding invitation"}
        aria-expanded={isOpen}
      >
        {/* Decorative Frame */}
        <div className={styles.frame} aria-hidden="true" />

        {/* Revealed Content (Behind doors) */}
        <div className={styles.content}>
          <div
            className={cn(
              styles.contentInner,
              isOpen && styles.contentVisible,
              isDense && styles.contentInnerCompact,
              hasCeremonyAndReception && styles.shrinkPhoto,
              hasLongCoupleNames && styles.shrinkNames,
              isExtremeDense && styles.contentInnerExtreme
            )}
          >
            {/* Couple Photo — actual rendered size is governed by .photo CSS
                (90px base, 75px ≤480, 64px when .shrinkPhoto applies).
                width/height props are aspect-ratio hints; className styles
                take precedence. `unoptimized` is set for hosts not in
                next.config.ts remotePatterns so external URLs (legacy data,
                non-Supabase hosts) render instead of throwing. */}
            {data.heroImageUrl && (
              <Image
                src={data.heroImageUrl}
                alt={`${person1} & ${person2}`}
                width={90}
                height={90}
                sizes="90px"
                className={styles.photo}
                unoptimized={!isAllowedImageHost(data.heroImageUrl)}
              />
            )}

            {/* Invitee Greeting */}
            {data.inviteeName && (
              <p className={styles.greeting}>
                {data.salutation || "Dear"}{" "}
                {truncateWithEllipsis(data.inviteeName, CONTENT_LIMITS.inviteeDisplayName.max)}
              </p>
            )}

            {/* Header */}
            <InvitationHeader
              data={data}
              headerTextClassName={styles.header}
              traditionalClassName={styles.traditionalHeader}
              familiesLabelClassName={styles.familiesLabel}
              familyNamesClassName={styles.familyNames}
              familyInviteClassName={styles.familyInviteText}
            />

            {/* Couple Names — schema-bounded; wrap protection in CSS handles
                multi-part formal names. Use compact/extreme cascade for fit. */}
            <h1 className={styles.names}>
              {truncateWithEllipsis(person1, CONTENT_LIMITS.personName.max)}
              {person2 && (
                <>
                  <span className={styles.ampersand}>&</span>
                  {truncateWithEllipsis(person2, CONTENT_LIMITS.personName.max)}
                </>
              )}
            </h1>

            {/* Event Type */}
            {eventTypeText && (
              <p className={styles.eventType}>{eventTypeText}</p>
            )}

            {/* Divider */}
            <div className={styles.divider} aria-hidden="true" />

            {/* Date & Time */}
            {hasCeremonyReception ? (
              <>
                {data.ceremonyDate && (
                  <div className={styles.eventSection}>
                    <p className={styles.sectionLabel}>Ceremony</p>
                    <p className={styles.date}>{data.ceremonyDate}</p>
                    <p className={styles.time}>{data.ceremonyTime || data.eventTime}</p>
                    {data.ceremonyVenue && <p className={styles.venue}>{data.ceremonyVenue}</p>}
                  </div>
                )}
                {data.receptionDate && (
                  <div className={styles.eventSection}>
                    <p className={styles.sectionLabel}>Reception</p>
                    <p className={styles.date}>{data.receptionDate}</p>
                    {data.receptionTime && <p className={styles.time}>{data.receptionTime}</p>}
                    {data.receptionVenue && <p className={styles.venue}>{data.receptionVenue}</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className={styles.date}>{formattedDate}</p>
                <p className={styles.time}>{data.eventTime}</p>
              </>
            )}

            {/* Venue (generic — hidden when ceremony/reception provides venue) */}
            {!hasCeremonyReception && (
            <p className={styles.venue}>
              {data.venue.name && (
                <>
                  {truncateWithEllipsis(data.venue.name, CONTENT_LIMITS.venueName.max)}
                  <br />
                </>
              )}
              {[data.venue.city, data.venue.state].filter(Boolean).join(", ")}
            </p>
            )}

            {/* Dress Code */}
            {data.dressCode && (
              <p className={styles.dressCode}>
                Attire: {truncateWithEllipsis(data.dressCode, CONTENT_LIMITS.dressCode.max)}
              </p>
            )}

            {/* Custom Message */}
            {data.customMessage && (
              <p className={styles.customMessage}>
                {truncateWithEllipsis(data.customMessage, CONTENT_LIMITS.customMessage.max)}
              </p>
            )}

            {/* RSVP Button */}
            <a
              href={data.rsvpUrl}
              className={styles.rsvpButton}
              onClick={handleRsvpClick}
            >
              Kindly Respond
            </a>
          </div>
        </div>

        {/* The Doors */}
        <div className={styles.doorsContainer} aria-hidden="true">
          {/* Left Door */}
          <div className={cn(styles.door, styles.doorLeft)}>
            <div className={styles.doorFront}>
              <div className={styles.doorShimmer} />
            </div>
            <div className={styles.doorBack} />
          </div>

          {/* Right Door */}
          <div className={cn(styles.door, styles.doorRight)}>
            <div className={styles.doorFront}>
              <div className={styles.doorShimmer} />
            </div>
            <div className={styles.doorBack} />
          </div>
        </div>

        {/* Wax Seal */}
        <div className={styles.sealContainer}>
          <div className={cn(styles.seal, isOpen && styles.sealHidden)}>
            <span className={styles.sealMonogram}>{monogram}</span>
          </div>
          {/* Split seal halves */}
          <div className={cn(styles.sealLeft, isOpen && styles.sealSplit)}>
            <div className={styles.sealHalf} />
          </div>
          <div className={cn(styles.sealRight, isOpen && styles.sealSplit)}>
            <div className={styles.sealHalf} />
          </div>
        </div>

        {/* CTA Hint */}
        {showHint && (
          <p className={cn(styles.ctaHint, isOpen && styles.ctaHidden)}>
            Tap the seal to open
          </p>
        )}
      </div>

      {/* Replay button */}
      {showReplay && !prefersReducedMotion && (
        <div className={cn(styles.replayContainer, isOpen && styles.visible)}>
          <ReplayButton onClick={handleReplay} />
        </div>
      )}
    </div>
  );
}

export default SplitRevealCard;
