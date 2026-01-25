/**
 * Analytics calculation utilities
 *
 * Pure functions for calculating event metrics.
 * Separated from API route for testability.
 */

// =============================================================================
// TYPES
// =============================================================================

export type RSVPStats = {
  yes: { count: number; guests: number };
  maybe: { count: number; guests: number };
  no: { count: number; guests: number };
};

export type InviteStats = {
  total: number;
  opened: number;
};

export type FunnelStageName = "invited" | "opened" | "responded";

export type FunnelStage = {
  name: FunnelStageName;
  label: string;
  count: number;
  percentage: number; // relative to first stage (0-100)
};

export type FunnelDropoff = {
  from: FunnelStageName;
  to: FunnelStageName;
  lost: number; // absolute count lost
  rate: number; // percentage lost (0-100)
};

export type FunnelData = {
  stages: FunnelStage[];
  dropoffs: FunnelDropoff[];
  totalInvited: number;
  totalResponded: number;
  overallConversionRate: number; // invited → responded (0-100)
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

// =============================================================================
// FUNNEL CALCULATIONS
// =============================================================================

const FUNNEL_STAGE_LABELS: Record<FunnelStageName, string> = {
  invited: "Invited",
  opened: "Opened Invite",
  responded: "Responded",
};

/**
 * Calculate drop-off between two funnel stages
 */
export function calculateDropoff(
  fromCount: number,
  toCount: number,
  fromName: FunnelStageName,
  toName: FunnelStageName
): FunnelDropoff {
  const lost = Math.max(0, fromCount - toCount);
  const rate = fromCount > 0 ? Math.round((lost / fromCount) * 100) : 0;

  return {
    from: fromName,
    to: toName,
    lost,
    rate,
  };
}

/**
 * Build complete funnel data from raw counts
 *
 * Funnel stages:
 * 1. Invited - Total invites sent
 * 2. Opened - Invites that were opened (clicked)
 * 3. Responded - RSVPs submitted (any response)
 */
export function buildFunnelData(
  totalInvited: number,
  totalOpened: number,
  totalResponded: number
): FunnelData {
  // Calculate percentages relative to first stage
  const calculatePercentage = (count: number): number => {
    if (totalInvited === 0) return 0;
    return Math.round((count / totalInvited) * 100);
  };

  const stages: FunnelStage[] = [
    {
      name: "invited",
      label: FUNNEL_STAGE_LABELS.invited,
      count: totalInvited,
      percentage: 100, // First stage is always 100%
    },
    {
      name: "opened",
      label: FUNNEL_STAGE_LABELS.opened,
      count: totalOpened,
      percentage: calculatePercentage(totalOpened),
    },
    {
      name: "responded",
      label: FUNNEL_STAGE_LABELS.responded,
      count: totalResponded,
      percentage: calculatePercentage(totalResponded),
    },
  ];

  const dropoffs: FunnelDropoff[] = [
    calculateDropoff(totalInvited, totalOpened, "invited", "opened"),
    calculateDropoff(totalOpened, totalResponded, "opened", "responded"),
  ];

  const overallConversionRate = calculatePercentage(totalResponded);

  return {
    stages,
    dropoffs,
    totalInvited,
    totalResponded,
    overallConversionRate,
  };
}
