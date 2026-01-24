"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useEventTemporal,
  type EventTemporalState,
  type EventPhase,
} from "@/hooks/use-event-temporal";

/**
 * Temporal context value
 */
type TemporalContextValue = EventTemporalState & {
  /** Whether temporal data is available */
  isTemporalEnabled: boolean;
  /** Get phase-specific content */
  getPhaseContent: <T>(content: Partial<Record<EventPhase, T>>, fallback: T) => T;
  /** Check if we should show countdown */
  shouldShowCountdown: boolean;
  /** Check if we should show "happening now" indicator */
  shouldShowLive: boolean;
  /** Check if we should show post-event content */
  shouldShowPostEvent: boolean;
  /** Check if RSVP should be urgent */
  isRsvpUrgent: boolean;
  /** Suggested hero overlay intensity (0-1) based on phase */
  heroOverlayIntensity: number;
};

const TemporalContext = createContext<TemporalContextValue | null>(null);

type TemporalProviderProps = {
  children: ReactNode;
  /** Event start date/time */
  startAt: string | Date | null | undefined;
  /** Event end date/time */
  endAt?: string | Date | null;
  /** Event timezone (for display purposes) */
  timezone?: string;
  /** Update interval in ms (default: 60000 = 1 minute) */
  updateInterval?: number;
};

/**
 * Provider for temporal context within a template
 *
 * Wraps template content to provide time-aware state to all components.
 * Enables components to adapt based on whether the event is upcoming,
 * imminent, happening now, or ended.
 *
 * @example
 * ```tsx
 * <TemporalProvider startAt={event.startAt} endAt={event.endAt}>
 *   <HeroSection />
 *   <DetailsSection />
 * </TemporalProvider>
 * ```
 */
export function TemporalProvider({
  children,
  startAt,
  endAt,
  timezone,
  updateInterval = 60000,
}: TemporalProviderProps) {
  // Get base temporal state from hook
  const temporalState = useEventTemporal({
    startAt,
    endAt,
    updateInterval,
    enableLiveUpdates: true,
  });

  // Compute derived values
  const value = useMemo((): TemporalContextValue => {
    const { phase, daysUntil, hasValidDates, isFuture, isPast, isOngoing } = temporalState;

    // Helper to get phase-specific content
    const getPhaseContent = <T,>(
      content: Partial<Record<EventPhase, T>>,
      fallback: T
    ): T => {
      return content[phase] ?? fallback;
    };

    // Determine what UI elements to show
    const shouldShowCountdown = hasValidDates && isFuture && phase !== "unknown";
    const shouldShowLive = isOngoing;
    const shouldShowPostEvent = isPast && phase === "ended";

    // RSVP is urgent if event is within 3 days
    const isRsvpUrgent = hasValidDates && isFuture && daysUntil <= 3;

    // Hero overlay intensity - darker as event approaches/is live
    let heroOverlayIntensity = 0.3; // default
    if (phase === "upcoming") heroOverlayIntensity = 0.25;
    if (phase === "imminent") heroOverlayIntensity = 0.3;
    if (phase === "today") heroOverlayIntensity = 0.35;
    if (phase === "ongoing") heroOverlayIntensity = 0.4;
    if (phase === "ended") heroOverlayIntensity = 0.45;

    return {
      ...temporalState,
      isTemporalEnabled: hasValidDates,
      getPhaseContent,
      shouldShowCountdown,
      shouldShowLive,
      shouldShowPostEvent,
      isRsvpUrgent,
      heroOverlayIntensity,
    };
  }, [temporalState]);

  return (
    <TemporalContext.Provider value={value}>
      {children}
    </TemporalContext.Provider>
  );
}

/**
 * Hook to access temporal context
 */
export function useTemporal(): TemporalContextValue {
  const context = useContext(TemporalContext);

  // Return default values if no provider (graceful fallback)
  if (!context) {
    return {
      phase: "unknown",
      daysUntil: 0,
      hoursUntil: 0,
      timeRemaining: null,
      isToday: false,
      isFuture: true,
      isPast: false,
      isOngoing: false,
      daysSinceEnded: 0,
      countdownText: "",
      hasValidDates: false,
      isTemporalEnabled: false,
      getPhaseContent: <T,>(_content: Partial<Record<EventPhase, T>>, fallback: T): T => fallback,
      shouldShowCountdown: false,
      shouldShowLive: false,
      shouldShowPostEvent: false,
      isRsvpUrgent: false,
      heroOverlayIntensity: 0.3,
    };
  }

  return context;
}

/**
 * Hook to check if we're inside a TemporalProvider
 */
export function useHasTemporal(): boolean {
  const context = useContext(TemporalContext);
  return context !== null;
}
