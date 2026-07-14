"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn, formatEventDateLong } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
import styles from "./TimeBasedRevealV2.module.css";

type TimeBasedRevealV2Props = {
  /** Invitation data to display */
  data: InvitationData;
  /** Whether to auto-play on mount (default: true) */
  autoPlay?: boolean;
  /** Initial state (useful for SSR) */
  initialState?: InvitationState;
  /** Callback when state changes */
  onStateChange?: (state: InvitationState) => void;
  /** Whether to show the replay button when complete */
  showReplay?: boolean;
  /** Whether to show playback controls */
  showControls?: boolean;
  /** Additional CSS classes */
  className?: string;
};

// Scene configuration with timing (in milliseconds)
const SCENE_TIMINGS = {
  greeting: { delay: 0, duration: 1500 },
  names: { delay: 1500, duration: 2000 },
  invite: { delay: 3500, duration: 1500 },
  date: { delay: 5000, duration: 2000 },
  venue: { delay: 7000, duration: 2000 },
  message: { delay: 9000, duration: 2000 },
  rsvp: { delay: 11000, duration: 1500 },
} as const;

type SceneKey = keyof typeof SCENE_TIMINGS;

const SCENE_ORDER: SceneKey[] = [
  "greeting",
  "names",
  "invite",
  "date",
  "venue",
  "message",
  "rsvp",
];

// Total duration of the presentation
const TOTAL_DURATION = 12500;

/** Viewport width breakpoint at which we collapse from 3 acts (mobile) to 2
 *  (desktop). Matches the existing mobile-optimization media query. */
const MOBILE_BREAKPOINT_PX = 640;

/** Auto-scroll fires 800ms before the next scene reveals, giving the smooth
 *  scroll time to settle before that scene starts fading in. */
const SCROLL_LEAD_MS = 800;

/** Desktop trigger: one scroll, before venue (Act 1+date → details). */
const SCROLL_TRIGGER_DETAILS_MS = SCENE_TIMINGS.venue.delay - SCROLL_LEAD_MS;

/** Mobile-only second trigger: scroll before the date scene reveals
 *  (announcement → date), since on mobile date gets its own viewport. */
const SCROLL_TRIGGER_DATE_MS = SCENE_TIMINGS.date.delay - SCROLL_LEAD_MS;

// How long after a programmatic scroll any incoming scroll events should
// still be attributed to us (and not flag userScrolledRef). Smooth scroll
// + iOS rubber-band can take ~1s; 1500ms is a comfortable buffer.
const PROGRAMMATIC_SCROLL_WINDOW_MS = 1500;

// Delay after firing the scroll before we move keyboard/SR focus into
// Act 2. Roughly matches when a smooth scroll across one viewport settles.
const FOCUS_AFTER_SCROLL_MS = 800;

/**
 * TimeBasedRevealV2 — identical behavior to V1 in this commit.
 *
 * Registered as a separate template so the picker, schema, and database
 * accept the new enum. The two-act autoscroll behavior lands in the next
 * commit; isolating that change keeps the registration diff small and
 * leaves V1 untouched for any event already pointing at it.
 */
