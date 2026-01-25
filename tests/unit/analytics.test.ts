import { describe, it, expect } from "vitest";
import {
  calculateResponseRate,
  calculateOpenRate,
  calculateDaysUntilEvent,
  buildAnalyticsSnapshot,
  calculateDropoff,
  buildFunnelData,
  determineTrend,
  calculateMomentum,
  buildDailyCounts,
  buildVelocityData,
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

// =============================================================================
// FUNNEL TESTS
// =============================================================================

describe("calculateDropoff", () => {
  it("calculates correct dropoff rate", () => {
    const dropoff = calculateDropoff(100, 75, "invited", "opened");

    expect(dropoff.from).toBe("invited");
    expect(dropoff.to).toBe("opened");
    expect(dropoff.lost).toBe(25);
    expect(dropoff.rate).toBe(25);
  });

  it("returns 0 dropoff when counts are equal", () => {
    const dropoff = calculateDropoff(100, 100, "invited", "opened");

    expect(dropoff.lost).toBe(0);
    expect(dropoff.rate).toBe(0);
  });

  it("handles zero from count", () => {
    const dropoff = calculateDropoff(0, 0, "invited", "opened");

    expect(dropoff.lost).toBe(0);
    expect(dropoff.rate).toBe(0);
  });

  it("rounds dropoff rate to nearest integer", () => {
    const dropoff = calculateDropoff(100, 67, "invited", "opened");

    expect(dropoff.rate).toBe(33); // 33% lost
  });

  it("handles case where toCount is greater than fromCount", () => {
    // This shouldn't happen in practice, but handle gracefully
    const dropoff = calculateDropoff(50, 75, "opened", "responded");

    expect(dropoff.lost).toBe(0); // Should not be negative
    expect(dropoff.rate).toBe(0);
  });
});

describe("buildFunnelData", () => {
  it("builds correct funnel structure", () => {
    const funnel = buildFunnelData(100, 80, 60);

    expect(funnel.stages).toHaveLength(3);
    expect(funnel.dropoffs).toHaveLength(2);
  });

  it("calculates correct stage percentages", () => {
    const funnel = buildFunnelData(100, 80, 60);

    expect(funnel.stages[0].name).toBe("invited");
    expect(funnel.stages[0].percentage).toBe(100);

    expect(funnel.stages[1].name).toBe("opened");
    expect(funnel.stages[1].percentage).toBe(80);

    expect(funnel.stages[2].name).toBe("responded");
    expect(funnel.stages[2].percentage).toBe(60);
  });

  it("calculates correct dropoff rates", () => {
    const funnel = buildFunnelData(100, 80, 60);

    // Invited → Opened: 20% drop (100 → 80)
    expect(funnel.dropoffs[0].from).toBe("invited");
    expect(funnel.dropoffs[0].to).toBe("opened");
    expect(funnel.dropoffs[0].lost).toBe(20);
    expect(funnel.dropoffs[0].rate).toBe(20);

    // Opened → Responded: 25% drop (80 → 60)
    expect(funnel.dropoffs[1].from).toBe("opened");
    expect(funnel.dropoffs[1].to).toBe("responded");
    expect(funnel.dropoffs[1].lost).toBe(20);
    expect(funnel.dropoffs[1].rate).toBe(25);
  });

  it("calculates overall conversion rate", () => {
    const funnel = buildFunnelData(100, 80, 60);

    expect(funnel.overallConversionRate).toBe(60);
  });

  it("handles zero invites gracefully", () => {
    const funnel = buildFunnelData(0, 0, 0);

    expect(funnel.stages[0].percentage).toBe(100); // First stage always 100%
    expect(funnel.stages[1].percentage).toBe(0);
    expect(funnel.stages[2].percentage).toBe(0);
    expect(funnel.overallConversionRate).toBe(0);
  });

  it("includes total counts", () => {
    const funnel = buildFunnelData(100, 80, 60);

    expect(funnel.totalInvited).toBe(100);
    expect(funnel.totalResponded).toBe(60);
  });

  it("handles 100% conversion", () => {
    const funnel = buildFunnelData(50, 50, 50);

    expect(funnel.dropoffs[0].rate).toBe(0);
    expect(funnel.dropoffs[1].rate).toBe(0);
    expect(funnel.overallConversionRate).toBe(100);
  });
});

// =============================================================================
// VELOCITY / TIME INTELLIGENCE TESTS
// =============================================================================

describe("determineTrend", () => {
  it("returns accelerating for positive change above 10%", () => {
    expect(determineTrend(15)).toBe("accelerating");
    expect(determineTrend(100)).toBe("accelerating");
  });

  it("returns slowing for negative change below -10%", () => {
    expect(determineTrend(-15)).toBe("slowing");
    expect(determineTrend(-50)).toBe("slowing");
  });

  it("returns steady for changes within threshold", () => {
    expect(determineTrend(0)).toBe("steady");
    expect(determineTrend(10)).toBe("steady");
    expect(determineTrend(-10)).toBe("steady");
    expect(determineTrend(5)).toBe("steady");
  });
});

describe("calculateMomentum", () => {
  it("calculates correct percent change", () => {
    const momentum = calculateMomentum(20, 10);

    expect(momentum.current7Days).toBe(20);
    expect(momentum.previous7Days).toBe(10);
    expect(momentum.percentChange).toBe(100); // Doubled
    expect(momentum.trend).toBe("accelerating");
  });

  it("handles decrease in activity", () => {
    const momentum = calculateMomentum(5, 10);

    expect(momentum.percentChange).toBe(-50);
    expect(momentum.trend).toBe("slowing");
  });

  it("handles zero previous activity with current activity", () => {
    const momentum = calculateMomentum(10, 0);

    expect(momentum.percentChange).toBe(100);
    expect(momentum.trend).toBe("accelerating");
  });

  it("handles both zero", () => {
    const momentum = calculateMomentum(0, 0);

    expect(momentum.percentChange).toBe(0);
    expect(momentum.trend).toBe("steady");
  });

  it("handles steady activity", () => {
    const momentum = calculateMomentum(10, 10);

    expect(momentum.percentChange).toBe(0);
    expect(momentum.trend).toBe("steady");
  });
});

describe("buildDailyCounts", () => {
  it("builds daily counts for date range", () => {
    const rsvpDates = [
      new Date("2025-01-01"),
      new Date("2025-01-01"),
      new Date("2025-01-03"),
    ];
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-03");

    const counts = buildDailyCounts(rsvpDates, startDate, endDate);

    expect(counts).toHaveLength(3);
    expect(counts[0]).toEqual({ date: "2025-01-01", count: 2, cumulative: 2 });
    expect(counts[1]).toEqual({ date: "2025-01-02", count: 0, cumulative: 2 });
    expect(counts[2]).toEqual({ date: "2025-01-03", count: 1, cumulative: 3 });
  });

  it("handles empty dates", () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-02");

    const counts = buildDailyCounts([], startDate, endDate);

    expect(counts).toHaveLength(2);
    expect(counts[0].count).toBe(0);
    expect(counts[1].count).toBe(0);
  });

  it("handles string dates", () => {
    const rsvpDates = ["2025-01-01T10:00:00Z", "2025-01-01T15:00:00Z"];
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-01");

    const counts = buildDailyCounts(rsvpDates, startDate, endDate);

    expect(counts).toHaveLength(1);
    expect(counts[0].count).toBe(2);
  });
});

