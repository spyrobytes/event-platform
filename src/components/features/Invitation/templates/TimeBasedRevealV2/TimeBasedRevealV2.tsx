"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
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

// Fire the auto-scroll 800ms before the venue scene reveals, so the smooth
// scroll has time to settle before Act 2 content starts fading in.
const SCROLL_TRIGGER_MS = SCENE_TIMINGS.venue.delay - 800;

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

  // Refs for two-act autoscroll
  const act1Ref = useRef<HTMLElement>(null);
  const act2Ref = useRef<HTMLElement>(null);
  /** True once any user-initiated scroll has been observed this playback.
   *  Latches the auto-scroll OFF — we never yank a user who's chosen to scroll. */
  const userScrolledRef = useRef(false);
  /** True once the auto-scroll has fired (or been pre-empted by skip).
   *  Prevents a second fire if startPresentation re-runs (e.g. resume after pause). */
  const autoScrollFiredRef = useRef(false);
  /** Timestamp until which incoming scroll events should be attributed to our
   *  programmatic scroll, not a user gesture. Set right before scrollIntoView. */
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

      // Schedule the one-shot Act 1 → Act 2 autoscroll. The trigger is
      // re-armed each time startPresentation runs (e.g. on resume), but
      // autoScrollFiredRef ensures it can only execute once per playback.
      const scrollDelay = SCROLL_TRIGGER_MS - elapsedTime;
      if (scrollDelay > 0) {
        const scrollTimer = setTimeout(() => {
          if (autoScrollFiredRef.current) return;
          if (userScrolledRef.current) return;
          const target = act2Ref.current;
          if (!target) return;
          // If the user has already scrolled Act 2 into roughly half the
          // viewport, don't fight them by snapping back to the top of it.
          const top = target.getBoundingClientRect().top;
          if (top < window.innerHeight * 0.5) return;

          autoScrollFiredRef.current = true;
          programmaticUntilRef.current =
            Date.now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
          target.scrollIntoView({ behavior: "smooth", block: "start" });

          // Move keyboard/SR focus into Act 2 once the scroll likely
          // settles, so non-sighted users land on the right content.
          const focusTimer = setTimeout(() => {
            target.focus({ preventScroll: true });
          }, FOCUS_AFTER_SCROLL_MS);
          timersRef.current.push(focusTimer);
        }, scrollDelay);
        timersRef.current.push(scrollTimer);
      }

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
      autoScrollFiredRef.current = false;
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

  // Skip to end — instant jump to Act 2 so the RSVP is immediately visible.
  // Marking autoScrollFiredRef prevents a stale pending scroll timer from
  // firing afterwards if the user changes their mind and replays.
  const skipToEnd = useCallback(() => {
    clearAllTimers();
    setRevealedScenes(new Set(activeScenes));
    setProgress(100);
    setIsPlaying(false);
    autoScrollFiredRef.current = true;
    programmaticUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
    act2Ref.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [activeScenes, clearAllTimers]);

  // Replay — reset scroll position and re-arm the auto-scroll. clearing
  // userScrolledRef is intentional: a replay is a fresh playback, so the
  // user's prior scroll choice from the previous run shouldn't disarm it.
  const handleReplay = useCallback(() => {
    if (reducedMotion) return;

    programmaticUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_WINDOW_MS;
    window.scrollTo({ top: 0, behavior: "auto" });
    userScrolledRef.current = false;
    autoScrollFiredRef.current = false;
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
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: data.timezone,
  }).format(data.eventDate);

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

      {/* Act 1 — Announcement (greeting → date). Carries the "who, what, when"
          beat; closes on the date which sets up the venue reveal in Act 2. */}
      <section
        ref={act1Ref}
        className={styles.act}
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

      {/* Act 2 — Details (venue → RSVP). tabIndex=-1 lets us move keyboard/SR
          focus here when the autoscroll lands, so non-sighted users land on
          the right content rather than still announcing Act 1. */}
      <section
        ref={act2Ref}
        className={styles.act}
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
