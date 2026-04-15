"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

type GuestBarProps = {
  guestName: string;
  /** Accepted for API stability with callers; no longer used for persistence. */
  eventSlug?: string;
  className?: string;
};

/**
 * Floating pill shown to authenticated guests. Explains the token's role
 * (RSVP, gift claims, future guest features) and offers a one-click Copy
 * Link so they can save it elsewhere. Anchored bottom-right on desktop,
 * bottom-full-width on mobile, with z-index above every template's topbar
 * so it works uniformly across V1/V2/V3.
 *
 * Dismissal is intentionally per-page-load (not persisted). Rationale:
 * (a) persistence caused an SSR/CSR hydration flash — server rendered the
 * pill, then the client checked localStorage and hid it. (b) A guest who
 * returns a week later is exactly when "save this link" is most useful,
 * so a permanent dismissal would work against us. Guests can still × the
 * pill out of the way during a session; it returns on the next page load.
 */
export function GuestBar({ guestName, className }: GuestBarProps) {
  const [dismissed, setDismissed] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const dismiss = useCallback(() => setDismissed(true), []);

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

  if (dismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="Guest access info"
      className={cn(
        "fixed bottom-4 left-4 right-4 z-[200] sm:left-auto sm:right-4 sm:max-w-sm",
        "rounded-2xl border border-black/10 bg-white/95 p-4 text-sm text-neutral-800 shadow-lg backdrop-blur",
        "dark:border-white/10 dark:bg-neutral-900/95 dark:text-neutral-100",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="font-medium">
            Hi {guestName} —{" "}
            <span className="font-normal text-neutral-600 dark:text-neutral-400">
              save this link
            </span>
          </p>
          <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            It&apos;s how you RSVP, claim gifts from the registry, and revisit
            this page.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-neutral-600"
            >
              {copyState === "copied"
                ? "Copied"
                : copyState === "error"
                ? "Try again"
                : "Copy link"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded-md px-2 py-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
