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

  it("ended: past phase with venue-calendar days since ended", () => {
    // daysSinceEnded counts venue midnights crossed, so the fixture must pin
    // `now` and a timezone — deriving it from the live clock made this
    // assertion flip with the hour the suite ran (2 vs 3 midnights in 68h).
    const startAt = new Date("2026-01-08T00:00:00Z");
    const endAt = new Date("2026-01-08T04:00:00Z");
    const now = new Date("2026-01-10T12:00:00Z"); // two UTC midnights later
    const state = getEventTemporalState(startAt, endAt, { timezone: "UTC", now });
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

  it("counts calendar days correctly across a DST transition", () => {
    // US spring-forward: Sunday 2026-03-08 (23-hour day in America/New_York).
    // Ended Saturday 21:00 ET; viewed Monday 09:00 EDT — only ~59 wall hours,
    // but exactly 2 venue midnights. A duration-based count would waver here.
    const endAt = new Date("2026-03-08T02:00:00Z"); // Sat Mar 7, 21:00 EST
    const now = new Date("2026-03-09T13:00:00Z"); // Mon Mar 9, 09:00 EDT
    const state = getEventTemporalState(endAt, endAt, {
      timezone: "America/New_York",
      now,
    });
    expect(state.daysSinceEnded).toBe(2);
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

// ---------------------------------------------------------------------------
// Schedule segments (canonical-schedule plan §3.6, PR 5). Every case pins
// `now` and (where calendar-relevant) `timezone` — live-clock fixtures flip
// with the hour the suite runs (see #284's CI failure).
// ---------------------------------------------------------------------------
describe("getEventTemporalState — schedule segments", () => {
  const TZ = "America/Edmonton"; // UTC-6 in summer
  const START = "2026-08-22T16:00:00Z"; // 10:00 AM venue
  const SCHEDULE = [
    {
      id: "ceremony",
      label: "Ceremony",
      role: "ceremony",
      startAt: "2026-08-22T16:00:00.000Z",
      endAt: "2026-08-22T16:30:00.000Z",
      isAccessPassGated: false,
    },
    {
      id: "reception",
      label: "Reception",
      role: "reception",
      startAt: "2026-08-22T22:00:00.000Z", // 4:00 PM venue — 5.5h gap
      endAt: "2026-08-23T04:00:00.000Z",
      isAccessPassGated: false,
    },
  ];

  it("no schedule stays byte-identical to whole-span behavior", () => {
    const now = new Date("2026-08-22T17:00:00Z");
    const bare = getEventTemporalState(START, null, { now, timezone: TZ });
    for (const schedule of [undefined, null, [], [{ nonsense: true }]]) {
      expect(
        getEventTemporalState(START, null, { now, timezone: TZ, schedule })
      ).toEqual(bare);
    }
    expect(bare.segments).toEqual([]);
    expect(bare.currentSegment).toBeNull();
    expect(bare.nextSegment).toBeNull();
  });

  it("identifies the segment underway, with venue-tz display times", () => {
    const state = getEventTemporalState(START, null, {
      now: new Date("2026-08-22T16:10:00Z"),
      timezone: TZ,
      schedule: SCHEDULE,
    });
    expect(state.currentSegment?.label).toBe("Ceremony");
    expect(state.nextSegment?.label).toBe("Reception");
    expect(state.nextSegment?.startTimeDisplay).toBe("4:00 PM");
    expect(state.isOngoing).toBe(true);
  });

  it("a gap between segments has no currentSegment but a nextSegment", () => {
    const state = getEventTemporalState(START, null, {
      now: new Date("2026-08-22T18:00:00Z"),
      timezone: TZ,
      schedule: SCHEDULE,
    });
    expect(state.currentSegment).toBeNull();
    expect(state.nextSegment?.label).toBe("Reception");
    expect(state.isOngoing).toBe(true); // ladder keeps the event live through the gap
  });

  it("effectiveEndAt ladder: entries extend an endAt-less event past the 6h assumption", () => {
    // 27:00Z = 11h after start — the 6h assumption alone would say "ended",
    // but the reception (ends 28:00Z) keeps the event ongoing.
    const now = new Date("2026-08-23T03:00:00Z");
    const withSchedule = getEventTemporalState(START, null, {
      now,
      timezone: TZ,
      schedule: SCHEDULE,
    });
    expect(withSchedule.phase).toBe("ongoing");
    expect(withSchedule.currentSegment?.label).toBe("Reception");

    const without = getEventTemporalState(START, null, { now, timezone: TZ });
    expect(without.phase).toBe("ended");
  });

  it("explicit Event.endAt outranks the last segment's end", () => {
    const state = getEventTemporalState(START, "2026-08-22T18:00:00Z", {
      now: new Date("2026-08-22T23:00:00Z"), // mid-reception, past explicit end
      timezone: TZ,
      schedule: SCHEDULE,
    });
    expect(state.phase).toBe("ended");
  });

  it("an entry without endAt runs until the next entry; the last falls back to the assumption", () => {
    const openEnded = [
      { id: "a", label: "Welcome", startAt: "2026-08-22T16:00:00.000Z", isAccessPassGated: false },
      { id: "b", label: "Dinner", startAt: "2026-08-22T18:00:00.000Z", isAccessPassGated: false },
    ];
    const during = getEventTemporalState(START, null, {
      now: new Date("2026-08-22T17:00:00Z"), // between the two starts
      timezone: TZ,
      schedule: openEnded,
    });
    // Welcome chains to Dinner's start — no artificial gap
    expect(during.currentSegment?.label).toBe("Welcome");

    const late = getEventTemporalState(START, null, {
      now: new Date("2026-08-22T23:00:00Z"), // 5h into Dinner
      timezone: TZ,
      schedule: openEnded,
    });
    // Last entry gets the assumed duration (ends 18:00Z + 6h = 24:00Z)
    expect(late.currentSegment?.label).toBe("Dinner");
    expect(late.phase).toBe("ongoing");
  });

  it("sorts segments as instants, not ISO strings (mixed precision)", () => {
    const mixed = [
      { id: "later", label: "Later", startAt: "2026-08-22T16:00:00.500Z", isAccessPassGated: false },
      { id: "earlier", label: "Earlier", startAt: "2026-08-22T16:00:00Z", isAccessPassGated: false },
    ];
    const state = getEventTemporalState(START, null, {
      now: new Date("2026-08-22T15:00:00Z"),
      timezone: TZ,
      schedule: mixed,
    });
    expect(state.segments.map((s) => s.label)).toEqual(["Earlier", "Later"]);
  });
});
