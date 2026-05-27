"use client";

import { useEffect, useState } from "react";

type Props = {
  eventId: string;
  jobId: string;
  getIdToken: () => Promise<string | null>;
  /** Fires when the job leaves an active state (COMPLETED / PARTIAL /
   *  FAILED / CANCELLED). The dashboard refetches the gallery row in
   *  response so it can show the new item count. */
  onSettled?: () => void;
  /** Fires when the user dismisses the progress panel (after a polling
   *  error or on a settled state). The parent should clear its activeJobId
   *  so the picker isn't stuck behind a `busy` flag. */
  onDismiss?: () => void;
};

type JobSnapshot = {
  id: string;
  status:
    | "QUEUED"
    | "PROCESSING"
    | "COMPLETED"
    | "PARTIAL"
    | "FAILED"
    | "CANCELLED";
  totalItems: number;
  processedItems: number;
  failedItems: number;
  skippedItems: number;
  pendingItems: number;
  errorCode: string | null;
  errorMessage: string | null;
};

const POLL_MS = 3000;
const ACTIVE_STATUSES: ReadonlyArray<JobSnapshot["status"]> = ["QUEUED", "PROCESSING"];

const STATUS_COPY: Record<JobSnapshot["status"], { label: string; tone: string }> = {
  QUEUED: { label: "Queued", tone: "text-muted-foreground" },
  PROCESSING: { label: "Importing…", tone: "text-foreground" },
  COMPLETED: { label: "Import complete", tone: "text-success" },
  PARTIAL: { label: "Import finished with some failures", tone: "text-amber-600" },
  FAILED: { label: "Import failed", tone: "text-destructive" },
  CANCELLED: { label: "Import cancelled", tone: "text-muted-foreground" },
};

/**
 * Polls /api/events/[id]/gallery/import-jobs/[jobId] every 3s while the
 * job is QUEUED or PROCESSING; stops once it settles.
 *
 * Phase 1 note (no worker yet): PR #5 introduces the cron that picks up
 * PENDING items. Until that lands, the job sits in QUEUED forever and
 * this component shows "Queued — N files waiting." That's the desired
 * Phase 2 state — the dashboard is honest about what just happened.
 */
export function GalleryImportProgress({
  eventId,
  jobId,
  getIdToken,
  onSettled,
  onDismiss,
}: Props) {
  const [snapshot, setSnapshot] = useState<JobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumping this triggers the polling effect to re-run (Retry button).
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch(
          `/api/events/${eventId}/gallery/import-jobs/${jobId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Failed to read job status");
        const data = await res.json();
        if (cancelled) return;
        const next = data.data as JobSnapshot;
        setSnapshot(next);
        if (ACTIVE_STATUSES.includes(next.status)) {
          timer = setTimeout(() => void tick(), POLL_MS);
        } else {
          onSettled?.();
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Polling failed");
        // Don't keep polling on the same error — wait for explicit retry.
        // Without an exit path here, the parent's `busy={activeJobId !==
        // null}` would strand the picker after a transient network blip.
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [eventId, jobId, getIdToken, onSettled, retryAttempt]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <div className="flex items-start justify-between gap-3">
          <span>{error}</span>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => {
                // Clear the prior error here (not in the effect body) so we
                // don't trip react-hooks/set-state-in-effect when the effect
                // re-runs.
                setError(null);
                setRetryAttempt((n) => n + 1);
              }}
              className="rounded px-1.5 py-0.5 text-xs font-medium underline-offset-2 hover:underline"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => onDismiss?.()}
              className="rounded px-1.5 py-0.5 text-xs font-medium underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return <p className="text-sm text-muted-foreground">Loading import status…</p>;
  }

  const tone = STATUS_COPY[snapshot.status];
  const done =
    snapshot.processedItems + snapshot.failedItems + snapshot.skippedItems;
  const pct = snapshot.totalItems
    ? Math.round((done / snapshot.totalItems) * 100)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={tone.tone}>{tone.label}</span>
        <span className="text-muted-foreground">
          {done} of {snapshot.totalItems}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {snapshot.status === "QUEUED" && snapshot.pendingItems > 0 && (
        <p className="text-xs text-muted-foreground">
          {snapshot.pendingItems} {snapshot.pendingItems === 1 ? "file" : "files"} waiting.
          Imports run on a 5-minute schedule.
        </p>
      )}
      {(snapshot.status === "PARTIAL" || snapshot.failedItems > 0) && (
        <p className="text-xs text-muted-foreground">
          {snapshot.failedItems} failed, {snapshot.skippedItems} skipped. Retry from the
          gallery review screen.
        </p>
      )}
      {snapshot.status === "FAILED" && snapshot.errorMessage && (
        <p className="text-xs text-destructive">{snapshot.errorMessage}</p>
      )}
    </div>
  );
}
