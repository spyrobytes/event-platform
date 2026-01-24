"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { AnimationLevel } from "@/components/templates/wedding/variants/types";

/**
 * Animation context value
 */
type AnimationContextValue = {
  /** Animation intensity level from variant/template config */
  animationLevel: AnimationLevel;
  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Effective animation level (respects reduced motion) */
  effectiveAnimationLevel: AnimationLevel;
  /** Base delay between section reveals in ms */
  staggerDelay: number;
  /** Get delay for a section based on its index */
  getSectionDelay: (index: number) => number;
};

const AnimationContext = createContext<AnimationContextValue | null>(null);

type AnimationProviderProps = {
  children: ReactNode;
  /** Animation intensity level */
  animationLevel?: AnimationLevel;
  /** Base delay between section reveals in ms (default: 100) */
  staggerDelay?: number;
  /** Whether to enable staggered reveals (default: true) */
  enableStagger?: boolean;
};

/**
 * Provider for animation settings within a template
 *
 * Wraps template content to provide consistent animation configuration
 * to all AnimatedSection components.
 *
 * @example
 * ```tsx
 * <AnimationProvider animationLevel={variant.animations}>
 *   <HeroSection />
 *   <AnimatedSection id="details">...</AnimatedSection>
 *   <AnimatedSection id="schedule">...</AnimatedSection>
 * </AnimationProvider>
 * ```
 */
export function AnimationProvider({
  children,
  animationLevel = "subtle",
  staggerDelay = 100,
  enableStagger = true,
}: AnimationProviderProps) {
  // Check for reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Subscribe to reduced motion preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Calculate effective animation level
  const effectiveAnimationLevel: AnimationLevel = useMemo(() => {
    if (prefersReducedMotion) return "none";
    return animationLevel;
  }, [prefersReducedMotion, animationLevel]);

  // Function to get stagger delay for a section
  const getSectionDelay = useCallback(
    (index: number) => {
      if (!enableStagger || effectiveAnimationLevel === "none") {
        return 0;
      }
      return index * staggerDelay;
    },
    [enableStagger, staggerDelay, effectiveAnimationLevel]
  );

  const value = useMemo(
    () => ({
      animationLevel,
      prefersReducedMotion,
      effectiveAnimationLevel,
      staggerDelay: enableStagger ? staggerDelay : 0,
      getSectionDelay,
    }),
    [animationLevel, prefersReducedMotion, effectiveAnimationLevel, staggerDelay, enableStagger, getSectionDelay]
  );

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

/**
 * Hook to access animation settings from context
 *
 * Returns default values if used outside AnimationProvider
 */
export function useAnimation(): AnimationContextValue {
  const context = useContext(AnimationContext);

  // Return default values if no provider (graceful fallback)
  if (!context) {
    return {
      animationLevel: "subtle",
      prefersReducedMotion: false,
      effectiveAnimationLevel: "subtle",
      staggerDelay: 0,
      getSectionDelay: () => 0,
    };
  }

  return context;
}

/**
 * Hook to check if we're inside an AnimationProvider
 */
export function useHasAnimationProvider(): boolean {
  const context = useContext(AnimationContext);
  return context !== null;
}
