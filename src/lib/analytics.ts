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

export type FunnelStageName =
  | "invited"
  | "opened"
  | "page_viewed"
  | "form_started"
  | "responded";

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

// Velocity / Time Intelligence Types
export type VelocityTrend = "accelerating" | "steady" | "slowing";

export type DailyCount = {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number; // RSVPs on this day
  cumulative: number; // Running total
};

export type MomentumData = {
  current7Days: number;
  previous7Days: number;
  trend: VelocityTrend;
  percentChange: number; // positive = accelerating, negative = slowing
};

export type VelocityData = {
  daily: DailyCount[];
  momentum: MomentumData;
  totalRsvps: number;
  firstRsvpDate: string | null;
  lastRsvpDate: string | null;
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
  page_viewed: "Viewed Page",
  form_started: "Started RSVP",
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

/**
 * Build extended 5-stage funnel data including client-side tracking
 *
 * Funnel stages:
 * 1. Invited - Total invites sent
 * 2. Opened - Invites that were opened (clicked)
 * 3. Page Viewed - Unique sessions that viewed the event page
 * 4. Form Started - Unique sessions that started the RSVP form
 * 5. Responded - RSVPs submitted (any response)
 */
export function buildExtendedFunnelData(
  totalInvited: number,
  totalOpened: number,
  totalPageViewed: number,
  totalFormStarted: number,
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
      percentage: 100,
    },
    {
      name: "opened",
      label: FUNNEL_STAGE_LABELS.opened,
      count: totalOpened,
      percentage: calculatePercentage(totalOpened),
    },
    {
      name: "page_viewed",
      label: FUNNEL_STAGE_LABELS.page_viewed,
      count: totalPageViewed,
      percentage: calculatePercentage(totalPageViewed),
    },
    {
      name: "form_started",
      label: FUNNEL_STAGE_LABELS.form_started,
      count: totalFormStarted,
      percentage: calculatePercentage(totalFormStarted),
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
    calculateDropoff(totalOpened, totalPageViewed, "opened", "page_viewed"),
    calculateDropoff(totalPageViewed, totalFormStarted, "page_viewed", "form_started"),
    calculateDropoff(totalFormStarted, totalResponded, "form_started", "responded"),
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

// =============================================================================
// VELOCITY / TIME INTELLIGENCE CALCULATIONS
// =============================================================================

/**
 * Determine momentum trend based on percent change
 */
export function determineTrend(percentChange: number): VelocityTrend {
  if (percentChange > 10) return "accelerating";
  if (percentChange < -10) return "slowing";
  return "steady";
}

/**
 * Calculate momentum comparing current 7 days to previous 7 days
 */
export function calculateMomentum(
  current7Days: number,
  previous7Days: number
): MomentumData {
  let percentChange = 0;

  if (previous7Days > 0) {
    percentChange = Math.round(
      ((current7Days - previous7Days) / previous7Days) * 100
    );
  } else if (current7Days > 0) {
    // If no previous activity but current activity exists, that's accelerating
    percentChange = 100;
  }
  // If both are 0, percentChange stays 0 (steady)

  return {
    current7Days,
    previous7Days,
    trend: determineTrend(percentChange),
    percentChange,
  };
}

/**
 * Group RSVPs by date and calculate daily counts with cumulative totals
 *
 * @param rsvpDates - Array of RSVP dates (as Date objects or ISO strings)
 * @param startDate - Start of the date range to include
 * @param endDate - End of the date range to include
 */
export function buildDailyCounts(
  rsvpDates: (Date | string)[],
  startDate: Date,
  endDate: Date
): DailyCount[] {
  // Convert all dates to YYYY-MM-DD strings for grouping
  const dateCounts = new Map<string, number>();

  for (const rsvpDate of rsvpDates) {
    const date = rsvpDate instanceof Date ? rsvpDate : new Date(rsvpDate);
    const dateStr = date.toISOString().split("T")[0];
    dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
  }

  // Generate all dates in range
  const daily: DailyCount[] = [];
  let cumulative = 0;
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    const count = dateCounts.get(dateStr) || 0;
    cumulative += count;

    daily.push({
      date: dateStr,
      count,
      cumulative,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return daily;
}

/**
 * Build complete velocity data from RSVP dates
 *
 * @param rsvpDates - Array of RSVP submission dates
 * @param referenceDate - The reference point for calculations (usually "now")
 * @param lookbackDays - How many days to include in the chart (default 30)
 */
export function buildVelocityData(
  rsvpDates: (Date | string)[],
  referenceDate: Date = new Date(),
  lookbackDays: number = 30
): VelocityData {
  if (rsvpDates.length === 0) {
    return {
      daily: [],
      momentum: {
        current7Days: 0,
        previous7Days: 0,
        trend: "steady",
        percentChange: 0,
      },
      totalRsvps: 0,
      firstRsvpDate: null,
      lastRsvpDate: null,
    };
  }

  // Sort dates chronologically
  const sortedDates = rsvpDates
    .map((d) => (d instanceof Date ? d : new Date(d)))
    .sort((a, b) => a.getTime() - b.getTime());

  const firstRsvpDate = sortedDates[0].toISOString().split("T")[0];
  const lastRsvpDate = sortedDates[sortedDates.length - 1]
    .toISOString()
    .split("T")[0];

  // Calculate date ranges
  const endDate = new Date(referenceDate);
  endDate.setUTCHours(23, 59, 59, 999);

  const startDate = new Date(referenceDate);
  startDate.setUTCDate(startDate.getUTCDate() - lookbackDays + 1);
  startDate.setUTCHours(0, 0, 0, 0);

  // Build daily counts for the lookback period
  const daily = buildDailyCounts(sortedDates, startDate, endDate);

  // Calculate momentum (last 7 days vs previous 7 days)
  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const fourteenDaysAgo = new Date(referenceDate);
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);

  let current7Days = 0;
  let previous7Days = 0;

  for (const date of sortedDates) {
    const d = date instanceof Date ? date : new Date(date);
    if (d > sevenDaysAgo && d <= referenceDate) {
      current7Days++;
    } else if (d > fourteenDaysAgo && d <= sevenDaysAgo) {
      previous7Days++;
    }
  }

  const momentum = calculateMomentum(current7Days, previous7Days);

  return {
    daily,
    momentum,
    totalRsvps: rsvpDates.length,
    firstRsvpDate,
    lastRsvpDate,
  };
}
