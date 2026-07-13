import { describe, it, expect } from "vitest";
import {
  getEventTemporalState,
  getNextTickDelay,
  JUST_STARTED_WINDOW_MS,
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
