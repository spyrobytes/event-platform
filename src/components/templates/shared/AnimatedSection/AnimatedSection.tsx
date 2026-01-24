"use client";

import { useRef, useState, useEffect, useCallback, useMemo, useContext } from "react";
import { cn } from "@/lib/utils";
import { useIntersectionObserver } from "@/hooks/use-section-visibility";
import { useAnimation } from "../AnimationContext";
import { useSectionNavRef, useHasSectionNav } from "../SectionNav";
import type { AnimationLevel } from "@/components/templates/wedding/variants/types";
import styles from "./animations.module.css";

type AnimatedSectionProps = {
  children: React.ReactNode;
  /** Unique section ID for navigation and tracking */
  id?: string;
  /** Section label for navigation display */
  label?: string;
  /** Animation intensity level (overrides context if provided) */
  animationLevel?: AnimationLevel;
  /** Additional CSS classes */
  className?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Whether to only animate once (default: true) */
  triggerOnce?: boolean;
  /** Whether to stagger children animations */
  staggerChildren?: boolean;
  /** Intersection threshold for triggering animation (default: 0.15) */
  threshold?: number;
  /** Delay before animation starts in ms (overrides context stagger if provided) */
  delay?: number;
  /** Section index for automatic stagger delay calculation */
  sectionIndex?: number;
  /** Custom inline styles */
  style?: React.CSSProperties;
};

/**
 * Hook to handle delayed visibility with proper state management
 *
 * For delay === 0, no timer is needed - visibility is immediate.
 * For delay > 0, a timer is started after trigger, and delayCompleted is set when it fires.
 *
 * Note: delay is expected to be stable for the component's lifecycle (calculated from sectionIndex).
 */
