"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { cn, formatEventDateLong } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS, NAME_CONNECTORS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
import { classifyInvitationDensity } from "@/lib/invitation-density";
import { isAllowedImageHost } from "@/lib/images/host";
import { InvitationHeader } from "../../InvitationHeader";
import styles from "./SplitRevealCardV2.module.css";

// =============================================================================
// TYPES
// =============================================================================

export type SplitRevealV2Theme =
  | "ivory"
  | "blush"
  | "sage"
  | "midnight"
  | "champagne";

export type SplitRevealCardV2Props = {
  data: InvitationData;
  autoOpen?: boolean;
  initialState?: InvitationState;
  onStateChange?: (state: InvitationState) => void;
  showReplay?: boolean;
  showHint?: boolean;
  showConfetti?: boolean;
  /** InvitationShell theme ID — mapped 1:1 to a SplitReveal palette. */
  themeId?: string;
  /** Explicit theme override; takes precedence over themeId mapping. */
  theme?: SplitRevealV2Theme;
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

const CONFETTI_COLORS: Record<SplitRevealV2Theme, string[]> = {
  ivory: ["#c9a961", "#e8d5a3", "#a68b3d", "#ffffff", "#8b7759"],
  blush: ["#d4a5a5", "#f0d5d5", "#b78787", "#ffffff", "#c9a5a5"],
  sage: ["#8b9b8b", "#c5d2c5", "#6a7a6a", "#ffffff", "#3a4a3a"],
  midnight: ["#ffd700", "#ffe55c", "#e6c200", "#eeeef0", "#c9a961"],
  champagne: ["#c9a961", "#e5c880", "#b89651", "#fffdf7", "#7a6f65"],
};

const CONFETTI_SHAPES = ["■", "●", "◆", "★", "♥"];

// =============================================================================
// UTILITIES
// =============================================================================

function parseCoupleNames(coupleNames: string): { person1: string; person2: string } {
  for (const sep of NAME_CONNECTORS) {
    if (coupleNames.includes(sep)) {
      const [person1, person2] = coupleNames.split(sep).map((s) => s.trim());
      return { person1: person1 || "Partner", person2: person2 || "Partner" };
    }
  }
  return { person1: coupleNames, person2: "" };
}

function generateMonogram(person1: string, person2: string): string {
  const initial1 = person1.charAt(0).toUpperCase();
  const initial2 = person2.charAt(0).toUpperCase();
  if (initial2) return `${initial1}&${initial2}`;
  return initial1;
}

/**
 * Map InvitationShell theme IDs to SplitRevealCardV2 palettes 1:1.
 * Unknown IDs fall back to ivory.
 */
function mapTheme(themeId?: string): SplitRevealV2Theme {
  switch (themeId) {
    case "blush":
      return "blush";
    case "sage":
      return "sage";
    case "midnight":
      return "midnight";
    case "champagne":
      return "champagne";
    case "ivory":
    default:
      return "ivory";
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * SplitRevealCardV2 — photo-forward variant of SplitRevealCard.
 *
 * The hero photo (framed in a gold ring) replaces the wax seal on the closed
 * card. On click the photo fades, revealing the seal+monogram underneath; the
 * seal then splits and the doors open as in V1. Long traditional names and
 * family blocks fit because the interior photo is gone — the photo lives on
 * the cover, not in the content stack.
 *
 * When no heroImageUrl is provided, the card behaves like V1 (seal shown
 * directly, no cover-fade pre-stage).
 */
export function SplitRevealCardV2({
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
}: SplitRevealCardV2Props) {
  const prefersReducedMotion = useReducedMotion();

  const shouldStartOpen = initialState === "open" || autoOpen || prefersReducedMotion;

  const [isOpen, setIsOpen] = useState(shouldStartOpen);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);

  const state: InvitationState = isOpen ? "open" : "idle";

  const resolvedTheme = theme || mapTheme(themeId);

  const parsedNames = parseCoupleNames(data.coupleNames);
  const person1 = data.person1Name || parsedNames.person1;
  const person2 = data.person2Name || parsedNames.person2;

  const monogram = data.monogram || generateMonogram(person1, person2);

  const isTraditional = data.headerMode === "traditional";
  const eventTypeText = isTraditional
    ? null
    : data.eventTypeText || "Request the pleasure of your company";

  const formattedDate = formatEventDateLong(data.eventDate, data.timezone);

  const hasCeremony = !!data.ceremonyDate;
  const hasReception = !!data.receptionDate;
  const hasCeremonyReception = hasCeremony || hasReception;

  // Density classifier (shared with V1 + dashboard) — replaces V1's narrow
  // ceremony+reception-only gate with signals that also catch traditional
  // headers and long couple/family names.
  const { isDense, isExtremeDense, hasLongCoupleNames } = classifyInvitationDensity({
    person1Name: person1,
    person2Name: person2,
    person1FamilyName: data.person1FamilyName,
    person2FamilyName: data.person2FamilyName,
    headerMode: data.headerMode,
    hasCeremonyDate: hasCeremony,
    hasReceptionDate: hasReception,
  });

  // V2 differentiator: the cover is the photo. If no photo, behave like V1.
  const hasCover = !!data.heroImageUrl;

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

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
    setTimeout(() => setConfettiPieces([]), 5000);
  }, [resolvedTheme, showConfetti, prefersReducedMotion]);

  const handleToggle = useCallback(() => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (newIsOpen) {
      // Confetti fires after cover fades + doors begin opening.
      // With cover: cover-fade 0.4s + seal-split delay 0.5s + door start.
      // Without cover: matches V1 timing.
      setTimeout(triggerConfetti, hasCover ? 900 : 400);
    }
  }, [isOpen, triggerConfetti, hasCover]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const handleRsvpClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

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
        className={cn(
          styles.container,
          isOpen && styles.opened,
          hasCover && styles.containerWithCover
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={isOpen ? "Wedding invitation" : "Click to open wedding invitation"}
        aria-expanded={isOpen}
      >
        <div className={styles.frame} aria-hidden="true" />

        {/* Revealed Content (Behind doors) — no interior photo in V2 */}
        <div className={styles.content}>
          <div
            className={cn(
              styles.contentInner,
              isOpen && styles.contentVisible,
              isDense && styles.contentInnerCompact,
              hasLongCoupleNames && styles.shrinkNames,
              isExtremeDense && styles.contentInnerExtreme
            )}
          >
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
              familyGroupClassName={styles.familyNameUnit}
              familySeparatorClassName={styles.familySeparator}
              familyInviteClassName={styles.familyInviteText}
            />

            {/* Couple Names — schema-bounded, no hardcoded 30-char cap */}
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
            {eventTypeText && <p className={styles.eventType}>{eventTypeText}</p>}

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

            {data.dressCode && (
              <p className={styles.dressCode}>
                Attire: {truncateWithEllipsis(data.dressCode, CONTENT_LIMITS.dressCode.max)}
              </p>
            )}

            {data.customMessage && (
              <p className={styles.customMessage}>
                {truncateWithEllipsis(data.customMessage, CONTENT_LIMITS.customMessage.max)}
              </p>
            )}

            <a href={data.rsvpUrl} className={styles.rsvpButton} onClick={handleRsvpClick}>
              Kindly Respond
            </a>
          </div>
        </div>

        {/* The Doors */}
        <div className={styles.doorsContainer} aria-hidden="true">
          <div className={cn(styles.door, styles.doorLeft)}>
            <div className={styles.doorFront}>
              <div className={styles.doorShimmer} />
            </div>
            <div className={styles.doorBack} />
          </div>
          <div className={cn(styles.door, styles.doorRight)}>
            <div className={styles.doorFront}>
              <div className={styles.doorShimmer} />
            </div>
            <div className={styles.doorBack} />
          </div>
        </div>

        {/* Wax Seal (sits underneath the cover when cover exists) */}
        <div className={styles.sealContainer}>
          <div className={cn(styles.seal, isOpen && styles.sealHidden)}>
            <span className={styles.sealMonogram}>{monogram}</span>
          </div>
          <div className={cn(styles.sealLeft, isOpen && styles.sealSplit)}>
            <div className={styles.sealHalf} />
          </div>
          <div className={cn(styles.sealRight, isOpen && styles.sealSplit)}>
            <div className={styles.sealHalf} />
          </div>
        </div>

        {/* Photo Cover — V2 differentiator. Sits above the seal; fades on open. */}
        {hasCover && data.heroImageUrl && (
          <div
            className={cn(styles.cover, isOpen && styles.coverHidden)}
            aria-hidden="true"
          >
            <Image
              src={data.heroImageUrl}
              alt=""
              fill
              sizes="(max-width: 480px) 110px, (min-width: 1025px) 150px, 130px"
              className={styles.coverImg}
              priority
              unoptimized={!isAllowedImageHost(data.heroImageUrl)}
            />
            <div className={styles.coverRing} aria-hidden="true" />
          </div>
        )}

        {showHint && (
          <p className={cn(styles.ctaHint, isOpen && styles.ctaHidden)}>
            {hasCover ? "Tap the photo to open" : "Tap the seal to open"}
          </p>
        )}
      </div>

      {showReplay && !prefersReducedMotion && (
        <div className={cn(styles.replayContainer, isOpen && styles.visible)}>
          <ReplayButton onClick={handleReplay} />
        </div>
      )}
    </div>
  );
}

export default SplitRevealCardV2;
