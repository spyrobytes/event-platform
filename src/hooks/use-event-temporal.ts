"use client";

import { useState, useEffect, useMemo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { parseSchedule } from "@/lib/schedule-read";
import { formatEventTime } from "@/lib/utils";

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
 * A typed Event.schedule entry resolved to instants (canonical-schedule
 * plan §3.6). Segment math is timezone-free — the venue timezone is used
 * only for the precomputed display time.
 */
export type ScheduleSegment = {
  id: string;
  label: string;
  startMs: number;
  /** entry.endAt → next entry's start → start + ASSUMED_EVENT_DURATION_MS */
  endMs: number;
  /**
   * Which rung of the endMs ladder fired: "explicit" (entry.endAt),
   * "chained" (next entry's start — an organizer-stated boundary too), or
   * "assumed" (the fallback duration). Trust signal for consumers: the
   * elapsed counter renders only on non-assumed segments — a precise
   * counter on an assumed window reads as broken long after the real end.
   * A chain longer than ASSUMED_EVENT_DURATION_MS is classified "assumed"
   * even though endMs still chains: a reception "running until" tomorrow's
   * brunch is a schedule gap, not an organizer-stated 13-hour moment, and
   * must not earn an all-night "· 11 hr" stopwatch.
   */
  endSource: "explicit" | "chained" | "assumed";
  /** Start time in the venue timezone, e.g. "4:00 PM" — for "Next: …" copy.
   *  On `nextSegment`, gains an "Aug 23 · " prefix when the segment falls on
   *  a different venue calendar day than now (same "MMM d" convention as the
   *  page schedule's flat lists). */
  startTimeDisplay: string;
  /** Venue calendar day of the start, e.g. "Aug 23" */
  startDayDisplay: string;
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
  /** Milliseconds until event starts (negative once started) */
  msUntilStart: number;
  /** Granular time remaining until event starts */
  timeRemaining: TimeRemaining | null;
  /** Whether the event is happening today on the venue's calendar */
  isToday: boolean;
  /** Whether the event has not yet started */
  isFuture: boolean;
  /** Whether the event has ended */
  isPast: boolean;
  /** Whether the event is currently happening */
  isOngoing: boolean;
  /** Venue-calendar days since the event ended (0 if not ended) */
  daysSinceEnded: number;
  /** Formatted countdown string (e.g., "3 days, 4 hours") */
  countdownText: string;
  /** Whether we have valid date data */
  hasValidDates: boolean;
  /** Typed schedule entries as instant segments (empty without a schedule) */
  segments: ScheduleSegment[];
  /** Segment containing `now`, if any ("Ceremony underway") */
  currentSegment: ScheduleSegment | null;
  /** First segment starting after `now`, if any ("Next: Reception · 5 PM") */
  nextSegment: ScheduleSegment | null;
  /**
   * Milliseconds since the current segment started — the live pill's
   * "· 12 min" elapsed counter. Null when no segment is underway OR the
   * segment's end is assumption-derived (endSource "assumed"): the counter
   * implies a confidence in the window that an assumed end doesn't have.
   */
  currentSegmentElapsedMs: number | null;
};

type UseEventTemporalOptions = {
  /** Event start date/time */
  startAt: Date | string | null | undefined;
  /** Event end date/time (defaults to startAt if not provided) */
  endAt?: Date | string | null;
  /** Venue IANA timezone — calendar-day phases ("today", "yesterday") follow
   *  the venue's wall clock. Omit to fall back to the viewer's calendar. */
  timezone?: string;
  /** Raw Event.schedule Json — enables segment-aware state (plan §3.6).
   *  Absent/empty/malformed keeps whole-span behavior byte-identical. */
  schedule?: unknown;
  /** Fixed update interval in ms. Omit for adaptive cadence (see getNextTickDelay). */
  updateInterval?: number;
  /** Whether to enable live countdown updates */
  enableLiveUpdates?: boolean;
};

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Window after the start instant during which the event counts as "just
 * started" — keeps second-ticks running across the boundary so the
 * countdown → live swap (and the confetti burst) land promptly.
 */
export const JUST_STARTED_WINDOW_MS = 4 * SECOND;

/**
 * Assumed duration for events without an explicit end, used for phase
 * purposes only (nothing is stored). Without it the ongoing phase is
 * zero-length: "Happening Now" never shows and the page thanks guests the
 * instant the celebration starts. Six hours covers a typical reception.
 */
export const ASSUMED_EVENT_DURATION_MS = 6 * HOUR;

/**
 * Adaptive tick delay: the display only changes when its leading unit flips,
 * so schedule each tick just past the next flip boundary instead of polling.
 *
 * - days on the board (> 24h out): tick on remaining-hour boundaries
 * - hours/minutes on the board (1 min – 24h): tick on minute boundaries
 * - final minute: tick every second
 * - just started: keep second-ticks through JUST_STARTED_WINDOW_MS, then
 *   relax to minutes until the event ends
 */
export function getNextTickDelay(msUntilStart: number): number {
  if (msUntilStart <= 0) {
    return msUntilStart > -JUST_STARTED_WINDOW_MS ? SECOND : MINUTE;
  }
  const unit = msUntilStart > DAY ? HOUR : msUntilStart > MINUTE ? MINUTE : SECOND;
  const untilBoundary = msUntilStart % unit || unit;
  // Land 50ms past the boundary so the recompute sees the flipped value;
  // floor at 250ms so clock jitter can't produce a hot loop.
  return Math.max(untilBoundary + 50, 250);
}

/**
 * Resolves the raw Event.schedule Json into ordered instant segments.
 * An entry without endAt runs until the next entry starts (no artificial
 * gap); the last entry falls back to the event-level assumed duration.
 * Returns [] for absent/empty/malformed schedules so callers keep the
 * whole-span behavior unchanged.
 */
export function deriveScheduleSegments(
  schedule: unknown,
  timezone?: string
): ScheduleSegment[] {
  const entries = parseSchedule(schedule);
  if (!entries) return [];

  // Compare as instants, never as ISO strings (mixed precision misorders).
  const sorted = [...entries].sort(
    (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)
  );

  // Production always passes the venue timezone (TemporalData.timezone is
  // required). The UTC fallback is for tz-less direct hook consumers and is
  // deliberately deterministic — unlike the calendar-day helpers below, a
  // display string can't silently follow the viewer's clock without
  // contradicting the venue-timezone product rule.
  const displayTz = timezone ?? "UTC";

  return sorted.map((entry, i): ScheduleSegment => {
    const startMs = Date.parse(entry.startAt);
    const next = sorted[i + 1];
    const nextStartMs = next ? Date.parse(next.startAt) : null;
    const [endMs, endSource]: [number, ScheduleSegment["endSource"]] =
      entry.endAt
        ? [Date.parse(entry.endAt), "explicit"]
        : nextStartMs !== null
          ? [
              nextStartMs,
              // Overlong chains are a schedule gap wearing a chain's clothes
              // — keep the endMs (phase behavior unchanged) but don't vouch
              // for the window (see endSource docs).
              nextStartMs - startMs <= ASSUMED_EVENT_DURATION_MS
                ? "chained"
                : "assumed",
            ]
          : [startMs + ASSUMED_EVENT_DURATION_MS, "assumed"];
    return {
      id: entry.id,
      label: entry.label,
      startMs,
      endMs,
      endSource,
      startTimeDisplay: formatEventTime(entry.startAt, displayTz),
      startDayDisplay: formatInTimeZone(entry.startAt, displayTz, "MMM d"),
    };
  });
}

/**
 * Latest-started segment containing `nowMs`, or null. Overlaps resolve to
 * the most recently started: what began last is what's happening — a
 * typo-widened earlier endAt must not keep claiming the pill (and its
 * elapsed counter) after the next moment has begun. Relies on segments
 * being start-sorted (deriveScheduleSegments guarantees it).
 */
export function findCurrentSegment(
  segments: ScheduleSegment[],
  nowMs: number
): ScheduleSegment | null {
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    if (s.startMs <= nowMs && nowMs < s.endMs) return s;
  }
  return null;
}

