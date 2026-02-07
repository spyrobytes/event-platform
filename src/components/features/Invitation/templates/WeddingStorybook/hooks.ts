import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { PAGE_COUNT, PARTICLE_CONFIG, SWIPE_CONFIG } from "./constants";

// ============================================
// useStorybookNav
// ============================================

type UseStorybookNavOptions = {
  defaultPage?: number;
  controlledPage?: number;
  onPageChange?: (page: number) => void;
};

type UseStorybookNavReturn = {
  /** Current page index (0-based) */
  currentPage: number;
  /** Previous page index (for direction detection) */
  previousPage: number;
  /** Navigate to a specific page */
  goToPage: (index: number) => void;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  prevPage: () => void;
  /** Whether we can go forward */
  canGoNext: boolean;
  /** Whether we can go backward */
  canGoPrev: boolean;
  /** Direction of last navigation: 'forward' | 'backward' | null */
  direction: "forward" | "backward" | null;
};

/**
 * Manages page navigation state for the storybook.
 * Supports both controlled and uncontrolled modes.
 *
 * FIX: `direction` now auto-clears after the flip animation
 * completes (1200ms). This ensures the z-index boost from
 * `data-flip-index="top"` is temporary, allowing the static
 * left page to render above settled flipped leaves.
 */
export function useStorybookNav({
  defaultPage = 0,
  controlledPage,
  onPageChange,
}: UseStorybookNavOptions): UseStorybookNavReturn {
  const isControlled = controlledPage !== undefined;

  const [internalPage, setInternalPage] = useState(defaultPage);
  const [previousPage, setPreviousPage] = useState(defaultPage);
  const [direction, setDirection] = useState<"forward" | "backward" | null>(
    null
  );

  const currentPage = isControlled ? controlledPage : internalPage;

  // Auto-clear direction after the flip animation completes.
  // This resets `data-flip-index="top"` so the flipped leaf's
  // z-index drops below the static left page.
  useEffect(() => {
    if (direction === null) return;

    const timeout = setTimeout(() => {
      setDirection(null);
    }, 1200); // matches --sb-flip-duration

    return () => clearTimeout(timeout);
  }, [direction, currentPage]);

  const goToPage = useCallback(
    (index: number) => {
      if (index < 0 || index >= PAGE_COUNT) return;
      if (index === currentPage) return;

      const newDirection = index > currentPage ? "forward" : "backward";

      setPreviousPage(currentPage);
      setDirection(newDirection);

      if (!isControlled) {
        setInternalPage(index);
      }

      onPageChange?.(index);
    },
    [currentPage, isControlled, onPageChange]
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentPage,
    previousPage,
    goToPage,
    nextPage,
    prevPage,
    canGoNext: currentPage < PAGE_COUNT - 1,
    canGoPrev: currentPage > 0,
    direction,
  };
}

// ============================================
// useKeyboardNav
// ============================================

/**
 * Attaches keyboard event listeners for page navigation.
 * Arrow keys, Home, and End navigate between pages.
 */
export function useKeyboardNav(
  goToPage: (index: number) => void,
  currentPage: number
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
        case "Home":
          e.preventDefault();
          goToPage(0);
          break;
        case "End":
          e.preventDefault();
          goToPage(PAGE_COUNT - 1);
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [goToPage, currentPage]);
}

// ============================================
// useSwipeGesture
// ============================================

type UseSwipeGestureOptions = {
  /** Ref to the swipeable element */
  targetRef: RefObject<HTMLDivElement | null>;
  /** Ref to the element that receives tilt feedback */
  tiltRef: RefObject<HTMLDivElement | null>;
  /** Called when a forward (left) swipe is detected */
  onSwipeForward: () => void;
  /** Called when a backward (right) swipe is detected */
  onSwipeBackward: () => void;
  /** Whether to show tilt feedback during swipe */
  enableFeedback?: boolean;
  /** Whether reduced motion is active */
  reducedMotion?: boolean;
};

/**
 * Detects horizontal swipe gestures and applies visual tilt feedback.
 */
