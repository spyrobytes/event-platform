"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  connected: boolean;
  /** Path the OAuth callback should send the user back to. Sanitized
   *  server-side (must start with "/dashboard"), but we still pass it
   *  through so the round-trip lands the organizer on the page they
   *  started from rather than the root dashboard. */
  nextUrl: string;
  getIdToken: () => Promise<string | null>;
  onChanged: () => void;
};

export function GoogleDriveConnectButton({
  connected,
  nextUrl,
  getIdToken,
  onChanged,
}: Props) {
  const [pending, setPending] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startConnect = async () => {
    setPending("connect");
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/auth/google-drive/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ next: nextUrl }),
      });
      if (res.status === 503) {
        // Operator hasn't configured the Google credentials yet.
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ??
            "Google Drive integration isn't configured for this environment.",
        );
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not start the Drive connect flow");
      }
      const { data: payload } = await res.json();
      // Full-page navigation — Google's consent screen needs a top-level
      // navigation, not a fetch.
      window.location.href = payload.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start connect");
      setPending(null);
    }
  };

  const disconnect = async () => {
    setPending("disconnect");
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/api/auth/google-drive/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to disconnect");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-2">
      {connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Google Drive connected.
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={pending !== null}
            onClick={() => void disconnect()}
          >
            {pending === "disconnect" ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          disabled={pending !== null}
          onClick={() => void startConnect()}
        >
          {pending === "connect" ? "Redirecting…" : "Connect Google Drive"}
        </Button>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
