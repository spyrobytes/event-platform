"use client";

import { useEffect, useRef } from "react";

/**
 * Returns a ref to attach to an element (e.g. a form-level error banner). When
 * `active` becomes truthy — typically a submit-failure message rendered above a
 * long form — the element is scrolled into view so the feedback isn't missed
 * off-screen. Respects `prefers-reduced-motion`, and no-ops on the server and
 * where `scrollIntoView` is unavailable.
 *
 * Reset `active` to a falsy value before each attempt (the RSVP forms already
 * `setError(null)` at submit start) so a repeated failure with the SAME message
 * still re-triggers the scroll.
 */
export function useScrollIntoViewWhen<T extends HTMLElement = HTMLElement>(
  active: unknown,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el?.scrollIntoView) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [active]);

  return ref;
}
