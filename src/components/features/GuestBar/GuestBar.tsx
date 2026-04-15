"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

type GuestBarProps = {
  guestName: string;
  eventSlug?: string;
  className?: string;
};

/**
 * Welcome bar shown at the top of the event page for authenticated guests.
 * Explains the token's multiple roles (RSVP, gift claims, future guest
 * features) and offers a one-click Copy Link so they can save it elsewhere.
 * The "save link" hint is dismissible per event; dismissal persists in
 * localStorage so returning guests aren't nagged.
 */
export function GuestBar({ guestName, eventSlug, className }: GuestBarProps) {
  const dismissKey = eventSlug ? `guestbar-hint-dismissed:${eventSlug}` : null;

  const [hintDismissed, setHintDismissed] = useState(() => {
    if (typeof window === "undefined" || !dismissKey) return false;
    return window.localStorage.getItem(dismissKey) === "1";
  });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    if (typeof window !== "undefined" && dismissKey) {
      window.localStorage.setItem(dismissKey, "1");
    }
  }, [dismissKey]);

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, []);

  return (
    <div
      className={cn(
        "w-full border-b border-primary/10 bg-primary/5 text-primary/80",
        className
      )}
    >
      <div className="px-4 py-2 text-center text-sm">
        Welcome, <span className="font-medium">{guestName}</span> — you have
        access to exclusive event details
      </div>
      {!hintDismissed && (
        <div className="flex flex-col items-center gap-2 border-t border-primary/10 px-4 py-2 text-xs sm:flex-row sm:justify-center">
          <span className="text-center sm:text-left">
            <strong>Save this link</strong> — it&apos;s how you RSVP, claim
            gifts from the registry, and revisit this page.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md border border-primary/20 bg-background px-2.5 py-1 font-medium text-primary hover:border-primary/40"
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "error"
                ? "Try again"
                : "Copy link"}
            </button>
            <button
              type="button"
              onClick={dismissHint}
              aria-label="Dismiss hint"
              className="rounded-md px-1.5 py-1 text-primary/60 hover:text-primary"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