/** Whether a segment's window is trustworthy enough for the elapsed counter. */
function isCounterEligible(segment: ScheduleSegment): boolean {
  return segment.endSource !== "assumed";
}

/**
 * ms until the underway counter-eligible segment's next elapsed-minute
 * boundary (Infinity when no eligible segment is underway). Boundaries are
 * anchored to the segment's start so the "· N min" counter flips exactly in
 * wall-clock sync, not up to 59s late on a drifting minute tick.
 */
export function msToNextElapsedMinuteBoundary(
  segments: ScheduleSegment[],
  nowMs: number
): number {
  const seg = findCurrentSegment(segments, nowMs);
  if (!seg || !isCounterEligible(seg)) return Infinity;
  return MINUTE - ((nowMs - seg.startMs) % MINUTE);
}

/**
 * "12 min" / "1 hr 25 min" elapsed suffix for the live pill. Null under one
 * minute — the pill's arrival is its own signal, and "0 min" reads oddly.
 * Minute granularity by design: a seconds counter would turn the calm pill
 * into a stopwatch.
 *
 * Deliberately compact ("1 hr 25 min") vs formatCountdownText's prose
 * ("1 hour, 25 min"): the pill is a width-constrained badge next to a
 * pulsing dot, not a sentence. If a third duration surface ever appears,
 * fold both into one formatter with a compact flag.
 */
