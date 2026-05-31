"use client";

import { useEffect, useRef } from "react";

type MarkOpenedBeaconProps = {
  /** The invite's raw token (already present in the page URL). */
  token: string;
};

/**
 * Client-only beacon that marks an invite OPENED on a *real* page view. It runs
 * in a useEffect (post-hydration), so link-preview crawlers (WhatsApp / Slack /
 * iMessage) that fetch the HTML but don't execute JS never trigger it — fixing
 * the false-"Opened" signal where unfurling a shared link flipped the invite to
 * OPENED before the guest opened it (#148).
 *
 * Render this ONLY on the valid-invite render path (never on cancelled/expired/
 * revoked error states) so OPENED reflects a genuine, actionable view. The
 * server endpoint is idempotent and only advances pre-open states, so a repeat
 * mount or a StrictMode double-invoke is harmless. Renders nothing.
 */
export function MarkOpenedBeacon({ token }: MarkOpenedBeaconProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void fetch("/api/invites/opened", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      keepalive: true,
    }).catch(() => {
      // Best-effort: "Opened" is a soft signal. A failed beacon just leaves the
      // invite in its prior state until the guest RSVPs.
    });
  }, [token]);

  return null;
}
