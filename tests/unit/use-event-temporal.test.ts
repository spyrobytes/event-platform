import { describe, it, expect } from "vitest";
import {
  getEventTemporalState,
  getNextTickDelay,
  JUST_STARTED_WINDOW_MS,
  ASSUMED_EVENT_DURATION_MS,
} from "@/hooks/use-event-temporal";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Build a start date the given ms from now (test-local clock). */
function startIn(ms: number): Date {
  return new Date(Date.now() + ms);
}

describe("getEventTemporalState", () => {
  it("reports days remaining while more than a day out", () => {
    const state = getEventTemporalState(startIn(3 * DAY + 5 * HOUR));
    expect(state.phase).toBe("imminent");
    expect(state.timeRemaining?.days).toBe(3);
    expect(state.msUntilStart).toBeGreaterThan(3 * DAY);
  });

  it("day 0: timeRemaining floors to hours (the strip must not read '1 day')", () => {
    const state = getEventTemporalState(startIn(5 * HOUR + 30 * MINUTE));
    expect(state.timeRemaining?.days).toBe(0);
    expect(state.timeRemaining?.hours).toBe(5);
    expect(state.timeRemaining?.minutes).toBe(30);
    // The old bug: daysUntil is ceiled and still says 1 here — display code
    // must tier off timeRemaining instead.
    expect(state.daysUntil).toBe(1);
  });

  it("final hour: floors to minutes", () => {
    const state = getEventTemporalState(startIn(42 * MINUTE + 10 * SECOND));
    expect(state.timeRemaining?.hours).toBe(0);
    expect(state.timeRemaining?.minutes).toBe(42);
  });

  it("final minute: floors to seconds", () => {
    const state = getEventTemporalState(startIn(30 * SECOND));
    expect(state.timeRemaining?.minutes).toBe(0);
    expect(state.timeRemaining?.seconds).toBeGreaterThanOrEqual(29);
    expect(state.timeRemaining?.seconds).toBeLessThanOrEqual(30);
  });

  it("just started: ongoing with negative msUntilStart", () => {
    const state = getEventTemporalState(startIn(-2 * SECOND), startIn(2 * HOUR));
    expect(state.phase).toBe("ongoing");
    expect(state.isOngoing).toBe(true);
    expect(state.msUntilStart).toBeLessThan(0);
    expect(state.msUntilStart).toBeGreaterThanOrEqual(-JUST_STARTED_WINDOW_MS);
    expect(state.timeRemaining).toBeNull();
  });

  it("no endAt: assumed duration gives a real ongoing phase instead of ending instantly", () => {
    // Just started: ongoing (previously effectiveEndAt = startAt made this
    // "ended" the instant the celebration began).
    const justStarted = getEventTemporalState(startIn(-2 * SECOND));
    expect(justStarted.phase).toBe("ongoing");
    expect(justStarted.isOngoing).toBe(true);
    expect(justStarted.msUntilStart).toBeGreaterThanOrEqual(-JUST_STARTED_WINDOW_MS);

    // Still ongoing near the end of the assumed window...
    const lateOngoing = getEventTemporalState(
      startIn(-(ASSUMED_EVENT_DURATION_MS - MINUTE))
    );
    expect(lateOngoing.phase).toBe("ongoing");

    // ...and ended once the assumed duration has fully elapsed.
    const after = getEventTemporalState(
      startIn(-(ASSUMED_EVENT_DURATION_MS + MINUTE))
    );
    expect(after.phase).toBe("ended");
  });

  it("ended: past phase with days since ended", () => {
    const state = getEventTemporalState(startIn(-3 * DAY), startIn(-3 * DAY + 4 * HOUR));
    expect(state.phase).toBe("ended");
    expect(state.daysSinceEnded).toBe(2);
  });

  it("no start date: unknown phase", () => {
    const state = getEventTemporalState(null);
    expect(state.phase).toBe("unknown");
    expect(state.hasValidDates).toBe(false);
  });
});