describe("buildVelocityData", () => {
  it("handles empty RSVP dates", () => {
    const velocity = buildVelocityData([]);

    expect(velocity.daily).toHaveLength(0);
    expect(velocity.totalRsvps).toBe(0);
    expect(velocity.firstRsvpDate).toBe(null);
    expect(velocity.lastRsvpDate).toBe(null);
    expect(velocity.momentum.trend).toBe("steady");
  });

  it("calculates velocity data correctly", () => {
    const referenceDate = new Date("2025-01-15T12:00:00Z");
    const rsvpDates = [
      new Date("2025-01-10T10:00:00Z"),
      new Date("2025-01-12T10:00:00Z"),
      new Date("2025-01-14T10:00:00Z"),
    ];

    const velocity = buildVelocityData(rsvpDates, referenceDate, 7);

    expect(velocity.totalRsvps).toBe(3);
    expect(velocity.firstRsvpDate).toBe("2025-01-10");
    expect(velocity.lastRsvpDate).toBe("2025-01-14");
    expect(velocity.daily).toHaveLength(7);
  });

  it("calculates momentum correctly", () => {
    const referenceDate = new Date("2025-01-20T12:00:00Z");
    // 3 RSVPs in last 7 days (Jan 14-20)
    // 1 RSVP in previous 7 days (Jan 7-13)
    const rsvpDates = [
      new Date("2025-01-10T10:00:00Z"), // Previous week
      new Date("2025-01-15T10:00:00Z"), // Current week
      new Date("2025-01-17T10:00:00Z"), // Current week
      new Date("2025-01-19T10:00:00Z"), // Current week
    ];

    const velocity = buildVelocityData(rsvpDates, referenceDate, 30);

    expect(velocity.momentum.current7Days).toBe(3);
    expect(velocity.momentum.previous7Days).toBe(1);
    expect(velocity.momentum.trend).toBe("accelerating");
  });

  it("includes all dates in lookback period", () => {
    const referenceDate = new Date("2025-01-15T12:00:00Z");
    const velocity = buildVelocityData(
      [new Date("2025-01-01")],
      referenceDate,
      30
    );

    expect(velocity.daily).toHaveLength(30);
    // Check cumulative is calculated correctly
    const lastDay = velocity.daily[velocity.daily.length - 1];
    expect(lastDay.cumulative).toBe(1);
  });
});
