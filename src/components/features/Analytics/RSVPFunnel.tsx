"use client";

import { useEffect, useState, useCallback } from "react";
import { FunnelStage } from "./FunnelStage";
import { DropoffIndicator } from "./DropoffIndicator";
import { useAuthContext } from "@/components/providers/AuthProvider";
import type { FunnelData } from "@/lib/analytics";

type RSVPFunnelProps = {
  eventId: string;
  className?: string;
};

/**
 * RSVP Funnel Visualization
 *
 * Displays a 3-stage funnel showing conversion from invites to responses:
 * 1. Invited - Total invites sent
 * 2. Opened - Invites that were opened (link clicked)
 * 3. Responded - RSVPs submitted
 */
export function RSVPFunnel({ eventId, className }: RSVPFunnelProps) {
  const { getIdToken } = useAuthContext();
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFunnel = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/events/${eventId}/analytics/funnel`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch funnel data");
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load funnel");
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    fetchFunnel();
  }, [fetchFunnel]);

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-8 animate-pulse rounded-lg bg-muted" />
            </div>
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
              fetchFunnel();
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
  if (data.totalInvited === 0) {
    return (
      <div className={className}>
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No invites sent yet. Send invites to see your RSVP funnel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">RSVP Funnel</h3>
        <span className="text-sm text-muted-foreground">
          {data.overallConversionRate}% overall conversion
        </span>
      </div>

      <div className="space-y-1">
        {data.stages.map((stage, index) => (
          <div key={stage.name}>
            <FunnelStage
              label={stage.label}
              count={stage.count}
              percentage={stage.percentage}
              isFirst={index === 0}
            />

            {/* Show dropoff indicator between stages */}
            {index < data.dropoffs.length && (
              <DropoffIndicator
                lostCount={data.dropoffs[index].lost}
                dropoffRate={data.dropoffs[index].rate}
              />
            )}
          </div>
        ))}
      </div>

      {/* Conversion insight */}
      {data.totalInvited > 0 && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            {data.overallConversionRate >= 50 ? (
              <>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Great conversion!
                </span>{" "}
                {data.totalResponded} of {data.totalInvited} invitees have responded.
              </>
            ) : data.overallConversionRate >= 25 ? (
              <>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  Room for improvement.
                </span>{" "}
                Consider sending a reminder to boost responses.
              </>
            ) : (
              <>
                <span className="font-medium text-red-600 dark:text-red-400">
                  Low response rate.
                </span>{" "}
                Try sending reminders or checking if invites were delivered.
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
