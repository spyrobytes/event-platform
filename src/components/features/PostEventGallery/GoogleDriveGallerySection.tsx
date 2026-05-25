"use client";

import { useCallback, useEffect, useState } from "react";
import { GoogleDriveConnectButton } from "./GoogleDriveConnectButton";
import { GoogleDrivePickerLauncher } from "./GoogleDrivePickerLauncher";
import { GalleryImportProgress } from "./GalleryImportProgress";

type Props = {
  eventId: string;
  /** Path the OAuth callback should return the user to on success. */
  returnPath: string;
  getIdToken: () => Promise<string | null>;
  /** Fires after a successful Picker selection lands or a job settles —
   *  the parent dashboard refetches the gallery row to reflect the new
   *  source/status/item count. */
  onGalleryChanged: () => void;
};

type Status =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; connected: boolean };

/**
 * Orchestrates the Drive connect → pick → import-progress flow. Owns the
 * status fetch + the in-flight job ID. Pure dashboard UI — no public
 * surface depends on it.
 */
export function GoogleDriveGallerySection({
  eventId,
  returnPath,
  getIdToken,
  onGalleryChanged,
}: Props) {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        setStatus({ state: "error", message: "Not authenticated" });
        return;
      }
      const res = await fetch("/api/auth/google-drive/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        setStatus({ state: "error", message: "Drive integration is not enabled here." });
        return;
      }
      if (!res.ok) throw new Error("Failed to load Drive status");
      const data = await res.json();
      setStatus({ state: "ready", connected: !!data.data.connected });
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Failed to load Drive status",
      });
    }
  }, [getIdToken]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // After the OAuth callback bounces the user back here with ?gdrive=connected
  // we want the status to refresh. The URL change happens via the redirect,
  // so a re-mount usually triggers loadStatus naturally. This effect catches
  // the same-mount-with-changed-query case (e.g. SPA navigation in dev).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gdrive") === "connected") void loadStatus();
  }, [loadStatus]);

  if (status.state === "loading") {
    return <p className="text-sm text-muted-foreground">Checking Drive connection…</p>;
  }

  if (status.state === "error") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {status.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GoogleDriveConnectButton
        connected={status.connected}
        nextUrl={returnPath}
        getIdToken={getIdToken}
        onChanged={() => {
          setActiveJobId(null);
          void loadStatus();
          onGalleryChanged();
        }}
      />
      {status.connected && (
        <GoogleDrivePickerLauncher
          eventId={eventId}
          connected={status.connected}
          busy={activeJobId !== null}
          getIdToken={getIdToken}
          onSelected={(result) => {
            setActiveJobId(result.jobId);
            onGalleryChanged();
            if (result.skipped.length > 0) {
              const names = result.skipped
                .slice(0, 3)
                .map((s) => s.name)
                .join(", ");
              const more =
                result.skipped.length > 3 ? ` and ${result.skipped.length - 3} more` : "";
              console.warn(
                `[gallery] ${result.skipped.length} file(s) skipped: ${names}${more}`,
              );
            }
          }}
          onReconnectRequired={() => {
            // 409 from /access-token: token was revoked while the
            // dashboard sat on a stale connected=true. Refetch status
            // so the UI swaps to the Connect button.
            void loadStatus();
          }}
        />
      )}
      {activeJobId && (
        <GalleryImportProgress
          eventId={eventId}
          jobId={activeJobId}
          getIdToken={getIdToken}
          onSettled={() => {
            onGalleryChanged();
          }}
        />
      )}
    </div>
  );
}
