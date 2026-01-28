"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
import styles from "./CinematicScroll.module.css";

type CinematicScrollProps = {
  /** Invitation data to display */
  data: InvitationData;
  /** Whether to auto-reveal all sections on mount */
  autoOpen?: boolean;
  /** Initial state (useful for SSR) */
  initialState?: InvitationState;
  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;
  /** Whether to show the replay button when all sections visible */
  showReplay?: boolean;
  /** Whether to show the scroll hint */
  showHint?: boolean;
  /** Additional CSS classes */
  className?: string;
};

const REVEAL_THRESHOLD = 0.15; // Percentage of section visible to trigger reveal

/**
 * CinematicScroll creates a story-driven scroll experience.
 *
 * Content sections fade and slide in as the user scrolls,
 * creating a narrative journey through the invitation.
 *
 * @example
 * ```tsx
 * <CinematicScroll
 *   data={invitationData}
 *   onStateChange={(s) => trackAnalytics(s)}
 * />
 * ```
 */
export function CinematicScroll({
  data,
  autoOpen = false,
  initialState,
  onStateChange,
  showReplay = true,
  showHint = true,
  className,
}: CinematicScrollProps) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  // Calculate total sections based on content
  const hasQuote = !!data.customMessage;
  const totalSections = hasQuote ? 5 : 4; // Hero, [Quote], Date, Venue, RSVP

  // Track which sections have been revealed (by unique key, not index)
  const [revealedSections, setRevealedSections] = useState<Set<string>>(() => {
    if (initialState === "open" || autoOpen || reducedMotion) {
      return new Set(["hero", "quote", "date", "venue", "rsvp"]);
    }
    return new Set(["hero"]); // Hero is always visible initially
  });

  // Store section elements and observer
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  // Track which sections are currently being observed
  const observedSectionsRef = useRef<Set<string>>(new Set());

  // Create IntersectionObserver on mount
  useEffect(() => {
    if (reducedMotion || autoOpen || initialState === "open") return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionKey = entry.target.getAttribute("data-section");
            if (sectionKey) {
              setRevealedSections((prev) => new Set([...prev, sectionKey]));
              // Unobserve and remove from tracking
              observerRef.current?.unobserve(entry.target);
              observedSectionsRef.current.delete(sectionKey);
            }
          }
        });
      },
      {
        threshold: REVEAL_THRESHOLD,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    // Observe any sections that were already registered before observer was ready
    sectionsRef.current.forEach((element, key) => {
      if (key !== "hero" && !observedSectionsRef.current.has(key)) {
        observerRef.current?.observe(element);
        observedSectionsRef.current.add(key);
      }
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedSectionsRef.current.clear();
    };
  }, [reducedMotion, autoOpen, initialState]);

  // Derive state from revealed sections
  const state: InvitationState =
    revealedSections.size >= totalSections
      ? "open"
      : revealedSections.size > 1
        ? "opening"
        : "idle";

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Replay - reset to initial state and scroll to top
  const handleReplay = useCallback(() => {
    if (reducedMotion) return;

    // Reset revealed sections to just hero
    setRevealedSections(new Set(["hero"]));

    // Re-observe all non-hero sections that aren't currently being observed
    if (observerRef.current) {
      sectionsRef.current.forEach((element, key) => {
        if (key !== "hero" && !observedSectionsRef.current.has(key)) {
          observerRef.current?.observe(element);
          observedSectionsRef.current.add(key);
        }
      });
    }

    // Scroll to top smoothly
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reducedMotion]);

  // Format date for display
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: data.timezone,
  }).format(data.eventDate);

  const isFullyRevealed = revealedSections.size >= totalSections;

  // Store section element refs and observe immediately
  // No useCallback to avoid closure capturing stale observerRef.current
  const createSectionRef = (key: string) => (el: HTMLElement | null) => {
    if (el) {
      sectionsRef.current.set(key, el);
      // Observe immediately if observer is ready and not hero
      if (observerRef.current && key !== "hero" && !observedSectionsRef.current.has(key)) {
        observerRef.current.observe(el);
        observedSectionsRef.current.add(key);
      }
    } else {
      // Cleanup: unobserve before removing ref
      const existingEl = sectionsRef.current.get(key);
      if (existingEl && observerRef.current) {
        observerRef.current.unobserve(existingEl);
        observedSectionsRef.current.delete(key);
      }
      sectionsRef.current.delete(key);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        styles.root,
        reducedMotion && styles.reducedMotion,
        className
      )}
    >
      {/* Section 1: Hero - Names */}
      <section
        ref={createSectionRef("hero")}
        data-section="hero"
        className={cn(
          styles.section,
          styles.heroSection,
          revealedSections.has("hero") && styles.revealed
        )}
        aria-label="Invitation introduction"
      >
        <div className={styles.heroContent}>
          {data.inviteeName && (
            <p className={styles.greeting}>
              {data.salutation || "Dear"}{" "}
              {truncateWithEllipsis(
                data.inviteeName,
                CONTENT_LIMITS.inviteeDisplayName.max
              )}
            </p>
          )}
          <h1 className={styles.coupleNames}>
            {truncateWithEllipsis(
              data.coupleNames,
              CONTENT_LIMITS.coupleDisplayName.max
            )}
          </h1>
          <p className={styles.inviteText}>Invite you to celebrate</p>
          <div className={styles.divider} aria-hidden="true" />

          {/* Hero image */}
          {data.heroImageUrl && (
            <div className={styles.heroImageContainer}>
              <img
                src={data.heroImageUrl}
                alt=""
                className={styles.heroImage}
                loading="eager"
              />
            </div>
          )}

          {/* Scroll hint */}
          {showHint && !isFullyRevealed && (
            <div className={styles.scrollHint} aria-hidden="true">
              <span className={styles.scrollHintText}>Scroll to discover</span>
              <div className={styles.scrollIndicator}>
                <div className={styles.scrollDot} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Quote / Custom Message */}
      {data.customMessage && (
        <section
          ref={createSectionRef("quote")}
          data-section="quote"
          className={cn(
            styles.section,
            styles.quoteSection,
            revealedSections.has("quote") && styles.revealed
          )}
          aria-label="Personal message"
        >
          <div className={styles.sectionContent}>
            <blockquote className={styles.quote}>
              <p>
                {truncateWithEllipsis(
                  data.customMessage,
                  CONTENT_LIMITS.customMessage.max
                )}
              </p>
            </blockquote>
          </div>
        </section>
      )}

      {/* Section 3: Date & Time */}
      <section
        ref={createSectionRef("date")}
        data-section="date"
        className={cn(
          styles.section,
          styles.dateSection,
          revealedSections.has("date") && styles.revealed
        )}
        aria-label="Event date and time"
      >
        <div className={styles.sectionContent}>
          <p className={styles.sectionLabel}>When</p>
          <p className={styles.dateValue}>{formattedDate}</p>
          <p className={styles.timeValue}>{data.eventTime}</p>
        </div>
      </section>

      {/* Section 4: Venue */}
      <section
        ref={createSectionRef("venue")}
        data-section="venue"
        className={cn(
          styles.section,
          styles.venueSection,
          revealedSections.has("venue") && styles.revealed
        )}
        aria-label="Event venue"
      >
        <div className={styles.sectionContent}>
          <p className={styles.sectionLabel}>Where</p>
          {data.venue.name && (
            <p className={styles.venueName}>
              {truncateWithEllipsis(data.venue.name, CONTENT_LIMITS.venueName.max)}
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
            <p className={styles.dressCode}>
              Attire: {data.dressCode}
            </p>
          )}
        </div>
      </section>

      {/* Section 5: RSVP Call to Action */}
      <section
        ref={createSectionRef("rsvp")}
        data-section="rsvp"
        className={cn(
          styles.section,
          styles.rsvpSection,
          revealedSections.has("rsvp") && styles.revealed
        )}
        aria-label="RSVP"
      >
        <div className={styles.sectionContent}>
          <p className={styles.rsvpText}>We hope to see you there</p>
          <a href={data.rsvpUrl} className={styles.rsvpButton}>
            RSVP
          </a>
        </div>
      </section>

      {/* Replay button */}
      {showReplay && !reducedMotion && (
        <div className={cn(styles.replayContainer, isFullyRevealed && styles.visible)}>
          <ReplayButton onClick={handleReplay} />
        </div>
      )}
    </div>
  );
}
