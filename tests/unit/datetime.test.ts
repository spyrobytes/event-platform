import { describe, it, expect } from "vitest";
import {
  toDatetimeLocalInTz,
  fromDatetimeLocalInTz,
} from "@/lib/datetime";

describe("toDatetimeLocalInTz", () => {
  it("formats a UTC instant as the wall-clock in the given timezone", () => {
    // 2026-08-22T04:00:00Z = 22:00 prior day Edmonton MDT? No — 22:00 prior
    // day would be 04:00 next day UTC (UTC-6). Let's pick a clearer case:
    // 2026-08-22T20:00:00Z is 14:00 in Edmonton (UTC-6 in summer).
    expect(
      toDatetimeLocalInTz(new Date("2026-08-22T20:00:00Z"), "America/Edmonton")
    ).toBe("2026-08-22T14:00");
  });

  it("returns the same wall-clock when the timezone matches the input's", () => {
    // 2026-08-22T11:00Z formatted as UTC wall-clock is 11:00.
    expect(
      toDatetimeLocalInTz(new Date("2026-08-22T11:00:00Z"), "UTC")
    ).toBe("2026-08-22T11:00");
  });

  it("handles a date that crosses midnight in the target timezone", () => {
    // Sydney is UTC+10 in August (no DST then). 22:00 UTC = 08:00 next day.
    expect(
      toDatetimeLocalInTz(new Date("2026-08-22T22:00:00Z"), "Australia/Sydney")
    ).toBe("2026-08-23T08:00");
  });

  it("accepts an ISO string input", () => {
    expect(
      toDatetimeLocalInTz("2026-08-22T20:00:00Z", "America/Edmonton")
    ).toBe("2026-08-22T14:00");
  });

  it("returns empty string for null / undefined", () => {
    expect(toDatetimeLocalInTz(null, "UTC")).toBe("");
    expect(toDatetimeLocalInTz(undefined, "UTC")).toBe("");
  });
});

describe("fromDatetimeLocalInTz", () => {
  it("interprets a wall-clock as in the given timezone, returning UTC", () => {
    // 14:00 Edmonton (MDT, UTC-6) = 20:00 UTC.
    const result = fromDatetimeLocalInTz("2026-08-22T14:00", "America/Edmonton");
    expect(result?.toISOString()).toBe("2026-08-22T20:00:00.000Z");
  });

  it("returns identical UTC when the timezone is UTC", () => {
    const result = fromDatetimeLocalInTz("2026-08-22T11:00", "UTC");
    expect(result?.toISOString()).toBe("2026-08-22T11:00:00.000Z");
  });

  it("crosses midnight when the target timezone is far ahead of UTC", () => {
    // 08:00 Sydney = 22:00 prior-day UTC (Sydney UTC+10 in August).
    const result = fromDatetimeLocalInTz("2026-08-23T08:00", "Australia/Sydney");
    expect(result?.toISOString()).toBe("2026-08-22T22:00:00.000Z");
  });

  it("returns null for empty string and nullish inputs", () => {
    expect(fromDatetimeLocalInTz("", "UTC")).toBeNull();
    expect(fromDatetimeLocalInTz(null, "UTC")).toBeNull();
    expect(fromDatetimeLocalInTz(undefined, "UTC")).toBeNull();
  });

  it("round-trips: from → to is identity in the same timezone", () => {
    const tz = "America/Edmonton";
    const wallClock = "2026-08-22T22:00";
    const utc = fromDatetimeLocalInTz(wallClock, tz);
    expect(toDatetimeLocalInTz(utc, tz)).toBe(wallClock);
  });

  it("handles DST transition cleanly (Edmonton spring-forward)", () => {
    // 2026-03-08 02:00 in Edmonton → spring forward to 03:00 (no 02:30
    // exists). date-fns-tz fromZonedTime resolves ambiguous wall-clock by
    // the standard rule. We just assert the round-trip is stable for a
    // non-ambiguous time bracketing the transition.
    const before = fromDatetimeLocalInTz("2026-03-08T01:30", "America/Edmonton");
    const after = fromDatetimeLocalInTz("2026-03-08T03:30", "America/Edmonton");
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    // After spring-forward the gap from 01:30 MST to 03:30 MDT is one hour
    // of wall-clock minus the lost hour = one real hour.
    const diffMs = (after as Date).getTime() - (before as Date).getTime();
    expect(diffMs).toBe(60 * 60 * 1000);
  });
});
