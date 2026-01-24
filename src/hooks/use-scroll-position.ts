"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Scroll direction
 */
export type ScrollDirection = "up" | "down" | "none";

/**
 * Return type for useScrollPosition hook
 */
export type ScrollPositionState = {
  /** Current scroll Y position in pixels */
  scrollY: number;
  /** Previous scroll Y position */
  prevScrollY: number;
  /** Current scroll direction */
  direction: ScrollDirection;
  /** Whether user is near the top of the page */
  isNearTop: boolean;
  /** Percentage of page scrolled (0-100) */
  percentScrolled: number;
  /** Whether user has scrolled at all */
  hasScrolled: boolean;
  /** Whether user is near the bottom of the page */
  isNearBottom: boolean;
  /** Total scrollable height */
  scrollHeight: number;
  /** Viewport height */
  viewportHeight: number;
};

type UseScrollPositionOptions = {
  /** Threshold in pixels for "near top" detection (default: 100) */
  nearTopThreshold?: number;
  /** Threshold in pixels for "near bottom" detection (default: 100) */
  nearBottomThreshold?: number;
  /** Minimum scroll delta to register direction change (default: 5) */
  directionThreshold?: number;
  /** Whether to enable scroll tracking (default: true) */
  enabled?: boolean;
};

/**
 * Hook for tracking scroll position and direction
 *
 * Uses requestAnimationFrame for performance-optimized updates.
 * Respects reduced motion preferences by reducing update frequency.
 *
 * @example
 * ```tsx
 * const { scrollY, direction, isNearTop } = useScrollPosition();
 *
 * return (
 *   <nav className={isNearTop ? "transparent" : "solid"}>
 *     {direction === "up" && <BackToTop />}
 *   </nav>
 * );
 * ```
 */
export function useScrollPosition({
  nearTopThreshold = 100,
  nearBottomThreshold = 100,
  directionThreshold = 5,
  enabled = true,
}: UseScrollPositionOptions = {}): ScrollPositionState {
  const [state, setState] = useState<ScrollPositionState>(() => ({
    scrollY: 0,
    prevScrollY: 0,
    direction: "none",
    isNearTop: true,
    percentScrolled: 0,
    hasScrolled: false,
    isNearBottom: false,
    scrollHeight: 0,
    viewportHeight: 0,
  }));

  // Refs for tracking without causing re-renders
  const rafIdRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);
  const ticking = useRef(false);

  const updateScrollPosition = useCallback(() => {
    if (typeof window === "undefined") return;

    const scrollY = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const maxScroll = scrollHeight - viewportHeight;

    const prevScrollY = lastScrollYRef.current;
    const scrollDelta = scrollY - prevScrollY;

    // Determine direction only if delta exceeds threshold
    let direction: ScrollDirection = "none";
    if (Math.abs(scrollDelta) > directionThreshold) {
      direction = scrollDelta > 0 ? "down" : "up";
    }

    const percentScrolled = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;

    setState({
      scrollY,
      prevScrollY,
      direction,
      isNearTop: scrollY <= nearTopThreshold,
      percentScrolled: Math.min(100, Math.max(0, percentScrolled)),
      hasScrolled: scrollY > 0,
      isNearBottom: maxScroll - scrollY <= nearBottomThreshold,
      scrollHeight,
      viewportHeight,
    });

    lastScrollYRef.current = scrollY;
    ticking.current = false;
  }, [nearTopThreshold, nearBottomThreshold, directionThreshold]);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      rafIdRef.current = requestAnimationFrame(updateScrollPosition);
      ticking.current = true;
    }
  }, [updateScrollPosition]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    // Initialize with current scroll position
    updateScrollPosition();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollPosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollPosition);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, handleScroll, updateScrollPosition]);

  return state;
}

/**
 * Lightweight hook that only tracks if user has scrolled past a threshold
 * Useful for simple show/hide behaviors without full scroll tracking overhead
 */
export function useHasScrolledPast(threshold: number = 100): boolean {
  const [hasScrolledPast, setHasScrolledPast] = useState(false);
  const rafIdRef = useRef<number | null>(null);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkScroll = () => {
      setHasScrolledPast(window.scrollY > threshold);
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        rafIdRef.current = requestAnimationFrame(checkScroll);
        ticking.current = true;
      }
    };

    // Initial check
    checkScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [threshold]);

  return hasScrolledPast;
}
