"use client";

import { useEffect, useState, useCallback } from "react";
import { KPICard } from "./KPICard";
import { useAuthContext } from "@/components/providers/AuthProvider";

type AnalyticsData = {
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

type AnalyticsSnapshotProps = {
  eventId: string;
  className?: string;
};

/**
 * Analytics Snapshot Component
 *
 * Displays key event metrics in a grid of KPI cards.
 * Fetches data from the analytics API endpoint.
 */
export function AnalyticsSnapshot({ eventId, className }: AnalyticsSnapshotProps) {
  const { getIdToken } = useAuthContext();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/events/${eventId}/analytics/snapshot`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch analytics");
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className={className}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[104px] animate-pulse rounded-lg border border-border bg-muted/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchAnalytics();
            }}
            className="mt-2 text-sm font-medium text-destructive underline underline-offset-4 hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Determine variant for response rate
  const responseRateVariant =
    data.responseRate >= 50 ? "success" : data.responseRate >= 25 ? "default" : "warning";

  // Determine variant for days until event
  const daysVariant =
    data.daysUntilEvent === null
      ? "muted"
      : data.daysUntilEvent <= 7
        ? "warning"
        : "default";

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Event Analytics</h3>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(data.lastUpdated).toLocaleTimeString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Confirmed RSVPs"
          value={data.totalYes}
          subtitle={data.totalMaybe > 0 ? `+${data.totalMaybe} maybe` : undefined}
          variant="success"
        />

        <KPICard
          label="Expected Guests"
          value={data.expectedAttendance}
          subtitle="Total confirmed attendees"
        />

        <KPICard
          label="Response Rate"
          value={data.responseRate}
          format="percent"
          subtitle={`${data.totalResponses} of ${data.totalInvites} invites`}
          variant={responseRateVariant}
        />

        <KPICard
          label={data.daysUntilEvent !== null ? "Days Until Event" : "Event Status"}
          value={data.daysUntilEvent !== null ? data.daysUntilEvent : "Past"}
          format={data.daysUntilEvent !== null ? "days" : undefined}
          subtitle={new Date(data.eventDate).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          variant={daysVariant}
        />
      </div>

      {/* Secondary metrics row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <KPICard
          label="Invites Opened"
          value={data.invitesOpened}
          subtitle={`${data.openRate}% open rate`}
          variant="muted"
        />

        <KPICard
          label="Maybe Responses"
          value={data.totalMaybe}
          subtitle="Pending decisions"
          variant="muted"
        />

        <KPICard
          label="Declined"
          value={data.totalNo}
          subtitle="Not attending"
          variant="muted"
        />
      </div>
    </div>
  );
}
