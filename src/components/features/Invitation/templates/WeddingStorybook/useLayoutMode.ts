import { useSyncExternalStore } from "react";

export type LayoutMode = "spread" | "single";

/**
 * Media query that separates portrait/narrow viewports (single-page mode)
 * from landscape/wide viewports (two-page spread mode). Combines an aspect-
 * ratio test with a width ceiling so a desktop user with a narrow-but-
 * landscape window (e.g. 1200×1000) stays in spread mode — only true
 * portrait-ish devices cross both thresholds.
 */
export const LAYOUT_MODE_QUERY =
  "(max-aspect-ratio: 4/3) and (max-width: 1024px)";

const listeners = new Set<() => void>();
let mql: MediaQueryList | null = null;

function getMediaQueryList(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  if (!mql) {
    mql = window.matchMedia(LAYOUT_MODE_QUERY);
    mql.addEventListener("change", notify);
  }
  return mql;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  getMediaQueryList();
  return () => {
    listeners.delete(callback);
  };
}

function readMode(): LayoutMode {
  const list = getMediaQueryList();
  if (!list) return "spread";
  return list.matches ? "single" : "spread";
}

/**
 * Returns the active layout mode for `WeddingStorybook`. Layout geometry
 * itself is driven by CSS media queries — this hook owns only the JS-side
 * state that CSS can't express (nav step size, active page index, ARIA
 * labels, animation class on the sliding page).
 *
 * Because layout is CSS-driven, there is no visible hydration flash: the
 * server renders spread markup, CSS switches to single-page geometry on
 * portrait viewports pre-hydration, and the hook's post-hydration value
 * only affects JS-owned behaviour. Do not re-litigate this; any future
 * addition that gates layout on the hook value must reconsider SSR.
 */
export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(
    subscribe,
    readMode,
    () => "spread",
  );
}
