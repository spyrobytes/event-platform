"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  HTMLAttributes,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";

/**
 * Pointer-driven swipe / drag navigation for lightboxes (and any prev/next
 * surface). One code path covers mouse, touch, and pen via Pointer Events; the
 * drag hot path writes `transform` straight to the DOM (no React re-render per
 * move). See docs/pending-features/gallery-swipe-navigation-implementation-plan.md.
 *
 * Consumers attach `contentRef` to the element that should translate, spread
 * `handlers` on that same element, and read `didDragRef` in their backdrop
 * close handler so a drag that ends over the backdrop doesn't also close.
 *
 * GPU note: set `will-change: transform` on the content element while the
 * surface is open so its compositor layer is resident BEFORE the first drag —
 * otherwise the first drag can jank promoting the layer mid-gesture (the same
 * first-interaction layer-materialization class fixed on the flip cards in
 * #238/#239).
 */

// --- Tunables -------------------------------------------------------------

const AXIS_LOCK_PX = 8; // movement before we decide horizontal vs vertical
const DID_DRAG_PX = 6; // movement before a press counts as a drag (not a tap)
const STALE_VELOCITY_MS = 100; // a pause longer than this before release = no flick
const OPACITY_FALLOFF = 0.35; // how much the card fades at a full-width drag
const COMMIT_MS = 180; // "slide a touch farther out" duration
const SNAP_MS = 220; // spring-back duration
const TRANSITION_FALLBACK_BUFFER_MS = 80; // safety margin if transitionend never fires

const COMMIT_TRANSITION = `transform ${COMMIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${COMMIT_MS}ms ease`;
const SNAP_TRANSITION = `transform ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SNAP_MS}ms ease`;

// --- Pure helpers (unit-tested) ------------------------------------------

/**
 * Decide the gesture axis once movement clears `lockPx`. Returns "none" while
 * the movement is still within the dead zone so the caller keeps waiting.
 */
export function lockAxis(
  dx: number,
  dy: number,
  lockPx = AXIS_LOCK_PX,
): "horizontal" | "vertical" | "none" {
  if (Math.hypot(dx, dy) < lockPx) return "none";
  return Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
}

export type ResolveSwipeInput = {
  /** Signed horizontal travel of the gesture (px). */
  dx: number;
  /** Reference width the distance threshold scales against (px). */
  width: number;
  /** Signed last-segment velocity (px/ms). */
  velocity: number;
  minPx?: number;
  fraction?: number;
  velocityPxPerMs?: number;
};

/**
 * Resolve a finished gesture to a navigation direction. Commits on EITHER a
 * deliberate distance (≥ max(minPx, width·fraction)) OR a fast flick
 * (|velocity| ≥ velocityPxPerMs), so a short quick flick still navigates.
 * Direction comes from `dx`, tie-broken by `velocity` when `dx` is ~0.
 */
export function resolveSwipe({
  dx,
  width,
  velocity,
  minPx = 50,
  fraction = 0.18,
  velocityPxPerMs = 0.45,
}: ResolveSwipeInput): "prev" | "next" | "none" {
  const safeWidth = Math.max(width, 1);
  const distanceThreshold = Math.max(minPx, safeWidth * fraction);
  const distancePassed = Math.abs(dx) >= distanceThreshold;
  const velocityPassed = Math.abs(velocity) >= velocityPxPerMs;
  if (!distancePassed && !velocityPassed) return "none";
  // Dragging RIGHT (dx > 0) reveals the PREVIOUS item; LEFT reveals NEXT.
  const dir = dx !== 0 ? dx : velocity;
  return dir > 0 ? "prev" : "next";
}

// --- Hook -----------------------------------------------------------------

export type UseSwipeNavigationOptions = {
  onPrev: () => void;
  onNext: () => void;
  /** Gate the whole gesture (e.g. false for a single-item gallery). */
  enabled: boolean;
  /** When true, skip the live translate and commit instantly on threshold. */
  reducedMotion: boolean;
  /** Wrapping galleries have no edges. Defaults to true. */
  wrap?: boolean;
  /** For future bounded galleries (ignored while `wrap`). */
  canPrev?: boolean;
  canNext?: boolean;
  minSwipePx?: number;
  swipeFraction?: number;
  velocityPxPerMs?: number;
};

export type SwipeHandlers<T extends HTMLElement = HTMLDivElement> = Pick<
  HTMLAttributes<T>,
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "onLostPointerCapture"
>;

export type UseSwipeNavigationResult<T extends HTMLElement = HTMLDivElement> = {
  contentRef: RefObject<T | null>;
  handlers: SwipeHandlers<T>;
  isDragging: boolean;
  didDragRef: RefObject<boolean>;
};

