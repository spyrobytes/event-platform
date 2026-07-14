import { describe, it, expect } from "vitest";
import { formatEventDateFormal, formatEventTimeFormal } from "@/lib/utils";

// Fixed timezone + instants throughout — calendar assertions must never
// depend on the clock or zone the suite runs in (see #284's CI failure).
const TZ = "America/Edmonton"; // UTC-6 in summer

describe("formatEventDateFormal", () => {
  it("spells out weekday, ordinal day, and month", () => {
    // 2026-08-22 16:00 local
    expect(formatEventDateFormal("2026-08-22T22:00:00Z", TZ)).toBe(
      "Saturday, the Twenty-Second of August"
    );
  });

  it("covers ordinal edge words (First, Third, Thirty-First)", () => {
    expect(formatEventDateFormal("2026-08-01T18:00:00Z", TZ)).toBe(
      "Saturday, the First of August"
    );
    expect(formatEventDateFormal("2026-08-03T18:00:00Z", TZ)).toBe(
      "Monday, the Third of August"
    );
    expect(formatEventDateFormal("2026-08-31T18:00:00Z", TZ)).toBe(
      "Monday, the Thirty-First of August"
    );
  });

  it("uses the venue calendar day, not UTC", () => {
    // 03:00Z Aug 23 = 21:00 Aug 22 in Edmonton
    expect(formatEventDateFormal("2026-08-23T03:00:00Z", TZ)).toBe(
      "Saturday, the Twenty-Second of August"
    );
  });
});

describe("formatEventTimeFormal", () => {
  it("spells out on-the-hour times with day period", () => {
    expect(formatEventTimeFormal("2026-08-22T15:00:00Z", TZ)).toBe(
      "Nine O'Clock in the Morning"
    ); // 9:00 AM
    expect(formatEventTimeFormal("2026-08-22T22:00:00Z", TZ)).toBe(
      "Four O'Clock in the Afternoon"
    ); // 4:00 PM
    expect(formatEventTimeFormal("2026-08-23T01:00:00Z", TZ)).toBe(
      "Seven O'Clock in the Evening"
    ); // 7:00 PM
  });

  it("handles quarter-hour wording", () => {
    expect(formatEventTimeFormal("2026-08-22T15:15:00Z", TZ)).toBe(
      "Quarter Past Nine in the Morning"
    );
    expect(formatEventTimeFormal("2026-08-23T00:30:00Z", TZ)).toBe(
      "Half Past Six in the Evening"
    ); // 6:30 PM
    expect(formatEventTimeFormal("2026-08-22T22:45:00Z", TZ)).toBe(
      "Quarter to Five in the Evening"
    ); // 4:45 PM → next hour 5 PM = evening
  });

  it("takes the day period from the upcoming hour for quarter-to", () => {
    // 11:45 AM → "Quarter to Twelve" and noon is afternoon
    expect(formatEventTimeFormal("2026-08-22T17:45:00Z", TZ)).toBe(
      "Quarter to Twelve in the Afternoon"
    );
  });

  it("special-cases Noon and Midnight", () => {
    expect(formatEventTimeFormal("2026-08-22T18:00:00Z", TZ)).toBe("Noon");
    expect(formatEventTimeFormal("2026-08-22T06:00:00Z", TZ)).toBe("Midnight");
  });

  it("degrades to numeric time for non-quarter minutes", () => {
    expect(formatEventTimeFormal("2026-08-22T22:20:00Z", TZ)).toBe("4:20 PM");
  });
});
