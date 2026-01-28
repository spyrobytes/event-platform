"use client";

import { useEffect, useRef, useCallback, type RefObject } from "react";
import type { InvitationState } from "./use-invitation-state";

/**
 * Configuration for animation completion detection
 */
type UseAnimationCompleteOptions = {
  /** Animation states that should trigger completion detection */
  activeStates?: InvitationState[];
  /** Fallback timeout in ms if transitionend never fires (default: 1000) */
  fallbackTimeout?: number;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
};

const DEFAULT_ACTIVE_STATES: InvitationState[] = ["opening", "closing"];
const DEFAULT_FALLBACK_TIMEOUT = 1000;

/**
 * Hook for detecting when CSS transitions/animations complete.
 *
 * Uses `transitionend` and `animationend` events with a fallback timeout
 * to ensure the callback is always invoked, even if events don't fire.
 *
 * @param ref - Ref to the animating element
 * @param state - Current animation state
 * @param onComplete - Callback when animation completes
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const envelopeRef = useRef<HTMLDivElement>(null);
 * const { state, complete } = useInvitationState();
 *
 * useAnimationComplete(envelopeRef, state, complete);
 *
 * return <div ref={envelopeRef} className={state} />;
 * ```
 */
export function useAnimationComplete(
  ref: RefObject<HTMLElement | null>,
  state: InvitationState,
  onComplete: () => void,
  options: UseAnimationCompleteOptions = {}
): void {
  const {
    activeStates = DEFAULT_ACTIVE_STATES,
    fallbackTimeout = DEFAULT_FALLBACK_TIMEOUT,
    enabled = true,
  } = options;

  // Track if completion has been called to prevent double-firing
  const completedRef = useRef(false);
  // Store timeout ID for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle completion (ensures single invocation)
  const handleComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    // Clear fallback timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const element = ref.current;
    const isActiveState = activeStates.includes(state);

    // Reset completion flag when state changes
    completedRef.current = false;

    // Clear any existing timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Only listen when enabled and in an active animation state
    if (!enabled || !element || !isActiveState) {
      return;
    }

    // Listen for transition/animation end events
    const handleTransitionEnd = (e: TransitionEvent) => {
      // Only respond to events from the target element, not children
      if (e.target === element) {
        handleComplete();
      }
    };

    const handleAnimationEnd = (e: AnimationEvent) => {
      if (e.target === element) {
        handleComplete();
      }
    };

    element.addEventListener("transitionend", handleTransitionEnd);
    element.addEventListener("animationend", handleAnimationEnd);

    // Fallback timeout in case events don't fire
    // (e.g., transition property not set, zero duration, etc.)
    timeoutRef.current = setTimeout(handleComplete, fallbackTimeout);

    return () => {
      element.removeEventListener("transitionend", handleTransitionEnd);
      element.removeEventListener("animationend", handleAnimationEnd);

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [ref, state, activeStates, fallbackTimeout, enabled, handleComplete]);
}