export function useSwipeGesture({
  targetRef,
  tiltRef,
  onSwipeForward,
  onSwipeBackward,
  enableFeedback = true,
  reducedMotion = false,
}: UseSwipeGestureOptions) {
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const target = targetRef.current;
    const tiltEl = tiltRef.current;
    if (!target) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.changedTouches[0].screenX,
        y: e.changedTouches[0].screenY,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (reducedMotion || !enableFeedback || !tiltEl) return;

      const touchX = e.changedTouches[0].screenX;
      const touchY = e.changedTouches[0].screenY;
      const diffX = touchStartRef.current.x - touchX;
      const diffY = touchStartRef.current.y - touchY;

      if (
        Math.abs(diffX) > Math.abs(diffY) &&
        Math.abs(diffX) > SWIPE_CONFIG.feedbackThreshold
      ) {
        const tilt = Math.max(
          -SWIPE_CONFIG.maxTiltDeg,
          Math.min(SWIPE_CONFIG.maxTiltDeg, diffX * SWIPE_CONFIG.tiltMultiplier)
        );
        tiltEl.style.transition = "none";
        tiltEl.style.transform = `rotateX(5deg) rotateY(${-tilt}deg)`;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Reset tilt with smooth transition
      if (tiltEl) {
        tiltEl.style.transition = `transform ${SWIPE_CONFIG.resetDurationMs}ms ease`;
        tiltEl.style.transform = "";
        setTimeout(() => {
          if (tiltEl) tiltEl.style.transition = "";
        }, SWIPE_CONFIG.resetDurationMs + 50);
      }

      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const diffX = touchStartRef.current.x - touchEndX;
      const diffY = touchStartRef.current.y - touchEndY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > SWIPE_CONFIG.threshold) {
          onSwipeForward();
        } else if (diffX < -SWIPE_CONFIG.threshold) {
          onSwipeBackward();
        }
      }
    };

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: true });
    target.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
    };
  }, [
    targetRef,
    tiltRef,
    onSwipeForward,
    onSwipeBackward,
    enableFeedback,
    reducedMotion,
  ]);
}

// ============================================
// useParticleBurst
// ============================================

type UseParticleBurstOptions = {
  /** Container element for particles */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Element whose centre determines the spine position */
  bookRef: RefObject<HTMLDivElement | null>;
  /** Whether particles are disabled */
  disabled?: boolean;
  /** Whether reduced motion is active */
  reducedMotion?: boolean;
};

/**
 * Exposes `burst(direction)` that spawns particle elements
 * from the book spine.
 */
export function useParticleBurst({
  containerRef,
  bookRef,
  disabled = false,
  reducedMotion = false,
}: UseParticleBurstOptions) {
  const burst = useCallback(
    (direction: "forward" | "backward") => {
      if (disabled || reducedMotion) return;

      const container = containerRef.current;
      const book = bookRef.current;
      if (!container || !book) return;

      const rect = book.getBoundingClientRect();
      const spineX = rect.left + rect.width / 2;
      const spineY = rect.top + rect.height / 2;

      const {
        count,
        types,
        maxDelayMs,
        spreadAngle,
        forwardBaseAngle,
        backwardBaseAngle,
        minDistance,
        distanceRange,
        spineSpread,
        minScale,
        scaleRange,
        maxRotation,
        upwardBias,
        durationMs,
      } = PARTICLE_CONFIG;

      const baseAngle =
        direction === "forward" ? forwardBaseAngle : backwardBaseAngle;

      for (let i = 0; i < count; i++) {
        const particle = document.createElement("div");
        const type = types[Math.floor(Math.random() * types.length)];

        particle.className = `particle particle-${type} particle-animate`;
        particle.style.left = `${spineX}px`;
        particle.style.top = `${spineY + (Math.random() - 0.5) * spineSpread}px`;

        const angle = baseAngle + Math.random() * spreadAngle;
        const angleRad = (angle * Math.PI) / 180;
        const distance = minDistance + Math.random() * distanceRange;

        const tx = Math.cos(angleRad) * distance;
        const ty = Math.sin(angleRad) * distance - upwardBias;
        const rot = (Math.random() - 0.5) * maxRotation;
        const scale = minScale + Math.random() * scaleRange;

        particle.style.setProperty("--tx", `${tx}px`);
        particle.style.setProperty("--ty", `${ty}px`);
        particle.style.setProperty("--rot", `${rot}deg`);
        particle.style.setProperty("--scale", `${scale}`);
        particle.style.animationDelay = `${Math.random() * maxDelayMs}ms`;

        container.appendChild(particle);

        // Clean up on animation end
        particle.addEventListener("animationend", () => particle.remove(), {
          once: true,
        });
      }

      // Fallback cleanup
      setTimeout(() => {
        container.querySelectorAll(".particle").forEach((p) => p.remove());
      }, durationMs + 500);
    },
    [containerRef, bookRef, disabled, reducedMotion]
  );

  return { burst };
}

// ============================================
// useFlipPerformance
// ============================================

/**
 * Manages `will-change` on page elements during transitions
 * to reduce GPU overhead on idle pages.
 */
export function useFlipPerformance(
  pagesRef: RefObject<HTMLDivElement | null>
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const enablePerformance = useCallback(() => {
    const container = pagesRef.current;
    if (!container) return;

    container
      .querySelectorAll<HTMLElement>("[data-page-leaf]")
      .forEach((el) => {
        el.style.willChange = "transform";
      });

    // Auto-disable after transition completes
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      container
        .querySelectorAll<HTMLElement>("[data-page-leaf]")
        .forEach((el) => {
          el.style.willChange = "";
        });
    }, 1400); // slightly longer than the 1.2s flip transition
  }, [pagesRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return { enablePerformance };
}