type SwipePhase = "idle" | "dragging" | "snapping-back" | "committing";

export function useSwipeNavigation<T extends HTMLElement = HTMLDivElement>(
  options: UseSwipeNavigationOptions,
): UseSwipeNavigationResult<T> {
  const contentRef = useRef<T | null>(null);

  // Latest options kept in a ref so the pointer handlers stay stable and never
  // read a stale closure. Updated in an effect (never mutated during render).
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });

  // --- Gesture state (refs → no re-render during a move) ---
  const phaseRef = useRef<SwipePhase>("idle");
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisRef = useRef<"none" | "horizontal" | "vertical">("none");
  const widthRef = useRef(1);
  const dxRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);
  const pendingDirRef = useRef<"prev" | "next" | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didDragRef = useRef(false);

  // Only React state in the hook — toggled twice per gesture (down / settle),
  // never per move.
  const [isDragging, setIsDragging] = useState(false);

  // --- DOM write helpers (imperative; bypass React during the drag) ---
  const applyTransform = useCallback((x: number) => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, 0, 0)`;
    const frac = Math.min(Math.abs(x) / Math.max(widthRef.current, 1), 1);
    el.style.opacity = String(1 - frac * OPACITY_FALLOFF);
  }, []);

  const resetStylesImmediate = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = "translate3d(0, 0, 0)";
    el.style.opacity = "1";
  }, []);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // Finalize whichever transition (snap-back or commit) is in flight. Driven by
  // `transitionend` with a fallback timer in case it never fires.
  const finishActiveTransition = useCallback(() => {
    clearFallback();
    const phase = phaseRef.current;
    if (phase === "committing") {
      const dir = pendingDirRef.current;
      pendingDirRef.current = null;
      // Swap the item FIRST (same element, new src), then snap back to center
      // so the incoming photo appears centered rather than sliding from nowhere.
      if (dir === "prev") optsRef.current.onPrev();
      else if (dir === "next") optsRef.current.onNext();
      resetStylesImmediate();
      phaseRef.current = "idle";
    } else if (phase === "snapping-back") {
      resetStylesImmediate();
      phaseRef.current = "idle";
    }
  }, [clearFallback, resetStylesImmediate]);

  const armFallback = useCallback(
    (ms: number) => {
      clearFallback();
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        finishActiveTransition();
      }, ms + TRANSITION_FALLBACK_BUFFER_MS);
    },
    [clearFallback, finishActiveTransition],
  );

  const endGesture = useCallback(() => {
    pointerIdRef.current = null;
    axisRef.current = "none";
    setIsDragging(false);
  }, []);

  // --- Pointer handlers ---
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<T>) => {
      const opts = optsRef.current;
      if (!opts.enabled) return;
      if (!e.isPrimary || e.button !== 0) return; // primary pointer / left button
      if (pointerIdRef.current !== null) return; // a pointer is already active
      if (phaseRef.current !== "idle") return; // mid snap-back / commit

      pointerIdRef.current = e.pointerId;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      lastXRef.current = e.clientX;
      lastTRef.current = e.timeStamp;
      dxRef.current = 0;
      velocityRef.current = 0;
      axisRef.current = "none";
      didDragRef.current = false;
      phaseRef.current = "dragging";

      widthRef.current = contentRef.current?.offsetWidth || 1;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // setPointerCapture can throw if the pointer is already gone; ignore.
      }
      const el = contentRef.current;
      if (el) el.style.transition = "none";
      setIsDragging(true);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      if (phaseRef.current !== "dragging") return;

      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;
      dxRef.current = dx;
      if (Math.abs(dx) > DID_DRAG_PX || Math.abs(dy) > DID_DRAG_PX) {
        didDragRef.current = true;
      }

      if (axisRef.current === "none") {
        const axis = lockAxis(dx, dy);
        if (axis === "none") return; // still in the dead zone
        if (axis === "vertical") {
          // Let the browser scroll / pinch; bow out of this gesture entirely.
          axisRef.current = "vertical";
          phaseRef.current = "idle";
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          endGesture();
          return;
        }
        axisRef.current = "horizontal";
      }

      // Horizontal: we own it. preventDefault only AFTER the lock (touch-action
      // is the primary scroll contract; this just suppresses text selection etc).
      e.preventDefault();

      // Last-segment velocity (more faithful to intent than a whole-gesture avg).
      const dt = e.timeStamp - lastTRef.current;
      if (dt > 0) velocityRef.current = (e.clientX - lastXRef.current) / dt;
      lastXRef.current = e.clientX;
      lastTRef.current = e.timeStamp;

      if (!optsRef.current.reducedMotion) applyTransform(dx);
    },
    [applyTransform, endGesture],
  );

  const settle = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const wasHorizontal = axisRef.current === "horizontal";
      const dx = dxRef.current;
      const opts = optsRef.current;
      endGesture();

      if (!wasHorizontal) {
        phaseRef.current = "idle";
        return;
      }

      // Stale-flick guard: a long pause before release is not a flick.
      const stale = e.timeStamp - lastTRef.current > STALE_VELOCITY_MS;
      const velocity = stale ? 0 : velocityRef.current;

      const result = resolveSwipe({
        dx,
        width: widthRef.current,
        velocity,
        minPx: opts.minSwipePx,
        fraction: opts.swipeFraction,
        velocityPxPerMs: opts.velocityPxPerMs,
      });

      // Honour bounds for non-wrapping galleries (wrap defaults to true).
      const wrap = opts.wrap ?? true;
      const blocked =
        !wrap &&
        ((result === "prev" && opts.canPrev === false) ||
          (result === "next" && opts.canNext === false));

      if (result === "none" || blocked) {
        if (opts.reducedMotion) {
          resetStylesImmediate();
          phaseRef.current = "idle";
          return;
        }
        // Spring back to center.
        const el = contentRef.current;
        phaseRef.current = "snapping-back";
        if (el) {
          el.style.transition = SNAP_TRANSITION;
          el.style.transform = "translate3d(0, 0, 0)";
          el.style.opacity = "1";
        }
        armFallback(SNAP_MS);
        return;
      }

      if (opts.reducedMotion) {
        // No animation: navigate immediately.
        if (result === "prev") opts.onPrev();
        else opts.onNext();
        resetStylesImmediate();
        phaseRef.current = "idle";
        return;
      }

      // Simple commit: slide a touch farther out in the drag direction, then
      // (on transitionend) swap the item and snap back to center.
      pendingDirRef.current = result;
      phaseRef.current = "committing";
      const sign = result === "prev" ? 1 : -1;
      const out = sign * Math.min(widthRef.current * 0.35, Math.abs(dx) + 60);
      const el = contentRef.current;
      if (el) {
        el.style.transition = COMMIT_TRANSITION;
        el.style.transform = `translate3d(${out}px, 0, 0)`;
        el.style.opacity = String(1 - OPACITY_FALLOFF);
      }
      armFallback(COMMIT_MS);
    },
    [armFallback, endGesture, resetStylesImmediate],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endGesture();
      // Snap back from wherever the drag left the card.
      if (phaseRef.current === "dragging") {
        if (optsRef.current.reducedMotion) {
          resetStylesImmediate();
          phaseRef.current = "idle";
        } else {
          const el = contentRef.current;
          phaseRef.current = "snapping-back";
          if (el) {
            el.style.transition = SNAP_TRANSITION;
            el.style.transform = "translate3d(0, 0, 0)";
            el.style.opacity = "1";
          }
          armFallback(SNAP_MS);
        }
      }
    },
    [armFallback, endGesture, resetStylesImmediate],
  );

  // lostpointercapture behaves like cancellation.
  const onLostPointerCapture = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      if (phaseRef.current !== "dragging") return;
      endGesture();
      if (optsRef.current.reducedMotion) {
        resetStylesImmediate();
        phaseRef.current = "idle";
        return;
      }
      const el = contentRef.current;
      phaseRef.current = "snapping-back";
      if (el) {
        el.style.transition = SNAP_TRANSITION;
        el.style.transform = "translate3d(0, 0, 0)";
        el.style.opacity = "1";
      }
      armFallback(SNAP_MS);
    },
    [armFallback, endGesture, resetStylesImmediate],
  );

  // Finish snap-back / commit early via transitionend (the fallback timer is the
  // safety net). Scoped to the content element + the transform property.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleEnd = (event: TransitionEvent) => {
      if (event.target !== el || event.propertyName !== "transform") return;
      if (phaseRef.current === "committing" || phaseRef.current === "snapping-back") {
        finishActiveTransition();
      }
    };
    el.addEventListener("transitionend", handleEnd);
    return () => el.removeEventListener("transitionend", handleEnd);
  }, [finishActiveTransition]);

  // Unmount cleanup — lightboxes can unmount abruptly (Esc / close / backdrop /
  // route change) mid-gesture, so tear down the timer and inline styles.
  useEffect(() => {
    return () => {
      clearFallback();
      resetStylesImmediate();
    };
  }, [clearFallback, resetStylesImmediate]);

  const handlers = useMemo<SwipeHandlers<T>>(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: settle,
      onPointerCancel,
      onLostPointerCapture,
    }),
    [onPointerDown, onPointerMove, settle, onPointerCancel, onLostPointerCapture],
  );

  return { contentRef, handlers, isDragging, didDragRef };
}
