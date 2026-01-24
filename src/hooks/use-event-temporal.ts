"use client";

import { useState, useEffect, useMemo } from "react";

/**
 * Event temporal phases
 * - upcoming: More than 7 days away
 * - imminent: 1-7 days away (anticipation builds)
 * - today: Event day (even if event hasn't started)
 * - ongoing: Event has started but not ended
 * - ended: Event has concluded
 */
export type EventPhase =
  | "upcoming"
  | "imminent"
  | "today"
  | "ongoing"
  | "ended"
  | "unknown";

/**
 * Granular time remaining breakdown
 */
export type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMilliseconds: number;
};

/**
 * Return type for useEventTemporal hook
 */
export type EventTemporalState = {
  /** Current phase of the event */
  phase: EventPhase;
  /** Days until event starts (negative if past) */
  daysUntil: number;
  /** Hours until event starts (negative if past) */
  hoursUntil: number;
  /** Granular time remaining until event starts */
  timeRemaining: TimeRemaining | null;
  /** Whether the event is happening today */
  isToday: boolean;
  /** Whether the event has not yet started */
  isFuture: boolean;
  /** Whether the event has ended */
  isPast: boolean;
  /** Whether the event is currently happening */
  isOngoing: boolean;
  /** Days since event ended (0 if not ended) */
  daysSinceEnded: number;
  /** Formatted countdown string (e.g., "3 days, 4 hours") */
  countdownText: string;
  /** Whether we have valid date data */
  hasValidDates: boolean;
};

type UseEventTemporalOptions = {
  /** Event start date/time */
  startAt: Date | string | null | undefined;
  /** Event end date/time (defaults to startAt if not provided) */
  endAt?: Date | string | null;
  /** Update interval in ms (default: 60000 = 1 minute) */
  updateInterval?: number;
  /** Whether to enable live countdown updates */
  enableLiveUpdates?: boolean;
};

/**
 * Parse a date value to a Date object
 */
function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Check if two dates are on the same calendar day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Calculate time remaining breakdown
 */
function calculateTimeRemaining(targetDate: Date, now: Date): TimeRemaining {
  const totalMilliseconds = targetDate.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(totalMilliseconds / 1000));
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);

  return {
    days,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60,
    totalMilliseconds: Math.max(0, totalMilliseconds),
  };
}

/**
 * Format countdown text based on time remaining
 */
function formatCountdownText(timeRemaining: TimeRemaining | null, phase: EventPhase): string {
  if (!timeRemaining || phase === "ended" || phase === "unknown") {
    return "";
  }

  if (phase === "ongoing") {
    return "Happening now";
  }

  const { days, hours, minutes } = timeRemaining;

  if (days > 0) {
    if (days === 1) {
      return hours > 0 ? `1 day, ${hours} hour${hours === 1 ? "" : "s"}` : "1 day";
    }
    return `${days} days`;
  }

  if (hours > 0) {
    if (hours === 1) {
      return minutes > 0 ? `1 hour, ${minutes} min` : "1 hour";
    }
    return `${hours} hours`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return "Starting soon";
}

/**
 * Calculate the temporal state of an event
 */
function calculateTemporalState(
  startAt: Date | null,
  endAt: Date | null,
  now: Date
): EventTemporalState {
  // No valid start date - return unknown state
  if (!startAt) {
    return {
      phase: "unknown",
      daysUntil: 0,
      hoursUntil: 0,
      timeRemaining: null,
      isToday: false,
      isFuture: false,
      isPast: false,
      isOngoing: false,
      daysSinceEnded: 0,
      countdownText: "",
      hasValidDates: false,
    };
  }

  // Use startAt as endAt if not provided
  const effectiveEndAt = endAt || startAt;

  const msUntilStart = startAt.getTime() - now.getTime();
  const msUntilEnd = effectiveEndAt.getTime() - now.getTime();
  const msSinceEnded = now.getTime() - effectiveEndAt.getTime();

  const daysUntil = msUntilStart / (1000 * 60 * 60 * 24);
  const hoursUntil = msUntilStart / (1000 * 60 * 60);
  const daysSinceEnded = Math.max(0, msSinceEnded / (1000 * 60 * 60 * 24));

  const isToday = isSameDay(startAt, now);
  const isFuture = msUntilStart > 0;
  const isPast = msUntilEnd < 0;
  const isOngoing = !isFuture && !isPast;

  // Determine phase
  let phase: EventPhase;
  if (isPast) {
    phase = "ended";
  } else if (isOngoing) {
    phase = "ongoing";
  } else if (isToday) {
    phase = "today";
  } else if (daysUntil <= 7) {
    phase = "imminent";
  } else {
    phase = "upcoming";
  }

  const timeRemaining = isFuture ? calculateTimeRemaining(startAt, now) : null;
  const countdownText = formatCountdownText(timeRemaining, phase);

  return {
    phase,
    daysUntil: Math.ceil(daysUntil),
    hoursUntil: Math.ceil(hoursUntil),
    timeRemaining,
    isToday,
    isFuture,
    isPast,
    isOngoing,
    daysSinceEnded: Math.floor(daysSinceEnded),
    countdownText,
    hasValidDates: true,
  };
}

/**
 * Hook for tracking the temporal state of an event
 *
 * Provides phase information, countdown data, and useful boolean flags
 * for rendering time-aware event pages.
 *
 * @example
 * ```tsx
 * const { phase, countdownText, isToday } = useEventTemporal({
 *   startAt: event.startAt,
 *   endAt: event.endAt,
 * });
 *
 * if (phase === "ended") {
 *   return <ThankYouMessage />;
 * }
 * ```
 */
export function useEventTemporal({
  startAt,
  endAt,
  updateInterval = 60000, // 1 minute default
  enableLiveUpdates = true,
}: UseEventTemporalOptions): EventTemporalState {
  const parsedStartAt = useMemo(() => parseDate(startAt), [startAt]);
  const parsedEndAt = useMemo(() => parseDate(endAt), [endAt]);

  const [now, setNow] = useState(() => new Date());

  // Set up interval for live updates
  useEffect(() => {
    if (!enableLiveUpdates) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval, enableLiveUpdates]);

  // Calculate temporal state
  const state = useMemo(
    () => calculateTemporalState(parsedStartAt, parsedEndAt, now),
    [parsedStartAt, parsedEndAt, now]
  );

  return state;
}

/**
 * Static version for server-side rendering
 * Does not set up intervals - just calculates once
 */
export function getEventTemporalState(
  startAt: Date | string | null | undefined,
  endAt?: Date | string | null
): EventTemporalState {
  const parsedStartAt = parseDate(startAt);
  const parsedEndAt = parseDate(endAt);
  return calculateTemporalState(parsedStartAt, parsedEndAt, new Date());
}
