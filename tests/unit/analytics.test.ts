import { describe, it, expect } from "vitest";
import {
  calculateResponseRate,
  calculateOpenRate,
  calculateDaysUntilEvent,
  buildAnalyticsSnapshot,
  calculateDropoff,
  buildFunnelData,
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
