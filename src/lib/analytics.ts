/**
 * Analytics calculation utilities
 *
 * Pure functions for calculating event metrics.
 * Separated from API route for testability.
 */

export type RSVPStats = {
  yes: { count: number; guests: number };
  maybe: { count: number; guests: number };
  no: { count: number; guests: number };
};

export type InviteStats = {
  total: number;
  opened: number;
};

export type AnalyticsSnapshot = {
  totalYes: number;
  totalMaybe: number;
  totalNo: number;
  totalResponses: number;
  totalInvites: number;
  invitesOpened: number;
  responseRate: number;
  openRate: number;
  expectedAttendance: number;
  daysUntilEvent: number | null;
  eventDate: string;
  lastUpdated: string;
};

/**
 * Calculate response rate as a percentage
 * Returns 0 if no invites sent (avoids division by zero)
 */
export function calculateResponseRate(
  totalResponses: number,
  totalInvites: number
): number {
  if (totalInvites === 0) return 0;
  return Math.round((totalResponses / totalInvites) * 100);
}

/**
 * Calculate open rate as a percentage
 * Returns 0 if no invites sent (avoids division by zero)
 */
export function calculateOpenRate(
  invitesOpened: number,
  totalInvites: number
): number {
  if (totalInvites === 0) return 0;
  return Math.round((invitesOpened / totalInvites) * 100);
}

/**
 * Calculate days until event
 * Returns null if event has passed
 */
export function calculateDaysUntilEvent(
  eventDate: Date,
  now: Date = new Date()
): number | null {
  const diffTime = eventDate.getTime() - now.getTime();
  if (diffTime <= 0) return null;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Build complete analytics snapshot from raw stats
 */
export function buildAnalyticsSnapshot(
  rsvpStats: RSVPStats,
  inviteStats: InviteStats,
  eventDate: Date,
  now: Date = new Date()
): AnalyticsSnapshot {
  const totalYes = rsvpStats.yes.count;
  const totalMaybe = rsvpStats.maybe.count;
  const totalNo = rsvpStats.no.count;
  const totalResponses = totalYes + totalMaybe + totalNo;
  const expectedAttendance = rsvpStats.yes.guests;

  return {
    totalYes,
    totalMaybe,
    totalNo,
    totalResponses,
    totalInvites: inviteStats.total,
    invitesOpened: inviteStats.opened,
    responseRate: calculateResponseRate(totalResponses, inviteStats.total),
    openRate: calculateOpenRate(inviteStats.opened, inviteStats.total),
    expectedAttendance,
    daysUntilEvent: calculateDaysUntilEvent(eventDate, now),
    eventDate: eventDate.toISOString(),
    lastUpdated: now.toISOString(),
  };
}