describe("venue-timezone calendar days", () => {
  // 2026-01-02T00:30Z: Jan 2 in UTC/Tokyo, but Jan 1 evening in New York.
  const startAt = new Date("2026-01-02T00:30:00Z");
  // 4.5h before start: Jan 1 in UTC, Jan 1 afternoon in New York.
  const now = new Date("2026-01-01T20:00:00Z");

  it("'today' follows the venue's wall clock, not the viewer's", () => {
    // New York venue: event is Jan 1 19:30 local; at Jan 1 15:00 local it IS today.
    const ny = getEventTemporalState(startAt, null, {
      timezone: "America/New_York",
      now,
    });
    expect(ny.isToday).toBe(true);
    expect(ny.phase).toBe("today");

    // UTC venue: event is Jan 2; at Jan 1 20:00 it is NOT yet today.
    const utc = getEventTemporalState(startAt, null, { timezone: "UTC", now });
    expect(utc.isToday).toBe(false);
    expect(utc.phase).toBe("imminent");
  });

  it("daysSinceEnded counts venue calendar days, so 'yesterday' can arrive within 24h", () => {
    // Ended Jan 1 23:00 New York (= Jan 2 04:00Z); viewed Jan 2 09:00 New York.
    const endAt = new Date("2026-01-02T04:00:00Z");
    const morningAfter = new Date("2026-01-02T14:00:00Z");

    const ny = getEventTemporalState(endAt, endAt, {
      timezone: "America/New_York",
      now: morningAfter,
    });
    expect(ny.phase).toBe("ended");
    expect(ny.daysSinceEnded).toBe(1); // venue's "yesterday", though only 10h elapsed

    // Tokyo venue: ended Jan 2 13:00 local, viewed Jan 2 23:00 local — same day.
    const tokyo = getEventTemporalState(endAt, endAt, {
      timezone: "Asia/Tokyo",
      now: morningAfter,
    });
    expect(tokyo.daysSinceEnded).toBe(0);
  });

  it("invalid timezone falls back to the viewer's calendar instead of throwing", () => {
    const bad = getEventTemporalState(startAt, null, {
      timezone: "Not/AZone",
      now,
    });
    const local = getEventTemporalState(startAt, null, { now });
    expect(bad.isToday).toBe(local.isToday);
    expect(bad.phase).toBe(local.phase);
  });

  it("no timezone preserves viewer-local behavior", () => {
    const state = getEventTemporalState(startAt, null, { now });
    const sameLocalDay =
      startAt.getFullYear() === now.getFullYear() &&
      startAt.getMonth() === now.getMonth() &&
      startAt.getDate() === now.getDate();
    expect(state.isToday).toBe(sameLocalDay);
  });
});

describe("getNextTickDelay", () => {
  it("days on the board: ticks on remaining-hour boundaries (≤ 1 hour apart)", () => {
    const delay = getNextTickDelay(3 * DAY + 25 * MINUTE);
    expect(delay).toBe(25 * MINUTE + 50);
    expect(getNextTickDelay(2 * DAY)).toBeLessThanOrEqual(HOUR + 50);
  });

  it("hours on the board: ticks on minute boundaries", () => {
    const delay = getNextTickDelay(5 * HOUR + 20 * SECOND);
    expect(delay).toBe(20 * SECOND + 50);
    expect(getNextTickDelay(5 * HOUR)).toBeLessThanOrEqual(MINUTE + 50);
  });

  it("final hour: still minute cadence", () => {
    expect(getNextTickDelay(42 * MINUTE)).toBeLessThanOrEqual(MINUTE + 50);
  });

  it("final minute: second cadence", () => {
    expect(getNextTickDelay(45 * SECOND)).toBeLessThanOrEqual(SECOND + 50);
    expect(getNextTickDelay(45 * SECOND)).toBeGreaterThanOrEqual(250);
  });

  it("crossing a unit boundary lands just past it, never a full stale unit", () => {
    // 61s out: next tick must land at the 60s mark (entering seconds mode),
    // not a minute later.
    expect(getNextTickDelay(61 * SECOND)).toBe(SECOND + 50);
    // 24h + 10s out: next tick at the 24h mark (entering hours mode).
    expect(getNextTickDelay(DAY + 10 * SECOND)).toBe(10 * SECOND + 50);
  });

  it("just started: keeps second ticks through the confetti window, then relaxes", () => {
    expect(getNextTickDelay(-1 * SECOND)).toBe(SECOND);
    expect(getNextTickDelay(-(JUST_STARTED_WINDOW_MS - 1))).toBe(SECOND);
    expect(getNextTickDelay(-(JUST_STARTED_WINDOW_MS + 1))).toBe(MINUTE);
  });

  it("never returns a hot-loop delay", () => {
    expect(getNextTickDelay(1)).toBeGreaterThanOrEqual(250);
    expect(getNextTickDelay(0)).toBeGreaterThanOrEqual(SECOND);
  });
});
