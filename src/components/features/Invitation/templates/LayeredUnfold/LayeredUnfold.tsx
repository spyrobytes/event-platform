"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
import styles from "./LayeredUnfold.module.css";

type LayeredUnfoldProps = {
  /** Invitation data to display */
  data: InvitationData;
  /** Whether to auto-unfold on mount */
  autoOpen?: boolean;
  /** Initial state (useful for SSR) */
  initialState?: InvitationState;
  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;
  /** Whether to show the replay button when open */
  showReplay?: boolean;
  /** Whether to show the hint text */
  showHint?: boolean;
  /** Additional CSS classes */
  className?: string;
};

const TOTAL_LAYERS = 4; // Names, Date, Venue, RSVP
const UNFOLD_DELAY = 150; // ms between each layer unfold

/**
 * LayeredUnfold creates a modern, minimalist invitation experience.
 *
 * Stacked card layers unfold sequentially, revealing content progressively.
 * Users can tap each layer individually or tap once to unfold all.
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

  // Track how many layers are unfolded (0 = all folded, TOTAL_LAYERS = all open)
  const computedInitialLayers =
    initialState === "open" || autoOpen || reducedMotion ? TOTAL_LAYERS : 1;
  const [unfoldedLayers, setUnfoldedLayers] = useState(computedInitialLayers);
  const [isAnimating, setIsAnimating] = useState(false);

  // Derive state from unfolded layers
  const state: InvitationState =
    unfoldedLayers === TOTAL_LAYERS
      ? "open"
      : unfoldedLayers > 1
        ? "opening"
        : "idle";

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Unfold the next layer
  const unfoldNext = useCallback(() => {
    if (isAnimating || unfoldedLayers >= TOTAL_LAYERS) return;

    setUnfoldedLayers((prev) => prev + 1);
  }, [isAnimating, unfoldedLayers]);

  // Unfold all layers with staggered animation
  const unfoldAll = useCallback(() => {
    if (isAnimating || unfoldedLayers >= TOTAL_LAYERS) return;

    if (reducedMotion) {
      setUnfoldedLayers(TOTAL_LAYERS);
      return;
    }

    setIsAnimating(true);

    // Stagger unfold each remaining layer
    const remaining = TOTAL_LAYERS - unfoldedLayers;
    for (let i = 0; i < remaining; i++) {
      setTimeout(() => {
        setUnfoldedLayers((prev) => prev + 1);
        if (i === remaining - 1) {
          setIsAnimating(false);
        }
      }, i * UNFOLD_DELAY);
    }
  }, [isAnimating, unfoldedLayers, reducedMotion]);

  // Handle layer click - unfold next or unfold all on first layer
  const handleLayerClick = useCallback(
    (layerIndex: number) => {
      // If clicking the first visible folded layer, unfold it
      if (layerIndex === unfoldedLayers && unfoldedLayers < TOTAL_LAYERS) {
        unfoldNext();
      }
    },
    [unfoldedLayers, unfoldNext]
  );

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, layerIndex: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleLayerClick(layerIndex);
      }
    },
    [handleLayerClick]
  );

  // Replay - fold all layers back
  const handleReplay = useCallback(() => {
    if (reducedMotion) return;

    setIsAnimating(true);

    // Fold layers in reverse with stagger
    for (let i = TOTAL_LAYERS - 1; i >= 1; i--) {
      setTimeout(() => {
        setUnfoldedLayers(i);
        if (i === 1) {
          setIsAnimating(false);
        }
      }, (TOTAL_LAYERS - 1 - i) * UNFOLD_DELAY);
    }
  }, [reducedMotion]);

  // Format date for display
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: data.timezone,
  }).format(data.eventDate);

  const isFullyOpen = unfoldedLayers >= TOTAL_LAYERS;
  const showUnfoldAll = unfoldedLayers === 1 && !isAnimating;

  return (
    <div className={cn(styles.root, reducedMotion && styles.reducedMotion, className)}>
      <div className={styles.stack}>
        {/* Layer 1: Names */}
        <div
          role="button"
          tabIndex={unfoldedLayers === 0 ? 0 : -1}
          className={cn(
            styles.layer,
            styles.layerNames,
            unfoldedLayers >= 1 ? styles.unfolded : styles.folded
          )}
          onClick={() => handleLayerClick(0)}
          onKeyDown={(e) => handleKeyDown(e, 0)}
          aria-expanded={unfoldedLayers >= 1}
          aria-label="Couple names"
        >
          <div className={styles.layerContent}>
            {data.inviteeName && (
              <p className={styles.greeting}>
                {data.salutation || "Dear"}{" "}
                {truncateWithEllipsis(data.inviteeName, CONTENT_LIMITS.inviteeDisplayName.max)}
              </p>
            )}
            <h1 className={styles.coupleNames}>
              {truncateWithEllipsis(data.coupleNames, CONTENT_LIMITS.coupleDisplayName.max)}
            </h1>
            <p className={styles.eventTitle}>
              {truncateWithEllipsis(data.eventTitle, CONTENT_LIMITS.eventTitle.max)}
            </p>
            <div className={styles.divider} aria-hidden="true" />
          </div>

          {/* Unfold All button */}
          <button
            type="button"
            className={cn(styles.unfoldAllButton, showUnfoldAll && styles.visible)}
            onClick={(e) => {
              e.stopPropagation();
              unfoldAll();
            }}
            aria-label="Unfold all layers"
          >
            View All
          </button>

          {/* Hint */}
          {showHint && (
            <span className={cn(styles.hint, isFullyOpen && styles.hidden)}>
              Tap to reveal
            </span>
          )}
        </div>

        {/* Layer 2: Date & Time */}
        <div
          role="button"
          tabIndex={unfoldedLayers === 1 ? 0 : -1}
          className={cn(
            styles.layer,
            styles.layerDate,
            unfoldedLayers >= 2 ? styles.unfolded : styles.folded
          )}
          onClick={() => handleLayerClick(1)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          aria-expanded={unfoldedLayers >= 2}
          aria-label="Event date and time"
        >
          <div className={styles.layerContent}>
            <p className={styles.dateHeading}>When</p>
            <p className={styles.dateValue}>{formattedDate}</p>
            <p className={styles.timeValue}>{data.eventTime}</p>
          </div>
        </div>

        {/* Layer 3: Venue */}
        <div
          role="button"
          tabIndex={unfoldedLayers === 2 ? 0 : -1}
          className={cn(
            styles.layer,
            styles.layerVenue,
            unfoldedLayers >= 3 ? styles.unfolded : styles.folded
          )}
          onClick={() => handleLayerClick(2)}
          onKeyDown={(e) => handleKeyDown(e, 2)}
          aria-expanded={unfoldedLayers >= 3}
          aria-label="Event venue"
        >
          <div className={styles.layerContent}>
            <p className={styles.venueHeading}>Where</p>
            {data.venue.name && (
              <p className={styles.venueName}>
                {truncateWithEllipsis(data.venue.name, CONTENT_LIMITS.venueName.max)}
              </p>
            )}
            <p className={styles.venueAddress}>
              {data.venue.address && (
                <>
                  {truncateWithEllipsis(data.venue.address, CONTENT_LIMITS.address.max)}
                  <br />
                </>
              )}
              {[data.venue.city, data.venue.state].filter(Boolean).join(", ")}
            </p>
            {data.dressCode && (
              <p className={styles.venueAddress} style={{ marginTop: "0.75rem" }}>
                <em>Attire: {data.dressCode}</em>
              </p>
            )}
          </div>
        </div>

        {/* Layer 4: RSVP */}
        <div
          role="button"
          tabIndex={unfoldedLayers === 3 ? 0 : -1}
          className={cn(
            styles.layer,
            styles.layerRsvp,
            unfoldedLayers >= 4 ? styles.unfolded : styles.folded
          )}
          onClick={() => handleLayerClick(3)}
          onKeyDown={(e) => handleKeyDown(e, 3)}
          aria-expanded={unfoldedLayers >= 4}
          aria-label="RSVP"
        >
          <div className={styles.layerContent}>
            {data.customMessage && (
              <p className={styles.rsvpText}>
                {truncateWithEllipsis(data.customMessage, CONTENT_LIMITS.customMessage.max)}
              </p>
            )}
            <a href={data.rsvpUrl} className={styles.rsvpButton}>
              RSVP
            </a>
          </div>
        </div>
      </div>

      {/* Replay button */}
      {showReplay && !reducedMotion && (
        <div className={cn(styles.replayContainer, isFullyOpen && styles.visible)}>
          <ReplayButton onClick={handleReplay} disabled={isAnimating} />
        </div>
      )}
    </div>
  );
}
