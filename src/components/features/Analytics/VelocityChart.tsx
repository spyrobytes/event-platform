"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { MomentumIndicator } from "./MomentumIndicator";
import type { VelocityData, DailyCount } from "@/lib/analytics";

type VelocityChartProps = {
  eventId: string;
  className?: string;
};

type ChartDataPoint = DailyCount & {
  displayDate: string;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * RSVP Velocity Chart
 *
 * Displays RSVP activity over the past 30 days as an area chart
 * with a momentum indicator showing week-over-week trend.
 */
export function VelocityChart({ eventId, className }: VelocityChartProps) {
  const { getIdToken } = useAuthContext();
  const [data, setData] = useState<VelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVelocity = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/events/${eventId}/analytics/velocity`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch velocity data");
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load velocity");
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    fetchVelocity();
  }, [fetchVelocity]);

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
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
              fetchVelocity();
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

  // Empty state
  if (data.totalRsvps === 0) {
    return (
      <div className={className}>
        <h3 className="mb-4 text-lg font-semibold">Response Velocity</h3>
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No RSVPs yet. Activity will appear here once guests start responding.
          </p>
        </div>
      </div>
    );
  }

  // Transform data for chart with formatted dates
  const chartData: ChartDataPoint[] = data.daily.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
  }));

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Response Velocity</h3>
        <span className="text-sm text-muted-foreground">
          {data.totalRsvps} total RSVPs
        </span>
      </div>

      {/* Chart */}
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRsvps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              formatter={(value, name) => {
                if (name === "count") return [value, "RSVPs"];
                if (name === "cumulative") return [value, "Total"];
                return [value, String(name)];
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#22c55e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRsvps)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Momentum indicator */}
      <div className="mt-4">
        <MomentumIndicator
          trend={data.momentum.trend}
          percentChange={data.momentum.percentChange}
          current7Days={data.momentum.current7Days}
          previous7Days={data.momentum.previous7Days}
        />
      </div>

      {/* Activity summary */}
      {data.firstRsvpDate && data.lastRsvpDate && (
        <p className="mt-3 text-xs text-muted-foreground">
          First response: {formatDate(data.firstRsvpDate)} · Last response:{" "}
          {formatDate(data.lastRsvpDate)}
        </p>
      )}
    </div>
  );
}
