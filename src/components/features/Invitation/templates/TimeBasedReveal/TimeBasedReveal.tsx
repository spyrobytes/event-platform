"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion, type InvitationState } from "@/hooks";
import { ReplayButton } from "../../ReplayButton";
import { truncateWithEllipsis, CONTENT_LIMITS } from "@/schemas/invitation";
import type { InvitationData } from "@/schemas/invitation";
import styles from "./TimeBasedReveal.module.css";

type TimeBasedRevealProps = {
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

/**
 * TimeBasedReveal creates a dramatic auto-playing presentation.
 *
 * Content reveals automatically on a timeline, creating a cinematic
 * experience as the invitation unfolds scene by scene.
 *
 * @example
 * ```tsx
 * <TimeBasedReveal
 *   data={invitationData}
 *   onStateChange={(s) => trackAnalytics(s)}
 * />
 * ```
 */
export function TimeBasedReveal({
  data,
  autoPlay = true,
  initialState,
  onStateChange,
  showReplay = true,
  showControls = true,
  className,
}: TimeBasedRevealProps) {
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

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isComplete) {
      // Restart from beginning
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

  // Skip to end
  const skipToEnd = useCallback(() => {
    clearAllTimers();
    setRevealedScenes(new Set(activeScenes));
    setProgress(100);
    setIsPlaying(false);
  }, [activeScenes, clearAllTimers]);

  // Replay from start
  const handleReplay = useCallback(() => {
    if (reducedMotion) return;

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

  // Format date for display
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: data.timezone,
  }).format(data.eventDate);

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

      {/* Main content area */}
      <div className={styles.stage}>
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
          <h1 className={styles.coupleNames}>
            {truncateWithEllipsis(
              data.coupleNames,
              CONTENT_LIMITS.coupleDisplayName.max
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
          <p className={styles.inviteText}>Invite you to celebrate</p>
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
          <p className={styles.dateValue}>{formattedDate}</p>
          <p className={styles.timeValue}>{data.eventTime}</p>
        </div>

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
      </div>

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
