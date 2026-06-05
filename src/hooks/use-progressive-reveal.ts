"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

/**
 * Progressive image reveal for grid-like sections (scrapbook / grid / masonry).
 *
 * Image-heavy grids that mount every image at once overwhelm mobile browsers:
 * all the (already-lazy) `next/image` nodes become near-viewport together and
 * fire a burst of requests against a bounded connection pool + the Supabase
 * render endpoint, which can leave the section stalled or blank until a refresh.
 *
 * The fix is a per-viewport image budget: render a small initial batch, then let
 * the guest reveal more on demand. Desktop is intentionally uncapped (initial =
 * REVEAL_ALL), so large viewports render exactly as before — no behaviour change.
 *
 * The breakpoint is read via `useSyncExternalStore` (the house pattern — see
 * `use-reduced-motion.ts`, `WeddingStorybook/useLayoutMode.ts`): SSR-safe with no
 * hydration mismatch and no `set-state-in-effect` lint violation. The server
 * snapshot is `mobile` because SSR can't know the viewport and mobile is the
 * at-risk case — so the initial HTML never ships the full grid.
 */

export type ViewportBucket = "mobile" | "tablet" | "desktop";

export type RevealCounts = {
  mobile: number;
  tablet: number;
  desktop: number;
};

export type ProgressiveRevealConfig = {
  /** First batch rendered per viewport. Use REVEAL_ALL to render everything. */
  initial: RevealCounts;
  /** Items added each time the guest reveals more. */
  batch: RevealCounts;
};

export type ProgressiveReveal = {
  /** How many items to render right now (always finite, clamped to total). */
  visibleCount: number;
  /** True when items remain hidden (always false on desktop). */
  hasMore: boolean;
  /** How many items are still hidden. */
  remaining: number;
  /** Reveal the next batch for the current viewport. */
  revealMore: () => void;
};

/** Sentinel for "no budget" — desktop renders the whole grid. */
export const REVEAL_ALL = Number.POSITIVE_INFINITY;

const MOBILE_QUERY = "(max-width: 767px)";
const TABLET_QUERY = "(min-width: 768px) and (max-width: 1023px)";

// Shared, module-level matchMedia subscription (mirrors useLayoutMode) so every
// consumer reuses one pair of MediaQueryList listeners.
const listeners = new Set<() => void>();
let mobileMql: MediaQueryList | null = null;
let tabletMql: MediaQueryList | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function ensureMediaQueryLists() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }
  if (!mobileMql) {
    mobileMql = window.matchMedia(MOBILE_QUERY);
    mobileMql.addEventListener("change", notify);
  }
  if (!tabletMql) {
    tabletMql = window.matchMedia(TABLET_QUERY);
    tabletMql.addEventListener("change", notify);
  }
}

function subscribeBucket(callback: () => void): () => void {
  listeners.add(callback);
  ensureMediaQueryLists();
  return () => {
    listeners.delete(callback);
  };
}

function readBucket(): ViewportBucket {
  // SSR uses getServerBucket(); this is the client path. If matchMedia is
  // unavailable (very old browsers, non-DOM envs) we can't detect the viewport,
  // so render everything rather than hide content behind a budget that no
  // resize event could ever correct.
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "desktop";
  }
  ensureMediaQueryLists();
  if (mobileMql?.matches) return "mobile";
  if (tabletMql?.matches) return "tablet";
  return "desktop";
}

function getServerBucket(): ViewportBucket {
  return "mobile";
}

/**
 * Current viewport bucket. Server + first client render report `mobile` (the
 * mobile-safe default); the real value resolves immediately after hydration.
 */
export function useViewportBucket(): ViewportBucket {
  return useSyncExternalStore(subscribeBucket, readBucket, getServerBucket);
}

/**
 * Pure count math, extracted for unit testing.
 *
 * `rawCount` is the user's accumulated reveal state (0 = "use the floor").
 * The visible count is the larger of the accumulated reveals and the current
 * viewport's initial budget — so a resize that widens the viewport expands the
 * grid and never shrinks it — clamped to the number of items that actually exist.
 */
export function resolveVisibleCount(
  rawCount: number,
  bucketInitial: number,
  total: number,
): number {
  return Math.min(total, Math.max(rawCount, bucketInitial));
}

/** Sensible default for image grids (couple gallery, masonry, scrapbook). */
export const GALLERY_REVEAL: ProgressiveRevealConfig = {
  initial: { mobile: 4, tablet: 12, desktop: REVEAL_ALL },
  batch: { mobile: 4, tablet: 12, desktop: 0 },
};

/** Sensible default for wedding-party member grids. */
export const PARTY_REVEAL: ProgressiveRevealConfig = {
  initial: { mobile: 4, tablet: 12, desktop: REVEAL_ALL },
  batch: { mobile: 4, tablet: 12, desktop: 0 },
};

/**
 * Full wishes page: the ripped-paper cards are paint-heavy, so cap them on
 * MOBILE only and reveal more on tap; tablet/desktop render the whole wall
 * unchanged (REVEAL_ALL).
 */
export const WISHES_REVEAL: ProgressiveRevealConfig = {
  initial: { mobile: 6, tablet: REVEAL_ALL, desktop: REVEAL_ALL },
  batch: { mobile: 6, tablet: 0, desktop: 0 },
};

/**
 * Returns the current image budget for a grid plus a `revealMore` action.
 *
 * @example
 * const { visibleCount, hasMore, remaining, revealMore } =
 *   useProgressiveReveal(items.length, GALLERY_REVEAL);
 * const visible = items.slice(0, visibleCount);
 */
export function useProgressiveReveal(
  total: number,
  config: ProgressiveRevealConfig,
): ProgressiveReveal {
  const bucket = useViewportBucket();
  const bucketInitial = config.initial[bucket];
  const bucketBatch = config.batch[bucket];

  // 0 means "no extra reveals yet"; the floor comes from the viewport's initial.
  const [rawCount, setRawCount] = useState(0);

  const visibleCount = resolveVisibleCount(rawCount, bucketInitial, total);

  const revealMore = useCallback(() => {
    setRawCount((prev) =>
      Math.min(total, resolveVisibleCount(prev, bucketInitial, total) + bucketBatch),
    );
  }, [bucketInitial, bucketBatch, total]);

  return {
    visibleCount,
    hasMore: visibleCount < total,
    remaining: Math.max(0, total - visibleCount),
    revealMore,
  };
}
