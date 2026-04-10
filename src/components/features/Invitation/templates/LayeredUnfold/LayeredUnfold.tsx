"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
import { InvitationHeader } from "../../InvitationHeader";
import styles from "./LayeredUnfold.module.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LayerPhase = "peek" | "folded" | "unfolded" | "closing";

type LayeredUnfoldProps = {
  /** Invitation data to display */
  data: InvitationData;
  /** Whether to auto-unfold on mount */
  autoOpen?: boolean;
  /** Initial state (useful for SSR / Storybook) */
  initialState?: InvitationState;
  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;
  /** Whether to show the replay button when fully open */
  showReplay?: boolean;
  /** Whether to show the "tap the card" hint below the stack */
  showHint?: boolean;
  /** Additional CSS classes for the root element */
  className?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Panel indices: Names(0), Date(1), Venue(2), RSVP(3) */
const TOTAL_LAYERS = 4;

/** Base ms between each panel unfolding */
const UNFOLD_STAGGER_MS = 500;

/** Base ms between each panel folding (closing is faster) */
const FOLD_STAGGER_MS = 380;

/** Each successive panel animates slightly faster (gravity pull) */
const ACCEL_FACTOR = 0.85;

/**
 * Time to wait after the closing animation ends before swapping
 * a layer from `closing` → `folded`. Must exceed --dur-fold (520ms).
 */
const FOLD_SETTLE_MS = 560;

/** Pause after all panels are folded before transitioning to peek */
const PEEK_PAUSE_MS = 200;

function staggerDelay(step: number, baseMs: number): number {
  return baseMs * Math.pow(ACCEL_FACTOR, step);
}

// ---------------------------------------------------------------------------
// Initial phase computation
// ---------------------------------------------------------------------------

function buildInitialPhases(allOpen: boolean): LayerPhase[] {
  if (allOpen) {
    return Array(TOTAL_LAYERS).fill("unfolded") as LayerPhase[];
  }
  // Idle: panel 0 unfolded, rest peek
  return ["unfolded", "peek", "peek", "peek"];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * LayeredUnfold — a paper-accordion invitation reveal.
 *
 * Panels swing down sequentially from shared crease lines, mimicking
 * a physical folded invitation being opened. Each panel uses 3D rotation
 * with backface-visibility (no opacity fade) and a damped-spring settle
 * keyframe for realistic paper physics.
 *
 * State model: each layer tracks its own phase independently via a
 * `LayerPhase[]` array, allowing precise control during staggered
 * replay (closing → folded → peek without any visual snap).
 *
 * @example
 * ```tsx
 * <LayeredUnfold
 *   data={invitationData}
 *   onStateChange={(s) => trackAnalytics(s)}
 * />
 * ```
 */
export function LayeredUnfold({
  data,
  autoOpen = false,
  initialState,
  onStateChange,
  showReplay = true,
  showHint = true,
  className,
}: LayeredUnfoldProps) {
  const reducedMotion = useReducedMotion();

  // -----------------------------------------------------------------------
  // Per-layer phase state
  // -----------------------------------------------------------------------

  const allOpen =
    initialState === "open" || autoOpen || reducedMotion;

  const [phases, setPhases] = useState<LayerPhase[]>(() =>
    buildInitialPhases(allOpen)
  );
  const [isAnimating, setIsAnimating] = useState(false);

  // Timer refs for cleanup
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const unfoldedCount = phases.filter((p) => p === "unfolded").length;
  const isFullyOpen = unfoldedCount === TOTAL_LAYERS;
  const isIdle = unfoldedCount <= 1 && !isAnimating;

  const derivedState: InvitationState = isFullyOpen
    ? "open"
    : unfoldedCount > 1
      ? "opening"
      : "idle";

  useEffect(() => {
    onStateChange?.(derivedState);
  }, [derivedState, onStateChange]);

  // -----------------------------------------------------------------------
  // Phase helpers
  // -----------------------------------------------------------------------

  /** Set a single layer's phase by index */
  const setLayerPhase = useCallback(
    (index: number, phase: LayerPhase) => {
      setPhases((prev) => {
        const next = [...prev];
        next[index] = phase;
        return next;
      });
    },
    []
  );

  /**
   * The "frontier" — the first non-unfolded layer.
   * Tapping this layer unfolds it. Returns -1 if all are unfolded.
   */
  const frontierIndex = phases.findIndex(
    (p, i) => i > 0 && p !== "unfolded"
  );

  // -----------------------------------------------------------------------
  // Unfold actions
  // -----------------------------------------------------------------------

  /** Unfold a single next panel */
  const unfoldNext = useCallback(() => {
    if (isAnimating || frontierIndex < 0) return;

    // If any layers are still peeking, fold them first (peek → folded)
    // so they don't show slivers during mid-unfold
    setPhases((prev) => {
      const next = [...prev];
      for (let i = 1; i < TOTAL_LAYERS; i++) {
        if (next[i] === "peek") next[i] = "folded";
      }
      next[frontierIndex] = "unfolded";
      return next;
    });
  }, [isAnimating, frontierIndex]);

  /** Unfold ALL remaining panels with staggered timing */
  const unfoldAll = useCallback(() => {
    if (isAnimating || frontierIndex < 0) return;

    if (reducedMotion) {
      setPhases(Array(TOTAL_LAYERS).fill("unfolded") as LayerPhase[]);
      return;
    }

    setIsAnimating(true);
    clearTimers();

    // Immediately fold all peek layers (they shouldn't sliver during unfold)
    setPhases((prev) => {
      const next = [...prev];
      for (let i = 1; i < TOTAL_LAYERS; i++) {
        if (next[i] === "peek") next[i] = "folded";
      }
      return next;
    });

    // Stagger unfold from the frontier onwards
    const layersToUnfold: number[] = [];
    for (let i = frontierIndex; i < TOTAL_LAYERS; i++) {
      layersToUnfold.push(i);
    }

    let cumulativeDelay = 0;
    layersToUnfold.forEach((layerIdx, step) => {
      cumulativeDelay += step === 0 ? 60 : staggerDelay(step, UNFOLD_STAGGER_MS);

      const timer = setTimeout(() => {
        setLayerPhase(layerIdx, "unfolded");
        if (step === layersToUnfold.length - 1) {
          setIsAnimating(false);
        }
      }, cumulativeDelay);

      timersRef.current.push(timer);
    });
  }, [isAnimating, frontierIndex, reducedMotion, clearTimers, setLayerPhase]);

  // -----------------------------------------------------------------------
  // Replay (close) — smooth reverse fold
  // -----------------------------------------------------------------------

  /**
   * Replay folds panels back one-by-one in reverse order:
   *
   *   1. Layer N → "closing" (CSS animation: 0° → -180°, 520ms)
   *   2. After animation ends → "folded" (same -180°, seamless)
   *   3. Next layer starts closing (staggered)
   *   4. After all are folded → brief pause → "peek" (tiny slivers
   *      ease in via CSS transition on max-height/opacity)
   *
   * The closing → folded handoff is zero-delta (-180° → -180°).
   * The folded → peek transition is invisible because peek slivers
   * are 3-6px with overflow:hidden and have a 450ms CSS transition.
   */
  const handleReplay = useCallback(() => {
    if (reducedMotion || isAnimating) return;

    setIsAnimating(true);
    clearTimers();

    // Panels to fold in reverse: indices 3, 2, 1
    const toClose: number[] = [];
    for (let i = TOTAL_LAYERS - 1; i >= 1; i--) {
      if (phases[i] === "unfolded") toClose.push(i);
    }

    if (toClose.length === 0) {
      setIsAnimating(false);
      return;
    }

    let cumulativeDelay = 0;

    toClose.forEach((layerIdx, step) => {
      cumulativeDelay += step === 0 ? 0 : staggerDelay(step, FOLD_STAGGER_MS);

      // Start closing animation
      const closeTimer = setTimeout(() => {
        setLayerPhase(layerIdx, "closing");
      }, cumulativeDelay);

      // After fold animation completes → snap to folded (seamless -180°)
      const settleTimer = setTimeout(() => {
        setLayerPhase(layerIdx, "folded");
      }, cumulativeDelay + FOLD_SETTLE_MS);

      timersRef.current.push(closeTimer, settleTimer);
    });

    // After all panels are folded → gentle transition to peek
    const totalFoldTime =
      cumulativeDelay + FOLD_SETTLE_MS + PEEK_PAUSE_MS;

    const peekTimer = setTimeout(() => {
      setPhases(["unfolded", "peek", "peek", "peek"]);
      setIsAnimating(false);
    }, totalFoldTime);

    timersRef.current.push(peekTimer);
  }, [reducedMotion, isAnimating, phases, clearTimers, setLayerPhase]);

  // -----------------------------------------------------------------------
  // Interaction handlers
  // -----------------------------------------------------------------------

  const handleLayerClick = useCallback(
    (layerIndex: number) => {
      if (isAnimating) return;

      // Tap panel 0 when idle → unfold all
      if (layerIndex === 0 && isIdle) {
        unfoldAll();
        return;
      }

      // Tap the frontier panel → unfold just the next one
      if (layerIndex === frontierIndex && frontierIndex > 0) {
        unfoldNext();
      }
    },
    [isAnimating, isIdle, frontierIndex, unfoldAll, unfoldNext]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, layerIndex: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleLayerClick(layerIndex);
      }
    },
    [handleLayerClick]
  );

  // -----------------------------------------------------------------------
  // Formatted data
  // -----------------------------------------------------------------------

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: data.timezone,
  }).format(data.eventDate);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function phaseClass(index: number): string {
    return styles[phases[index]] ?? "";
  }

  function isInteractive(index: number): boolean {
    if (isAnimating) return false;
    if (index === 0 && isIdle) return true;
    if (index === frontierIndex && frontierIndex > 0) return true;
    return false;
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div
      className={cn(
        styles.root,
        reducedMotion && styles.reducedMotion,
        className
      )}
    >
      <div className={styles.stack}>
        {/* ── Layer 1: Names ────────────────────────────────── */}
        <div
          role="button"
          tabIndex={isInteractive(0) ? 0 : -1}
          className={cn(
            styles.layer,
            styles.layerNames,
            phaseClass(0),
            isIdle && !isAnimating && styles.idlePulse
          )}
          onClick={() => handleLayerClick(0)}
          onKeyDown={(e) => handleKeyDown(e, 0)}
          aria-expanded={phases[0] === "unfolded"}
          aria-label={isIdle ? "Tap to open invitation" : "Couple names"}
        >
          <div className={styles.layerContent}>
            {data.inviteeName && (
              <p className={styles.greeting}>
                {data.salutation || "Dear"}{" "}
                {truncateWithEllipsis(
                  data.inviteeName,
                  CONTENT_LIMITS.inviteeDisplayName.max
                )}
              </p>
            )}
            <InvitationHeader
              data={data}
              modernDefault={null}
              headerTextClassName={styles.headerText}
              traditionalClassName={styles.traditionalHeader}
              familiesLabelClassName={styles.familiesLabel}
              familyNamesClassName={styles.familyNames}
              familyInviteClassName={styles.familyInviteText}
            />
            <h1 className={styles.coupleNames}>
              {data.person1Name && data.person2Name ? (
                <>
                  {truncateWithEllipsis(data.person1Name, CONTENT_LIMITS.personName.max)}
                  <span className={styles.ampersand}>&amp;</span>
                  {truncateWithEllipsis(data.person2Name, CONTENT_LIMITS.personName.max)}
                </>
              ) : (
                truncateWithEllipsis(
                  data.coupleNames,
                  CONTENT_LIMITS.coupleDisplayName.max
                )
              )}
            </h1>
            {data.headerMode !== "traditional" && (
              <p className={styles.eventTitle}>
                {truncateWithEllipsis(
                  data.eventTypeText || data.eventTitle,
                  CONTENT_LIMITS.eventTypeText.max
                )}
              </p>
            )}
            <div className={styles.divider} aria-hidden="true" />
          </div>
        </div>

        {/* ── Layer 2: Date & Time ─────────────────────────── */}
        <div
          role="button"
          tabIndex={isInteractive(1) ? 0 : -1}
          className={cn(styles.layer, styles.layerDate, phaseClass(1))}
          onClick={() => handleLayerClick(1)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          aria-expanded={phases[1] === "unfolded"}
          aria-label="Event date and time"
        >
          <div className={styles.crease} aria-hidden="true" />
          <div className={styles.layerContent}>
            <p className={styles.sectionLabel}>When</p>
            <p className={styles.dateValue}>{formattedDate}</p>
            <p className={styles.timeValue}>{data.eventTime}</p>
          </div>
        </div>

        {/* ── Layer 3: Venue ───────────────────────────────── */}
        <div
          role="button"
          tabIndex={isInteractive(2) ? 0 : -1}
          className={cn(styles.layer, styles.layerVenue, phaseClass(2))}
          onClick={() => handleLayerClick(2)}
          onKeyDown={(e) => handleKeyDown(e, 2)}
          aria-expanded={phases[2] === "unfolded"}
          aria-label="Event venue"
        >
          <div className={styles.crease} aria-hidden="true" />
          <div className={styles.layerContent}>
            <p className={styles.sectionLabel}>Where</p>
            {data.venue.name && (
              <p className={styles.venueName}>
                {truncateWithEllipsis(
                  data.venue.name,
                  CONTENT_LIMITS.venueName.max
                )}
              </p>
            )}
            <p className={styles.venueAddress}>
              {data.venue.address && (
                <>
                  {truncateWithEllipsis(
                    data.venue.address,
                    CONTENT_LIMITS.address.max
                  )}
                  <br />
                </>
              )}
              {[data.venue.city, data.venue.state].filter(Boolean).join(", ")}
            </p>
            {data.dressCode && (
              <p className={styles.dressCode}>Attire: {data.dressCode}</p>
            )}
          </div>
        </div>

        {/* ── Layer 4: RSVP ────────────────────────────────── */}
        <div
          role="button"
          tabIndex={isInteractive(3) ? 0 : -1}
          className={cn(styles.layer, styles.layerRsvp, phaseClass(3))}
          onClick={() => handleLayerClick(3)}
          onKeyDown={(e) => handleKeyDown(e, 3)}
          aria-expanded={phases[3] === "unfolded"}
          aria-label="RSVP"
        >
          <div className={styles.crease} aria-hidden="true" />
          <div className={styles.layerContent}>
            {data.customMessage && (
              <p className={styles.rsvpText}>
                {truncateWithEllipsis(
                  data.customMessage,
                  CONTENT_LIMITS.customMessage.max
                )}
              </p>
            )}
            <a
              href={data.rsvpUrl}
              className={styles.rsvpButton}
              onClick={(e) => e.stopPropagation()}
            >
              RSVP
            </a>
          </div>
        </div>
      </div>

      {/* ── Hint ─────────────────────────────────────────── */}
      {showHint && (
        <div
          className={cn(styles.hint, isIdle && !isAnimating && styles.visible)}
        >
          Tap the card
        </div>
      )}

      {/* ── Replay ───────────────────────────────────────── */}
      {showReplay && !reducedMotion && (
        <div
          className={cn(
            styles.replayContainer,
            isFullyOpen && !isAnimating && styles.visible
          )}
        >
          <ReplayButton onClick={handleReplay} disabled={isAnimating} />
        </div>
      )}
    </div>
  );
}