function useDelayedVisibility(
  isTriggered: boolean,
  delay: number,
  animationLevel: AnimationLevel
) {
  // Only need state for delays > 0
  const [delayCompleted, setDelayCompleted] = useState(false);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedDelayRef = useRef(false);

  // Handle delay timer - only for delay > 0
  useEffect(() => {
    // Skip if no delay or animation disabled
    if (delay === 0 || animationLevel === "none") {
      return;
    }

    // Start delay timer when triggered (only once)
    if (isTriggered && !hasStartedDelayRef.current) {
      hasStartedDelayRef.current = true;
      delayTimeoutRef.current = setTimeout(() => {
        setDelayCompleted(true);
      }, delay);
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [delay, isTriggered, animationLevel]);

  // Derive final visibility
  // For delay === 0, we don't use delayCompleted at all
  const shouldShow = useMemo(() => {
    if (animationLevel === "none") return true;
    if (delay === 0) return isTriggered;
    return isTriggered && delayCompleted;
  }, [animationLevel, delay, isTriggered, delayCompleted]);

  return shouldShow;
}

/**
 * AnimatedSection - Wrapper for template sections with scroll-triggered animations
 *
 * Provides subtle fade-in animations as sections enter the viewport.
 * Respects user's reduced motion preferences and variant animation settings.
 *
 * Can be used standalone with explicit props, or within an AnimationProvider
 * to automatically inherit animation settings.
 *
 * @example
 * ```tsx
 * // Standalone usage
 * <AnimatedSection id="details" animationLevel="subtle">
 *   <DetailsContent />
 * </AnimatedSection>
 *
 * // With AnimationProvider (preferred in templates)
 * <AnimationProvider animationLevel="subtle">
 *   <AnimatedSection id="details" sectionIndex={0}>
 *     <DetailsContent />
 *   </AnimatedSection>
 *   <AnimatedSection id="schedule" sectionIndex={1}>
 *     <ScheduleContent />
 *   </AnimatedSection>
 * </AnimationProvider>
 * ```
 */
export function AnimatedSection({
  children,
  id,
  label,
  animationLevel: propAnimationLevel,
  className,
  ariaLabel,
  triggerOnce = true,
  staggerChildren = false,
  threshold = 0.15,
  delay: propDelay,
  sectionIndex,
  style,
}: AnimatedSectionProps) {
  // Get animation settings from context (or defaults if no provider)
  const { effectiveAnimationLevel, getSectionDelay } = useAnimation();

  // Use prop values if provided, otherwise fall back to context
  const animationLevel = propAnimationLevel ?? effectiveAnimationLevel;

  // Calculate delay: explicit prop takes precedence, then stagger from context
  const delay = useMemo(() => {
    if (propDelay !== undefined) return propDelay;
    if (sectionIndex !== undefined) return getSectionDelay(sectionIndex);
    return 0;
  }, [propDelay, sectionIndex, getSectionDelay]);

  // Use standalone intersection observer
  const { ref, hasBeenVisible, isVisible } = useIntersectionObserver({
    threshold,
    triggerOnce,
    enabled: animationLevel !== "none",
  });

  // Determine the relevant visibility flag based on triggerOnce mode
  const isTriggered = triggerOnce ? hasBeenVisible : isVisible;

  // Use delayed visibility hook
  const shouldShow = useDelayedVisibility(isTriggered, delay, animationLevel);

  // Build animation class based on level
  const animationClass = useMemo(
    () =>
      ({
        none: styles.animateNone,
        subtle: styles.animateSubtle,
        moderate: styles.animateModerate,
      })[animationLevel],
    [animationLevel]
  );

  // Ref callback to attach observer
  const combinedRef = useCallback(
    (element: HTMLElement | null) => {
      ref(element);
    },
    [ref]
  );

  return (
    <section
      ref={combinedRef}
      id={id}
      aria-label={ariaLabel || label}
      data-section-id={id}
      data-section-label={label}
      className={cn(
        "py-12 md:py-16",
        styles.section,
        animationClass,
        shouldShow ? styles.visible : styles.hidden,
        staggerChildren && styles.staggerChildren,
        className
      )}
      style={style}
    >
      <div className="container mx-auto px-4">{children}</div>
    </section>
  );
}

/**
 * AnimatedSectionTitle - Consistent section title styling
 * Matches SectionTitle from SectionWrapper but works within AnimatedSection
 */
type AnimatedSectionTitleProps = {
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
};

export function AnimatedSectionTitle({
  children,
  className,
  as: Tag = "h2",
}: AnimatedSectionTitleProps) {
  return (
    <Tag
      className={cn(
        "mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * AnimatedWrapper - Lightweight animation wrapper without container
 *
 * Use this to wrap existing section components that already have their own
 * SectionWrapper. Only adds animation behavior, no layout changes.
 *
 * Optionally registers with SectionNav when navId and navLabel are provided
 * and the component is inside a SectionNavProvider.
 *
 * @example
 * ```tsx
 * <AnimatedWrapper sectionIndex={0} navId="details" navLabel="Details">
 *   <DetailsSection data={data} />
 * </AnimatedWrapper>
 * ```
 */
type AnimatedWrapperProps = {
  children: React.ReactNode;
  /** Animation intensity level (overrides context if provided) */
  animationLevel?: AnimationLevel;
  /** Section index for automatic stagger delay calculation */
  sectionIndex?: number;
  /** Delay before animation starts in ms */
  delay?: number;
  /** Intersection threshold for triggering animation (default: 0.15) */
  threshold?: number;
  /** Additional CSS classes */
  className?: string;
  /** Section ID for navigation (registers with SectionNav if provided) */
  navId?: string;
  /** Section label for navigation display */
  navLabel?: string;
  /** Chapter ID for navigation grouping */
  navChapterId?: string;
};

export function AnimatedWrapper({
  children,
  animationLevel: propAnimationLevel,
  sectionIndex,
  delay: propDelay,
  threshold = 0.15,
  className,
  navId,
  navLabel,
  navChapterId,
}: AnimatedWrapperProps) {
  // Get animation settings from context (or defaults if no provider)
  const { effectiveAnimationLevel, getSectionDelay } = useAnimation();

  // Check if inside SectionNavProvider
  const hasSectionNav = useHasSectionNav();

  // Use prop values if provided, otherwise fall back to context
  const animationLevel = propAnimationLevel ?? effectiveAnimationLevel;

  // Calculate delay: explicit prop takes precedence, then stagger from context
  const delay = useMemo(() => {
    if (propDelay !== undefined) return propDelay;
    if (sectionIndex !== undefined) return getSectionDelay(sectionIndex);
    return 0;
  }, [propDelay, sectionIndex, getSectionDelay]);

  // Use standalone intersection observer
  const { ref: observerRef, hasBeenVisible } = useIntersectionObserver({
    threshold,
    triggerOnce: true,
    enabled: animationLevel !== "none",
  });

  // Section nav registration (only when navId and navLabel are provided)
  const shouldRegisterNav = hasSectionNav && navId && navLabel;
  const sectionNavRef = useSectionNavRef(
    shouldRegisterNav ? navId : "",
    shouldRegisterNav ? navLabel : "",
    shouldRegisterNav ? navChapterId : undefined
  );

  // Combined ref callback
  const combinedRef = useCallback(
    (element: HTMLElement | null) => {
      observerRef(element);
      if (shouldRegisterNav) {
        sectionNavRef(element);
      }
    },
    [observerRef, sectionNavRef, shouldRegisterNav]
  );

  // Use delayed visibility hook
  const shouldShow = useDelayedVisibility(hasBeenVisible, delay, animationLevel);

  // Build animation class based on level
  const animationClass = useMemo(
    () =>
      ({
        none: styles.animateNone,
        subtle: styles.animateSubtle,
        moderate: styles.animateModerate,
      })[animationLevel],
    [animationLevel]
  );

  return (
    <div
      ref={combinedRef}
      className={cn(
        styles.section,
        animationClass,
        shouldShow ? styles.visible : styles.hidden,
        className
      )}
    >
      {children}
    </div>
  );
}