export function TimeBasedRevealV2({
  data,
  autoPlay = true,
  initialState,
  onStateChange,
  showReplay = true,
  showControls = true,
  className,
}: TimeBasedRevealV2Props) {
  const reducedMotion = useReducedMotion();

  // Determine which scenes are applicable based on data
  const hasGreeting = !!data.inviteeName;
  const hasMessage = !!data.customMessage;

  // Filter scenes based on available data
  const activeScenes = SCENE_ORDER.filter((scene) => {
    if (scene === "greeting" && !hasGreeting) return false;
    if (scene === "message" && !hasMessage) return false;
    return true;
  });

  // Calculate total scenes for this invitation
  const totalScenes = activeScenes.length;

  // Track revealed scenes and playback state
  const [revealedScenes, setRevealedScenes] = useState<Set<SceneKey>>(() => {
    if (initialState === "open" || reducedMotion) {
      return new Set(activeScenes);
    }
    return new Set<SceneKey>();
  });

  const [isPlaying, setIsPlaying] = useState(() => {
    if (initialState === "open" || reducedMotion) return false;
    return autoPlay;
  });

  const [progress, setProgress] = useState(() => {
    if (initialState === "open" || reducedMotion) return 100;
    return 0;
  });

  // Refs for timer management
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Refs for the three section anchors. On desktop the announcement + date
  // sections share a viewport (one scroll fires); on mobile each section is
  // its own viewport (two scrolls fire).
  const announcementRef = useRef<HTMLElement>(null);
  const dateRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  /** True once any user-initiated scroll has been observed this playback.
   *  Latches every remaining auto-scroll OFF — we never yank a user who's
   *  chosen to scroll. */
  const userScrolledRef = useRef(false);
  /** Set of trigger ids that have already fired this playback. Prevents
   *  re-firing after pause/resume re-arms timers. */
  const firedTriggersRef = useRef<Set<"date" | "details">>(new Set());
  /** Timestamp until which incoming scroll events should be attributed to our
   *  programmatic scroll, not a user gesture. */
  const programmaticUntilRef = useRef<number>(0);

  // Derive invitation state
  const state: InvitationState =
    revealedScenes.size >= totalScenes
      ? "open"
      : revealedScenes.size > 0
        ? "opening"
        : "idle";

  const isComplete = revealedScenes.size >= totalScenes;

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Start the presentation from a given elapsed time
  const startPresentation = useCallback(
    (elapsedTime: number = 0) => {
      if (reducedMotion) return;

      clearAllTimers();
      startTimeRef.current = Date.now() - elapsedTime;

      // Schedule scene reveals
      activeScenes.forEach((scene) => {
        const timing = SCENE_TIMINGS[scene];
        const remainingDelay = timing.delay - elapsedTime;

        if (remainingDelay <= 0) {
          // Scene should already be revealed
          setRevealedScenes((prev) => new Set([...prev, scene]));
        } else {
          // Schedule future reveal
          const timer = setTimeout(() => {
            setRevealedScenes((prev) => new Set([...prev, scene]));
          }, remainingDelay);
          timersRef.current.push(timer);
        }
      });

      // Update progress bar
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
        setProgress(newProgress);

        if (elapsed >= TOTAL_DURATION) {
          clearInterval(progressIntervalRef.current!);
          progressIntervalRef.current = null;
          setIsPlaying(false);
        }
      }, 50);

      // Schedule auto-scrolls. Desktop fires one scroll (announcement+date
      // share one viewport, then details); mobile fires two (each section
      // is its own viewport). matchMedia is read at trigger time, not at
      // schedule time, so a window resize across the breakpoint mid-playback
      // is reflected in the next decision.
      //
      // We scroll by exactly one viewport rather than scrollIntoView'ing
      // the next section: scrollIntoView travels element.top, which can
      // exceed 1vh when a section's content overflows its 100dvh min-height
      // and would blur past un-seen content. A fixed one-viewport advance
      // keeps the scroll length predictable; if a section overflows, the
      // user continues manually from a sane starting point inside it.
      const scheduleTrigger = (
        id: "date" | "details",
        triggerAt: number,
        focusTarget: () => HTMLElement | null,
        onlyIf: () => boolean
      ) => {
        const delay = triggerAt - elapsedTime;
        if (delay <= 0) return;
        const timer = setTimeout(() => {
          if (firedTriggersRef.current.has(id)) return;
          if (userScrolledRef.current) return;
          if (!onlyIf()) return;
          const target = focusTarget();
          if (!target) return;
          // If the target section is already roughly half-in-view, the user
          // (or a previous trigger) has already gotten there — don't re-scroll.
          if (target.getBoundingClientRect().top < window.innerHeight * 0.5) {
            firedTriggersRef.current.add(id);
            return;
          }

          firedTriggersRef.current.add(id);
          programmaticUntilRef.current =
            Date.now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
          window.scrollBy({ top: window.innerHeight, behavior: "smooth" });

          // Move keyboard/SR focus into the new section after the scroll
          // settles, so non-sighted users land on the right content.
          const focusTimer = setTimeout(() => {
            target.focus({ preventScroll: true });
          }, FOCUS_AFTER_SCROLL_MS);
          timersRef.current.push(focusTimer);
        }, delay);
        timersRef.current.push(timer);
      };

      const isMobile = () =>
        window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;

      // Mobile-only: announcement → date scroll, just before date reveals.
      scheduleTrigger("date", SCROLL_TRIGGER_DATE_MS, () => dateRef.current, isMobile);
      // Always: scroll to the details section, just before venue reveals.
      // On desktop this is the only scroll; on mobile it's the second.
      scheduleTrigger("details", SCROLL_TRIGGER_DETAILS_MS, () => detailsRef.current, () => true);

      setIsPlaying(true);
    },
    [activeScenes, clearAllTimers, reducedMotion]
  );

  // Pause the presentation
  const pausePresentation = useCallback(() => {
    clearAllTimers();
    pausedAtRef.current = Date.now() - startTimeRef.current;
    setIsPlaying(false);
  }, [clearAllTimers]);

  // Resume the presentation
  const resumePresentation = useCallback(() => {
    startPresentation(pausedAtRef.current);
  }, [startPresentation]);

  // Toggle play/pause. The "restart from completion" branch mirrors
  // handleReplay's scroll reset so the second playback feels like a fresh one.
  const togglePlayPause = useCallback(() => {
    if (isComplete) {
      programmaticUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
      window.scrollTo({ top: 0, behavior: "auto" });
      userScrolledRef.current = false;
      firedTriggersRef.current.clear();
      setRevealedScenes(new Set());
      setProgress(0);
      pausedAtRef.current = 0;
      startPresentation(0);
    } else if (isPlaying) {
      pausePresentation();
    } else {
      resumePresentation();
    }
  }, [isComplete, isPlaying, pausePresentation, resumePresentation, startPresentation]);

  // Skip to end — instant jump to the details section so the RSVP is
  // immediately visible. Marking both triggers as fired prevents stale
  // pending scroll timers from firing afterwards.
  const skipToEnd = useCallback(() => {
    clearAllTimers();
    setRevealedScenes(new Set(activeScenes));
    setProgress(100);
    setIsPlaying(false);
    firedTriggersRef.current.add("date");
    firedTriggersRef.current.add("details");
    programmaticUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
    detailsRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [activeScenes, clearAllTimers]);

  // Replay — reset scroll position and re-arm both triggers. Clearing
  // userScrolledRef is intentional: a replay is a fresh playback, so the
  // user's prior scroll choice from the previous run shouldn't disarm it.
  const handleReplay = useCallback(() => {
    if (reducedMotion) return;

    programmaticUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
    window.scrollTo({ top: 0, behavior: "auto" });
    userScrolledRef.current = false;
    firedTriggersRef.current.clear();
    setRevealedScenes(new Set());
    setProgress(0);
    pausedAtRef.current = 0;
    startPresentation(0);
  }, [reducedMotion, startPresentation]);

  // Auto-start on mount
  useEffect(() => {
    if (autoPlay && !reducedMotion && initialState !== "open") {
      // Small delay to ensure component is fully mounted
      const startTimer = setTimeout(() => {
        startPresentation(0);
      }, 500);

      return () => clearTimeout(startTimer);
    }
  }, []); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Distinguish user-initiated scrolls from our programmatic one. Anything
  // that arrives outside the programmatic window latches userScrolledRef,
  // which permanently disarms the auto-scroll for this playback.
  useEffect(() => {
    if (reducedMotion) return;
    const onScroll = () => {
      if (Date.now() < programmaticUntilRef.current) return;
      userScrolledRef.current = true;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion]);

  // Format date for display
  const formattedDate = formatEventDateLong(data.eventDate, data.timezone);

  const hasCeremonyReception = !!(data.ceremonyDate || data.receptionDate);

  const isSceneVisible = (scene: SceneKey) => revealedScenes.has(scene);

  return (
    <div
      className={cn(
        styles.root,
        reducedMotion && styles.reducedMotion,
        className
      )}
    >
      {/* Progress bar */}
      {showControls && !reducedMotion && (
        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}

      {/* Three sections wrapped in a merge container. On desktop, .actMerge
          collapses announcement + date into a single 100dvh viewport so the
          layout reads as 2 acts. On mobile, .actMerge becomes display:contents
          so the three sections flow as three independent 100dvh viewports —
          the natural fit when scene content doesn't compress to one screen. */}
      <div className={styles.actMerge}>
        {/* Section 1 — Announcement (greeting → invite). */}
        <section
          ref={announcementRef}
          className={cn(styles.act, styles.actAnnouncement)}
          data-act="announcement"
          aria-label="Invitation announcement"
        >
          {/* Scene: Greeting */}
        {hasGreeting && (
          <div
            className={cn(
              styles.scene,
              styles.greetingScene,
              isSceneVisible("greeting") && styles.visible
            )}
            aria-hidden={!isSceneVisible("greeting")}
          >
            <p className={styles.greeting}>
              {data.salutation || "Dear"}{" "}
              {truncateWithEllipsis(
                data.inviteeName!,
                CONTENT_LIMITS.inviteeDisplayName.max
              )}
            </p>
          </div>
        )}

        {/* Scene: Couple Names */}
        <div
          className={cn(
            styles.scene,
            styles.namesScene,
            isSceneVisible("names") && styles.visible
          )}
          aria-hidden={!isSceneVisible("names")}
        >
          {data.headerText && (
            <p className={styles.headerText}>
              {truncateWithEllipsis(data.headerText, CONTENT_LIMITS.headerText.max)}
            </p>
          )}
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
        </div>

        {/* Scene: Invite Text */}
        <div
          className={cn(
            styles.scene,
            styles.inviteScene,
            isSceneVisible("invite") && styles.visible
          )}
          aria-hidden={!isSceneVisible("invite")}
        >
          <p className={styles.inviteText}>
            {data.eventTypeText
              ? truncateWithEllipsis(data.eventTypeText, CONTENT_LIMITS.eventTypeText.max)
              : "Invite you to celebrate"}
          </p>
          <div className={styles.divider} aria-hidden="true" />
        </div>
        </section>

        {/* Section 2 — Date. Mobile gives this its own viewport because the
            ceremony+reception variant is dense; desktop merges it into the
            announcement viewport via .actMerge. */}
        <section
          ref={dateRef}
          className={cn(styles.act, styles.actDate)}
          data-act="date"
          aria-label="Date"
          tabIndex={-1}
        >
          {/* Scene: Date */}
          <div
            className={cn(
              styles.scene,
              styles.dateScene,
              isSceneVisible("date") && styles.visible
            )}
            aria-hidden={!isSceneVisible("date")}
          >
          {hasCeremonyReception ? (
            <>
              {data.ceremonyDate && (
                <>
                  <p className={styles.sceneLabel}>Ceremony</p>
                  <p className={styles.dateValue}>{data.ceremonyDate}</p>
                  <p className={styles.timeValue}>{data.ceremonyTime || data.eventTime}</p>
                  {data.ceremonyVenue && <p className={styles.timeValue}>{data.ceremonyVenue}</p>}
                </>
              )}
              {data.receptionDate && (
                <>
                  <p className={styles.sceneLabel}>Reception</p>
                  <p className={styles.dateValue}>{data.receptionDate}</p>
                  {data.receptionTime && <p className={styles.timeValue}>{data.receptionTime}</p>}
                  {data.receptionVenue && <p className={styles.timeValue}>{data.receptionVenue}</p>}
                </>
              )}
            </>
          ) : (
            <>
              <p className={styles.dateValue}>{formattedDate}</p>
              <p className={styles.timeValue}>{data.eventTime}</p>
            </>
          )}
          </div>
        </section>
      </div>

      {/* Section 3 — Details (venue → RSVP). Always its own viewport. */}
      <section
        ref={detailsRef}
        className={cn(styles.act, styles.actDetails)}
        data-act="details"
        aria-label="Event details and RSVP"
        tabIndex={-1}
      >
        {/* Scene: Venue */}
        <div
          className={cn(
            styles.scene,
            styles.venueScene,
            isSceneVisible("venue") && styles.visible
          )}
          aria-hidden={!isSceneVisible("venue")}
        >
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
            <p className={styles.dressCode}>Attire: {data.dressCode}</p>
          )}
        </div>

        {/* Scene: Custom Message */}
        {hasMessage && (
          <div
            className={cn(
              styles.scene,
              styles.messageScene,
              isSceneVisible("message") && styles.visible
            )}
            aria-hidden={!isSceneVisible("message")}
          >
            <p className={styles.customMessage}>
              {truncateWithEllipsis(
                data.customMessage!,
                CONTENT_LIMITS.customMessage.max
              )}
            </p>
          </div>
        )}

        {/* Scene: RSVP */}
        <div
          className={cn(
            styles.scene,
            styles.rsvpScene,
            isSceneVisible("rsvp") && styles.visible
          )}
          aria-hidden={!isSceneVisible("rsvp")}
        >
          <a href={data.rsvpUrl} className={styles.rsvpButton}>
            RSVP
          </a>
        </div>
      </section>

      {/* Playback controls */}
      {showControls && !reducedMotion && (
        <div className={styles.controls}>
          {!isComplete && (
            <>
              <button
                type="button"
                className={styles.controlButton}
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <PauseIcon className={styles.controlIcon} />
                ) : (
                  <PlayIcon className={styles.controlIcon} />
                )}
              </button>
              <button
                type="button"
                className={styles.skipButton}
                onClick={skipToEnd}
                aria-label="Skip to end"
              >
                Skip
              </button>
            </>
          )}
        </div>
      )}

      {/* Replay button */}
      {showReplay && !reducedMotion && (
        <div className={cn(styles.replayContainer, isComplete && styles.visible)}>
          <ReplayButton onClick={handleReplay} />
        </div>
      )}
    </div>
  );
}

// Simple SVG icons
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}
