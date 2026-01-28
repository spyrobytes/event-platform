"use client";

import { useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useInvitationState,
  useReducedMotion,
  useAnimationComplete,
  type InvitationState,
} from "@/hooks";
import styles from "./EnvelopeReveal.module.css";

type EnvelopeRevealProps = {
  /** Content to display inside the card (usually InvitationCard) */
  children: React.ReactNode;
  /** Whether to auto-open on mount (use sparingly) */
  autoOpen?: boolean;
  /** Initial state (useful for SSR) */
  initialState?: InvitationState;
  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;
  /** Accessible label for the envelope button */
  ariaLabel?: string;
  /** Whether to show the close button when open */
  showClose?: boolean;
  /** Whether to show the "tap to open" hint */
  showHint?: boolean;
  /** Envelope color theme */
  theme?: "ivory" | "blush" | "sage" | "champagne" | "navy";
  /** Additional CSS classes for the root */
  className?: string;
};

/**
 * EnvelopeReveal creates a premium invitation experience.
 *
 * Mimics opening a physical envelope to reveal the invitation card inside.
 * Features multi-tonal envelope design, wax seal, and smooth card extraction animation.
 * Uses CSS transitions for smooth 60fps animation and respects reduced motion.
 *
 * @example
 * ```tsx
 * <EnvelopeReveal theme="blush" onStateChange={(s) => trackAnalytics(s)}>
 *   <InvitationCard data={invitationData} />
 * </EnvelopeReveal>
 * ```
 */
export function EnvelopeReveal({
  children,
  autoOpen = false,
  initialState,
  onStateChange,
  ariaLabel = "Open invitation",
  showClose = true,
  showHint = true,
  theme = "ivory",
  className,
}: EnvelopeRevealProps) {
  const reducedMotion = useReducedMotion();
  const envelopeRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Determine initial state based on props and reduced motion
  const computedInitialState: InvitationState =
    initialState ?? (autoOpen || reducedMotion ? "open" : "idle");

  const { state, isAnimating, open, close, complete } =
    useInvitationState(computedInitialState);

  // Detect animation completion
  useAnimationComplete(cardRef, state, complete, {
    enabled: !reducedMotion,
    fallbackTimeout: 900,
  });

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Handle envelope click
  const handleEnvelopeClick = useCallback(() => {
    if (state === "idle") {
      open();
    }
  }, [state, open]);

  // Handle close/replay click
  const handleClose = useCallback(() => {
    if (state === "open" && !reducedMotion) {
      close();
    }
  }, [state, close, reducedMotion]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleEnvelopeClick();
      }
    },
    [handleEnvelopeClick]
  );

  // State-based CSS classes
  const stateClasses = {
    [styles.isOpening]: state === "opening",
    [styles.isOpen]: state === "open",
    [styles.isClosing]: state === "closing",
    [styles.reducedMotion]: reducedMotion,
  };

  // Theme classes
  const themeClass =
    styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`];

  return (
    <div className={cn(styles.root, stateClasses, themeClass, className)}>
      {/* Ambient background glow */}
      <div className={styles.ambientGlow} aria-hidden="true" />

      {/* Envelope container */}
      <div className={styles.envelopeWrapper}>
        {/* Envelope button */}
        <button
          ref={envelopeRef}
          type="button"
          className={styles.envelope}
          onClick={handleEnvelopeClick}
          onKeyDown={handleKeyDown}
          disabled={state !== "idle"}
          aria-expanded={state === "open"}
          aria-label={ariaLabel}
        >
          {/* Envelope shadow (separate element for better animation) */}
          <div className={styles.envelopeShadow} aria-hidden="true" />

          {/* Back panel - visible inside when flap opens */}
          <div className={styles.back} aria-hidden="true">
            {/* Inner liner pattern */}
            <div className={styles.liner} />
          </div>

          {/* Flap - triangular top that opens */}
          <div className={styles.flap} aria-hidden="true">
            {/* Wax seal */}
            <div className={styles.seal}>
              <span className={styles.sealMonogram} aria-hidden="true">
                &#x2661;
              </span>
            </div>
          </div>

          {/* Front panel - lower portion */}
          <div className={styles.front} aria-hidden="true">
            {/* Subtle embossed edge effect */}
            <div className={styles.frontEdge} />
          </div>

          {/* Hint text */}
          {showHint && state === "idle" && (
            <span className={styles.hint}>
              <span className={styles.hintIcon} aria-hidden="true">
                &#x2709;
              </span>
              Tap to open
            </span>
          )}
        </button>

        {/* Card container - starts inside envelope, slides out */}
        <div
          ref={cardRef}
          className={styles.cardContainer}
          role="region"
          aria-live="polite"
          aria-label="Invitation details"
          aria-hidden={state === "idle" || state === "closing"}
        >
          <div className={styles.cardInner}>{children}</div>
        </div>
      </div>

      {/* Close button - appears after opening */}
      {showClose && !reducedMotion && (
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          disabled={state !== "open" || isAnimating}
          aria-label="Close invitation"
        >
          <svg
            className={styles.closeIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M19 12H5M5 12L12 5M5 12L12 19"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Close envelope</span>
        </button>
      )}
    </div>
  );
}
