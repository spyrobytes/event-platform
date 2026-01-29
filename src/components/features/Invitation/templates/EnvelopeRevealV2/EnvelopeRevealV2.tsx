"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./EnvelopeRevealV2.module.css";

type EnvelopeTheme = "forest" | "blush" | "navy" | "sage" | "champagne";

type EnvelopeRevealV2Props = {
  /** Content to display inside the invitation card */
  children: React.ReactNode;
  /** Color theme for the envelope */
  theme?: EnvelopeTheme;
  /** Whether to auto-open on mount (use sparingly) */
  autoOpen?: boolean;
  /** Callback when envelope state changes */
  onStateChange?: (isOpen: boolean) => void;
  /** Accessible label for the envelope */
  ariaLabel?: string;
  /** Whether to show the close button when open */
  showClose?: boolean;
  /** Whether to show the "tap to open" hint */
  showHint?: boolean;
  /** Custom seal content (defaults to heart) */
  sealContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
};

/**
 * EnvelopeRevealV2 — Premium wedding invitation reveal animation
 *
 * Creates an interactive envelope that opens to reveal an invitation card.
 * Uses pure CSS animations for smooth 60fps performance.
 * Supports multiple color themes and respects reduced motion preferences.
 *
 * This is V2 with self-contained themes, CSS heart icon, and InvitationContent helper.
 *
 * @example
 * ```tsx
 * <EnvelopeRevealV2 theme="blush" onStateChange={(open) => console.log(open)}>
 *   <InvitationContent names={["Emma", "James"]} date="June 14, 2025" />
 * </EnvelopeRevealV2>
 * ```
 */
export function EnvelopeRevealV2({
  children,
  theme = "forest",
  autoOpen = false,
  onStateChange,
  ariaLabel = "Open wedding invitation",
  showClose = true,
  showHint = true,
  sealContent,
  className,
}: EnvelopeRevealV2Props) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [reducedMotion, setReducedMotion] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(isOpen);
  }, [isOpen, onStateChange]);

  // Handle envelope click (open only)
  const handleEnvelopeClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't open if clicking close button
      if ((e.target as HTMLElement).closest(`.${styles.closeBtn}`)) return;
      if (!isOpen) {
        setIsOpen(true);
      }
    },
    [isOpen]
  );

  // Handle close button click
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  }, []);

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  // Theme class
  const themeClass = styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`];

  return (
    <div
      className={cn(
        styles.container,
        themeClass,
        reducedMotion && styles.reducedMotion,
        className
      )}
    >
      <div
        ref={wrapperRef}
        className={cn(styles.envelopeWrapper, isOpen && styles.flap)}
        onClick={handleEnvelopeClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
      >
        <div className={styles.envelope}>
          {/* Inner liner (visible when flap opens) */}
          <div className={styles.envelopeLiner} aria-hidden="true" />

          {/* Flap front overlay */}
          <div className={styles.envelopeFlapFront} aria-hidden="true" />

          {/* Front cover gradient */}
          <div className={styles.envelopeCoverGradient} aria-hidden="true" />

          {/* The invitation card */}
          <div
            className={styles.letter}
            role="region"
            aria-label="Invitation details"
            aria-hidden={!isOpen}
          >
            <div className={styles.letterContent}>{children}</div>
          </div>
        </div>

        {/* Wax seal */}
        <div className={styles.seal} aria-hidden="true">
          <div className={styles.sealBody}>
            {sealContent ?? <div className={styles.sealIcon} />}
          </div>
        </div>

        {/* Hint text */}
        {showHint && (
          <span className={styles.hint}>
            <span className={styles.hintIcon}>&#x2709;</span>
            Tap to open
          </span>
        )}

        {/* Close button */}
        {showClose && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close invitation"
            tabIndex={isOpen ? 0 : -1}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M5 12L12 5M5 12L12 19" />
            </svg>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   COMPANION COMPONENTS — Pre-styled invitation content
   ============================================================================= */

type InvitationContentProps = {
  /** Prelude text (e.g., "Together with their families") */
  prelude?: string;
  /** Names to display (array of two names) */
  names: [string, string];
  /** Custom ampersand or connector */
  connector?: React.ReactNode;
  /** Primary detail text */
  details?: string;
  /** Date line */
  date: string;
  /** Time line */
  time?: string;
  /** Venue/location */
  venue?: string;
  /** Show decorative flourish */
  showFlourish?: boolean;
};

/**
 * Pre-styled invitation content for use inside EnvelopeRevealV2
 *
 * @example
 * ```tsx
 * <EnvelopeRevealV2 theme="forest">
 *   <InvitationContent
 *     names={["Emma Rose", "James Oliver"]}
 *     date="Saturday, June 14, 2025"
 *     venue="The Grand Ballroom"
 *   />
 * </EnvelopeRevealV2>
 * ```
 */
export function InvitationContent({
  prelude = "Together with their families",
  names,
  connector = "&",
  details = "Request the pleasure of your company at the celebration of their marriage",
  date,
  time,
  venue,
  showFlourish = true,
}: InvitationContentProps) {
  return (
    <>
      {prelude && <p className={styles.letterPrelude}>{prelude}</p>}
      <p className={styles.letterNames}>
        {names[0]}
        <span className={styles.letterAmpersand}>{connector}</span>
        {names[1]}
      </p>
      {details && <p className={styles.letterDetails}>{details}</p>}
      <p className={styles.letterDetails}>
        <span className={styles.letterDate}>{date}</span>
        {time && (
          <>
            <br />
            {time}
          </>
        )}
        {venue && (
          <>
            <br />
            {venue}
          </>
        )}
      </p>
      {showFlourish && <span className={styles.letterFlourish} aria-hidden="true" />}
    </>
  );
}
