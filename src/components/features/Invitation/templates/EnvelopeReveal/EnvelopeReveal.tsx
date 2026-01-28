"use client";

import { useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useInvitationState,
  useReducedMotion,
  useAnimationComplete,
  type InvitationState,
} from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
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
  /** Whether to show the replay button when open */
  showReplay?: boolean;
  /** Whether to show the "tap to open" hint */
  showHint?: boolean;
  /** Additional CSS classes for the root */
  className?: string;
};

/**
 * EnvelopeReveal creates a premium invitation experience.
 *
 * Mimics opening a physical envelope to reveal the invitation card inside.
 * Uses CSS transitions for smooth 60fps animation and respects reduced motion.
 *
 * @example
 * ```tsx
 * <EnvelopeReveal onStateChange={(s) => trackAnalytics(s)}>
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
  showReplay = true,
  showHint = true,
  className,
}: EnvelopeRevealProps) {
  const reducedMotion = useReducedMotion();
  const envelopeRef = useRef<HTMLButtonElement>(null);

  // Determine initial state based on props and reduced motion
  const computedInitialState: InvitationState =
    initialState ?? (autoOpen || reducedMotion ? "open" : "idle");

  const { state, isAnimating, open, complete, replay } =
    useInvitationState(computedInitialState);

  // Detect animation completion
  useAnimationComplete(envelopeRef, state, complete, {
    enabled: !reducedMotion,
    fallbackTimeout: 800, // Slightly longer than --inv-dur-4
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

  // Handle replay click
  const handleReplay = useCallback(() => {
    if (state === "open" && !reducedMotion) {
      replay();
    }
  }, [state, replay, reducedMotion]);

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

  return (
    <div className={cn(styles.root, stateClasses, className)}>
      {/* Envelope */}
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
        {/* Envelope layers */}
        <div className={styles.back} aria-hidden="true" />
        <div className={styles.flap} aria-hidden="true" />
        <div className={styles.front} aria-hidden="true" />

        {/* Hint text */}
        {showHint && state === "idle" && (
          <span className={styles.hint}>Tap to open</span>
        )}
      </button>

      {/* Card container (positioned absolutely relative to root) */}
      <div
        className={styles.cardContainer}
        role="region"
        aria-live="polite"
        aria-label="Invitation details"
        aria-hidden={state === "idle" || state === "closing"}
      >
        {children}
      </div>

      {/* Replay button */}
      {showReplay && !reducedMotion && (
        <div className={styles.replayContainer}>
          {state === "open" && (
            <ReplayButton onClick={handleReplay} disabled={isAnimating} />
          )}
        </div>
      )}
    </div>
  );
}
