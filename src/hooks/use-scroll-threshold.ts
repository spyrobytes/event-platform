"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("scroll", onStoreChange, { passive: true });
  return () => window.removeEventListener("scroll", onStoreChange);
}

// Hydration renders with this (matching the HTML the server produced with no
// window); React then re-renders with the real client snapshot immediately
// after hydration — no mismatch.
function getServerSnapshot() {
  return false;
}

/**
 * Returns true when window.scrollY >= threshold.
 *
 * Built on useSyncExternalStore so it is hydration-safe for pages that load
 * ALREADY SCROLLED — e.g. a URL with a `#section` fragment jumps the viewport
 * before React hydrates, and any "read scrollY in the first client render"
 * approach (lazy useState initializer) then disagrees with the server HTML
 * and throws a hydration-mismatch error (the Topbar's old `scrolled` state).
 * Same pattern as useReducedMotion.
 */
export function useScrollThreshold(threshold = 24) {
  const getSnapshot = useCallback(
    () => window.scrollY >= threshold,
    [threshold],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
