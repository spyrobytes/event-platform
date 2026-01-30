"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
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
  /** Override theme (defaults to mapping from InvitationShell theme) */
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

  // Resolve theme
  const resolvedTheme = theme || mapTheme();

  // Use structured names if provided, otherwise parse from coupleNames
  const parsedNames = parseCoupleNames(data.coupleNames);
  const person1 = data.person1Name || parsedNames.person1;
  const person2 = data.person2Name || parsedNames.person2;

  // Use explicit monogram if provided, otherwise generate from names
  const monogram = data.monogram || generateMonogram(person1, person2);

  // Customizable text with defaults
  const headerText = data.headerText || "Together with their families";
  const eventTypeText = data.eventTypeText || "Request the pleasure of your company";

  // Format date for display
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: data.timezone,
  }).format(data.eventDate);

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
          <div className={cn(styles.contentInner, isOpen && styles.contentVisible)}>
            {/* Couple Photo */}
            {data.heroImageUrl && (
              <img
                src={data.heroImageUrl}
                alt={`${person1} & ${person2}`}
                className={styles.photo}
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
            <p className={styles.header}>{headerText}</p>

            {/* Couple Names */}
            <h1 className={styles.names}>
              {truncateWithEllipsis(person1, 30)}
              {person2 && (
                <>
                  <span className={styles.ampersand}>&</span>
                  {truncateWithEllipsis(person2, 30)}
                </>
              )}
            </h1>

            {/* Event Type */}
            <p className={styles.eventType}>{eventTypeText}</p>

            {/* Divider */}
            <div className={styles.divider} aria-hidden="true" />

            {/* Date & Time */}
            <p className={styles.date}>{formattedDate}</p>
            <p className={styles.time}>{data.eventTime}</p>

            {/* Venue */}
            <p className={styles.venue}>
              {data.venue.name && (
                <>
                  {truncateWithEllipsis(data.venue.name, CONTENT_LIMITS.venueName.max)}
                  <br />
                </>
              )}
              {[data.venue.city, data.venue.state].filter(Boolean).join(", ")}
            </p>

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