export function formatElapsedMinutes(elapsedMs: number): string | null {
  const totalMinutes = Math.floor(elapsedMs / MINUTE);
  if (totalMinutes < 1) return null;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** ms until the next segment start/end boundary after `nowMs` (Infinity if none). */
function msToNextSegmentBoundary(
  segments: ScheduleSegment[],
  nowMs: number
): number {
  let min = Infinity;
  for (const seg of segments) {
    for (const boundary of [seg.startMs, seg.endMs]) {
      const delta = boundary - nowMs;
      if (delta > 0 && delta < min) min = delta;
    }
  }
  return min;
}

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
 * Calendar Y/M/D of an instant, on the venue's wall clock when an IANA
 * timezone is given (the product rule: temporal phases are viewed from the
 * venue's perspective, matching formatEventDate in lib/utils). Falls back to
 * the viewer's local calendar when the timezone is missing or invalid.
 */
function getCalendarParts(
  date: Date,
  timeZone?: string
): { y: number; m: number; d: number } {
  if (timeZone) {
    try {
      // en-CA renders as "YYYY-MM-DD"
      const formatted = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
      const [y, m, d] = formatted.split("-").map(Number);
      return { y, m, d };
    } catch {
      // Unknown IANA id — fall through to the viewer's local calendar
    }
  }
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

/**
 * Whole calendar days from `from` to `to` in the given timezone (negative
 * when `to` is on an earlier calendar day). DST-safe: the diff is taken
 * between the UTC-anchored calendar dates, not between instants.
 */
function calendarDaysBetween(from: Date, to: Date, timeZone?: string): number {
  const a = getCalendarParts(from, timeZone);
  const b = getCalendarParts(to, timeZone);
  return Math.round(
    (Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY
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
  now: Date,
  timezone?: string,
  segments: ScheduleSegment[] = []
): EventTemporalState {
  // No valid start date - return unknown state
  if (!startAt) {
    return {
      phase: "unknown",
      daysUntil: 0,
      hoursUntil: 0,
      msUntilStart: 0,
      timeRemaining: null,
      isToday: false,
      isFuture: false,
      isPast: false,
      isOngoing: false,
      daysSinceEnded: 0,
      countdownText: "",
      hasValidDates: false,
      segments: [],
      currentSegment: null,
      nextSegment: null,
      currentSegmentElapsedMs: null,
    };
  }

  // effectiveEndAt ladder (plan §3.6): explicit Event.endAt → last schedule
  // segment's end (which itself embeds "entry endAt or start + assumption")
  // → startAt + ASSUMED_EVENT_DURATION_MS. Guarded to never precede startAt
  // so malformed entries can't make the event end before it begins.
  const lastSegmentEndMs = segments.length
    ? segments[segments.length - 1].endMs
    : null;
  const effectiveEndAt =
    endAt ??
    (lastSegmentEndMs !== null
      ? new Date(Math.max(lastSegmentEndMs, startAt.getTime()))
      : new Date(startAt.getTime() + ASSUMED_EVENT_DURATION_MS));

  const msUntilStart = startAt.getTime() - now.getTime();
  const msUntilEnd = effectiveEndAt.getTime() - now.getTime();

  const daysUntil = msUntilStart / (1000 * 60 * 60 * 24);
  const hoursUntil = msUntilStart / (1000 * 60 * 60);

  // Calendar-day determinations follow the venue's wall clock: "Today" means
  // today at the venue, and "yesterday" in post-event copy means the venue's
  // previous calendar day — not the viewer's.
  const isToday = calendarDaysBetween(now, startAt, timezone) === 0;
  const isFuture = msUntilStart > 0;
  const isPast = msUntilEnd < 0;
  const isOngoing = !isFuture && !isPast;

  const daysSinceEnded = isPast
    ? Math.max(0, calendarDaysBetween(effectiveEndAt, now, timezone))
    : 0;

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

  // Segment lookup — pure instant math. Overlapping segments resolve to the
  // most recently started (see findCurrentSegment); a gap has no
  // currentSegment.
  const nowMs = now.getTime();
  const currentSegment = findCurrentSegment(segments, nowMs);
  // Elapsed counter only where the window is organizer-stated (explicit
  // endAt or a tight chain to the next entry's start) — see endSource docs.
  const currentSegmentElapsedMs =
    currentSegment && isCounterEligible(currentSegment)
      ? nowMs - currentSegment.startMs
      : null;
  let nextSegment = segments.find((s) => s.startMs > nowMs) ?? null;
  // A next-up segment on another venue day carries its day in the display
  // ("Next: Brunch · Aug 23 · 11:00 AM") — a bare time would be ambiguous
  // across midnight.
  if (
    nextSegment &&
    calendarDaysBetween(now, new Date(nextSegment.startMs), timezone) !== 0
  ) {
    nextSegment = {
      ...nextSegment,
      startTimeDisplay: `${nextSegment.startDayDisplay} · ${nextSegment.startTimeDisplay}`,
    };
  }

  return {
    phase,
    daysUntil: Math.ceil(daysUntil),
    hoursUntil: Math.ceil(hoursUntil),
    msUntilStart,
    timeRemaining,
    isToday,
    isFuture,
    isPast,
    isOngoing,
    daysSinceEnded,
    countdownText,
    hasValidDates: true,
    segments,
    currentSegment,
    nextSegment,
    currentSegmentElapsedMs,
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
  timezone,
  schedule,
  updateInterval,
  enableLiveUpdates = true,
}: UseEventTemporalOptions): EventTemporalState {
  const parsedStartAt = useMemo(() => parseDate(startAt), [startAt]);
  const parsedEndAt = useMemo(() => parseDate(endAt), [endAt]);
  const segments = useMemo(
    () => deriveScheduleSegments(schedule, timezone),
    [schedule, timezone]
  );

  const [now, setNow] = useState(() => new Date());

  // Live updates: fixed interval when updateInterval is set, otherwise a
  // self-scheduling timeout aligned to the next display-flip boundary.
  useEffect(() => {
    if (!enableLiveUpdates || !parsedStartAt) return;

    const startMs = parsedStartAt.getTime();
    // Mirror calculateTemporalState's effectiveEndAt ladder so the tick
    // cadence agrees with the phase (minute ticks while "ongoing", hourly
    // after): explicit endAt → last segment end → assumed duration.
    const lastSegmentEndMs = segments.length
      ? Math.max(segments[segments.length - 1].endMs, startMs)
      : null;
    const endMs =
      parsedEndAt?.getTime() ??
      lastSegmentEndMs ??
      startMs + ASSUMED_EVENT_DURATION_MS;

    let timer: ReturnType<typeof setTimeout>;

    function scheduleTick() {
      let delay: number;
      if (updateInterval !== undefined) {
        delay = updateInterval;
      } else {
        const nowMs = Date.now();
        if (endMs - nowMs < -JUST_STARTED_WINDOW_MS) {
          delay = HOUR; // ended: only daysSinceEnded can change
        } else {
          delay = getNextTickDelay(startMs - nowMs);
          // Segment transitions (underway ↔ gap ↔ next-up) and the elapsed
          // counter's minute flips must land on time too — tick just past
          // the nearest of the two boundary kinds when it comes sooner than
          // the countdown boundary. (Elapsed-minute boundaries are anchored
          // to the underway segment's start: same frequency as the existing
          // post-start minute ticks, corrected phase.)
          const boundaryDelta = Math.min(
            msToNextSegmentBoundary(segments, nowMs),
            msToNextElapsedMinuteBoundary(segments, nowMs)
          );
          if (boundaryDelta !== Infinity) {
            delay = Math.max(Math.min(delay, boundaryDelta + 50), 250);
          }
        }
      }
      timer = setTimeout(tick, delay);
    }

    function tick() {
      setNow(new Date());
      scheduleTick();
    }

    scheduleTick();

    // Background tabs throttle timers; on return, snap to the correct value
    // immediately instead of waiting out a stale long tick.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [parsedStartAt, parsedEndAt, segments, updateInterval, enableLiveUpdates]);

  // Calculate temporal state
  const state = useMemo(
    () => calculateTemporalState(parsedStartAt, parsedEndAt, now, timezone, segments),
    [parsedStartAt, parsedEndAt, now, timezone, segments]
  );

  return state;
}

/**
 * Static version for server-side rendering
 * Does not set up intervals - just calculates once.
 * `opts.now` exists for deterministic tests; production callers omit it.
 */
export function getEventTemporalState(
  startAt: Date | string | null | undefined,
  endAt?: Date | string | null,
  opts?: { timezone?: string; now?: Date; schedule?: unknown }
): EventTemporalState {
  const parsedStartAt = parseDate(startAt);
  const parsedEndAt = parseDate(endAt);
  return calculateTemporalState(
    parsedStartAt,
    parsedEndAt,
    opts?.now ?? new Date(),
    opts?.timezone,
    deriveScheduleSegments(opts?.schedule, opts?.timezone)
  );
}
