"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { formatEventDateTimeLong } from "@/lib/utils";
import type { ScheduleEntry } from "@/schemas/event";

/**
 * One-time "schedule was auto-populated, please verify" banner shown on the
 * event dashboard after the backfill script derives Event.schedule from
 * invitation settings (canonical-schedule plan §4.2). Lists the derived
 * entries read-only; "Looks right" clears scheduleAutoPopulatedAt via the
 * acknowledge endpoint. The schedule editor (PR 4) is the edit path.
 */
type SchedulePopulatedBannerProps = {
  eventId: string;
  timezone: string;
  schedule: ScheduleEntry[];
  onAcknowledged: () => void;
};

export function SchedulePopulatedBanner({
  eventId,
  timezone,
  schedule,
  onAcknowledged,
}: SchedulePopulatedBannerProps) {
  const { getIdToken } = useAuthContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acknowledge = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/events/${eventId}/schedule/acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to acknowledge");
      onAcknowledged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to acknowledge");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="space-y-1">
        <p className="font-medium">
          We built your event schedule from your invitation settings
        </p>
        <p className="text-sm text-muted-foreground">
          Please check the times below — they now drive schedule displays
          across your event pages.
        </p>
      </div>
      <ul className="space-y-1">
        {schedule.map((entry) => (
          <li key={entry.id} className="text-sm">
            <span className="font-medium">{entry.label}</span>
            {" — "}
            {formatEventDateTimeLong(new Date(entry.startAt), timezone)}
            {entry.venue && ` · ${entry.venue}`}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" onClick={acknowledge} disabled={busy}>
        {busy ? "Saving..." : "Looks right"}
      </Button>
    </div>
  );
}
