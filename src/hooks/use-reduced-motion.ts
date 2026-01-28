"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to reduced motion preference changes
 */
function subscribeToReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);

  return () => {
    mediaQuery.removeEventListener("change", callback);
  };
}

/**
 * Get current reduced motion preference
 */
function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Server snapshot always returns false
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook for detecting user's reduced motion preference.
 *
 * Respects the `prefers-reduced-motion` media query and updates
 * reactively when the user changes their system preference.
 *
 * @returns `true` if user prefers reduced motion, `false` otherwise
 *
 * @example
 * ```tsx
 * const reducedMotion = useReducedMotion();
 *
 * return (
 *   <div className={reducedMotion ? 'no-animate' : 'animate'}>
 *     Content
 *   </div>
 * );
 * ```
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerSnapshot
  );
}

/**
 * Server-safe check for reduced motion preference.
 * Returns false on server, actual preference on client.
 *
 * Useful for initial render decisions where useState can't be used.
 */
export function getReducedMotionPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
