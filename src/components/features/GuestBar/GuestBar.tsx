"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type GuestBarProps = {
  guestName: string;
  /** Scopes the dismissal flag in sessionStorage. */
  eventSlug?: string;
  className?: string;
};

const STORAGE_KEY_PREFIX = "guestbar:dismissed:";

/**
 * Module-level cache of dismissed slugs in this tab. SessionStorage's `storage`
 * event doesn't fire in the same window that wrote it, so we maintain our own
 * subscriber list to notify mounted GuestBar instances when one is dismissed
 * (e.g. dismiss on /e/[slug], navigate to /registry — sibling mount sees it).
 */
const dismissedSlugs = new Set<string>();
const listeners = new Set<() => void>();

function readDismissed(key: string | null): boolean {
  if (!key) return false;
  if (dismissedSlugs.has(key)) return true;
  try {
    if (window.sessionStorage.getItem(key) === "1") {
      dismissedSlugs.add(key);
      return true;
    }
  } catch {
    // sessionStorage unavailable (private mode, blocked storage).
  }
  return false;
}

function markDismissed(key: string | null) {
  if (!key) return;
  dismissedSlugs.add(key);
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // ignore — in-memory dismissal still applies.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Floating pill shown to authenticated guests. Explains the token's role
 * (RSVP, gift claims, future guest features) and offers a one-click Copy
 * Link so they can save it elsewhere. Anchored bottom-right on desktop,
 * bottom-full-width on mobile, with z-index above every template's topbar
 * so it works uniformly across V1/V2/V3.
 *
 * Dismissal is persisted to sessionStorage, scoped per event slug. This
 * survives client-side navigation between sibling routes (e.g. event page
 * → /registry → back) which would otherwise remount the pill and reset
 * its state. SessionStorage clears on tab close, so a guest returning a
 * week later (new tab/session) still sees the "save this link" prompt —
 * which is exactly when it's most useful.
 *
 * To avoid an SSR/CSR hydration flash, dismissed state is read via
 * useSyncExternalStore — its server snapshot is also used for the initial
 * client render, so server and client agree on "not visible yet" until the
 * post-hydration snapshot reveals (or keeps hidden) the bar. A short fade+
 * slide on entry masks the one-frame delay.
 */
export function GuestBar({ guestName, eventSlug, className }: GuestBarProps) {
  const storageKey = eventSlug ? `${STORAGE_KEY_PREFIX}${eventSlug}` : null;

  // useSyncExternalStore handles SSR/hydration cleanly: getServerSnapshot is
  // also used for the initial client render, so server and client agree on
  // "not visible yet" before the post-hydration snapshot reveals the bar.
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(storageKey),
    () => true
  );

  const [entered, setEntered] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  useEffect(() => {
    if (dismissed) return;
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [dismissed]);

  const dismiss = useCallback(() => {
    setEntered(false);
    markDismissed(storageKey);
  }, [storageKey]);

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
        "transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
        entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
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
