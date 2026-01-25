import { describe, it, expect } from "vitest";
import {
  calculateResponseRate,
  calculateOpenRate,
  calculateDaysUntilEvent,
  buildAnalyticsSnapshot,
  type RSVPStats,
  type InviteStats,
} from "@/lib/analytics";

describe("calculateResponseRate", () => {
  it("returns 0 when no invites sent", () => {
    expect(calculateResponseRate(10, 0)).toBe(0);
  });

  it("calculates correct percentage", () => {
    expect(calculateResponseRate(50, 100)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(calculateResponseRate(1, 3)).toBe(33);
  });

  it("returns 100 when all responded", () => {
    expect(calculateResponseRate(100, 100)).toBe(100);
  });
});

describe("calculateOpenRate", () => {
  it("returns 0 when no invites sent", () => {
    expect(calculateOpenRate(10, 0)).toBe(0);
  });

  it("calculates correct percentage", () => {
    expect(calculateOpenRate(75, 100)).toBe(75);
  });

  it("rounds to nearest integer", () => {
    expect(calculateOpenRate(2, 3)).toBe(67);
  });
});

describe("calculateDaysUntilEvent", () => {
  it("returns null for past events", () => {
    const pastDate = new Date("2020-01-01");
    const now = new Date("2024-01-01");
    expect(calculateDaysUntilEvent(pastDate, now)).toBe(null);
  });

  it("returns 1 for event tomorrow", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    const tomorrow = new Date("2024-01-02T12:00:00Z");
    expect(calculateDaysUntilEvent(tomorrow, now)).toBe(1);
  });

  it("returns correct days for future event", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const futureDate = new Date("2024-01-15T00:00:00Z");
    expect(calculateDaysUntilEvent(futureDate, now)).toBe(14);
  });

  it("rounds up partial days", () => {
    const now = new Date("2024-01-01T23:00:00Z");
    const tomorrow = new Date("2024-01-02T01:00:00Z");
    // 2 hours difference should still show 1 day
    expect(calculateDaysUntilEvent(tomorrow, now)).toBe(1);
  });
});

describe("buildAnalyticsSnapshot", () => {
  const baseRsvpStats: RSVPStats = {
    yes: { count: 50, guests: 75 },
    maybe: { count: 20, guests: 25 },
    no: { count: 10, guests: 10 },
  };

  const baseInviteStats: InviteStats = {
    total: 100,
    opened: 80,
  };

  const futureEventDate = new Date("2025-06-15T18:00:00Z");
  const now = new Date("2025-01-01T12:00:00Z");

  it("calculates all metrics correctly", () => {
    const snapshot = buildAnalyticsSnapshot(
      baseRsvpStats,
      baseInviteStats,
      futureEventDate,
      now
    );

    expect(snapshot.totalYes).toBe(50);
    expect(snapshot.totalMaybe).toBe(20);
    expect(snapshot.totalNo).toBe(10);
    expect(snapshot.totalResponses).toBe(80);
    expect(snapshot.expectedAttendance).toBe(75);
    expect(snapshot.responseRate).toBe(80);
    expect(snapshot.openRate).toBe(80);
    expect(snapshot.totalInvites).toBe(100);
    expect(snapshot.invitesOpened).toBe(80);
  });

  it("includes event date as ISO string", () => {
    const snapshot = buildAnalyticsSnapshot(
      baseRsvpStats,
      baseInviteStats,
      futureEventDate,
      now
    );

    expect(snapshot.eventDate).toBe(futureEventDate.toISOString());
  });

  it("calculates days until event", () => {
    const snapshot = buildAnalyticsSnapshot(
      baseRsvpStats,
      baseInviteStats,
      futureEventDate,
      now
    );

    expect(snapshot.daysUntilEvent).toBeGreaterThan(0);
  });

  it("handles zero invites gracefully", () => {
    const emptyInviteStats: InviteStats = { total: 0, opened: 0 };
    const emptyRsvpStats: RSVPStats = {
      yes: { count: 0, guests: 0 },
      maybe: { count: 0, guests: 0 },
      no: { count: 0, guests: 0 },
    };

    const snapshot = buildAnalyticsSnapshot(
      emptyRsvpStats,
      emptyInviteStats,
      futureEventDate,
      now
    );

    expect(snapshot.responseRate).toBe(0);
    expect(snapshot.openRate).toBe(0);
    expect(snapshot.totalResponses).toBe(0);
    expect(snapshot.expectedAttendance).toBe(0);
  });

  it("handles past event", () => {
    const pastEventDate = new Date("2024-01-01T18:00:00Z");
    const snapshot = buildAnalyticsSnapshot(
      baseRsvpStats,
      baseInviteStats,
      pastEventDate,
      now
    );

    expect(snapshot.daysUntilEvent).toBe(null);
  });
});
