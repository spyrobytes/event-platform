"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { flushSync } from "react-dom";
import type {
  HTMLAttributes,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";

/**
 * Pointer-driven swipe / drag navigation for lightboxes (and any prev/next
 * surface). One code path covers mouse, touch, and pen via Pointer Events; the
 * drag hot path writes `transform` straight to the DOM (no React re-render per
 * move — not even for the cursor, which is driven imperatively too).
 * See docs/pending-features/gallery-swipe-navigation-implementation-plan.md.
 *
 * Consumers attach `contentRef` to the element that should translate and spread
 * `handlers` on that same element. Two refs are returned for the consumer to
 * read without triggering re-renders:
 *   - `didDragRef`  — true after a >6px move; read it in a backdrop close handler
 *     so a drag doesn't double as a dismiss. RE-ARM it: reset to false on a fresh
 *     pointerdown ANYWHERE (incl. the backdrop), else a stale true swallows the
 *     next genuine close tap.
 *   - `isDraggingRef` — true while a pointer is held on the surface; gate live
 *     keyboard/button nav on `!isDraggingRef.current` so an external nav can't
 *     leave the stage mid-translated.
 *
 * Commit is an INSTANT cut (flushSync-navigate, then reset to center) — no
 * deferred-transition nav window, so live keyboard/buttons can't double-advance
 * and there's no wrong-image flash. The richer slide-out/in choreography is a
 * deferred follow-up. Only the under-threshold snap-back is animated.
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
const SNAP_MS = 220; // spring-back duration
const TRANSITION_FALLBACK_BUFFER_MS = 80; // safety margin if transitionend never fires

const SNAP_TRANSITION = `transform ${SNAP_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${SNAP_MS}ms ease`;

// --- Pure helpers (unit-tested) ------------------------------------------

/**
 * Decide the gesture axis once movement clears `lockPx`. Returns "none" while
 * the movement is still within the dead zone so the caller keeps waiting. An
 * exact tie (|dx| === |dy|) resolves to "horizontal" — the axis this gesture
 * owns — so a ~45° drag still navigates rather than bowing out.
 */
export function lockAxis(
  dx: number,
  dy: number,
  lockPx = AXIS_LOCK_PX,
): "horizontal" | "vertical" | "none" {
  if (Math.hypot(dx, dy) < lockPx) return "none";
  return Math.abs(dx) >= Math.abs(dy) ? "horizontal" : "vertical";
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
 *
 * Direction follows the dominant signal: a deliberate drag trusts `dx`; a
 * flick (distance not met) trusts `velocity`. This way a fast flick whose
 * finger drifts a few px the *other* way at release still goes where it was
 * thrown, not where it happened to end.
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
  // Deliberate distance → trust dx; flick-only → trust velocity.
  const dir = distancePassed ? dx : velocity;
  // Dragging RIGHT reveals the PREVIOUS item; LEFT reveals NEXT.
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
  /** True while a pointer is held on the surface. Read in keyboard/button nav. */
  isDraggingRef: RefObject<boolean>;
  /** True after a >6px move; read in a backdrop close handler. Re-arm on press. */
  didDragRef: RefObject<boolean>;
};

type SwipePhase = "idle" | "dragging" | "snapping-back";

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

  // --- Gesture state (refs → no re-render during a gesture, ever) ---
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
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);

  // --- DOM write helpers (imperative; bypass React during the gesture) ---
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

  // Cursor is driven imperatively (not React state) so a drag causes zero
  // parent re-renders. The hook owns it end-to-end.
  const setRestCursor = useCallback(() => {
    const el = contentRef.current;
    if (el) el.style.cursor = optsRef.current.enabled ? "grab" : "default";
  }, []);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const safeReleaseCapture = useCallback((e: ReactPointerEvent<T>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // releasePointerCapture throws if the pointer is already gone; ignore.
    }
  }, []);

  // Finalize the snap-back transition (the only animated path now that commit
  // is an instant cut). Driven by transitionend with a fallback timer.
  const finishSnapBack = useCallback(() => {
    clearFallback();
    if (phaseRef.current === "snapping-back") {
      resetStylesImmediate();
      phaseRef.current = "idle";
    }
  }, [clearFallback, resetStylesImmediate]);

  const armFallback = useCallback(
    (ms: number) => {
      clearFallback();
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        finishSnapBack();
      }, ms + TRANSITION_FALLBACK_BUFFER_MS);
    },
    [clearFallback, finishSnapBack],
  );

  // Spring the card back to center (under-threshold release, or any cancel).
  const snapBack = useCallback(() => {
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
  }, [armFallback, resetStylesImmediate]);

  const endGesture = useCallback(() => {
    pointerIdRef.current = null;
    axisRef.current = "none";
    isDraggingRef.current = false;
    setRestCursor();
  }, [setRestCursor]);

  // --- Pointer handlers ---
  const onPointerDown = useCallback((e: ReactPointerEvent<T>) => {
    const opts = optsRef.current;
    if (!opts.enabled) return;
    if (!e.isPrimary || e.button !== 0) return; // primary pointer / left button
    if (pointerIdRef.current !== null) return; // a pointer is already active
    if (phaseRef.current !== "idle") return; // mid snap-back

    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lastXRef.current = e.clientX;
    lastTRef.current = e.timeStamp;
    dxRef.current = 0;
    velocityRef.current = 0;
    axisRef.current = "none";
    didDragRef.current = false;
    isDraggingRef.current = true;
    phaseRef.current = "dragging";

    // Fall back to viewport width (not 1) so a not-yet-laid-out stage can't make
    // the opacity-falloff denominator tiny and snap the photo dark on a 1px drag.
    widthRef.current =
      contentRef.current?.offsetWidth ||
      (typeof window !== "undefined" ? window.innerWidth : 0) ||
      1;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw if the pointer is already gone; ignore.
    }
    const el = contentRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.cursor = "grabbing";
    }
  }, []);

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
          safeReleaseCapture(e);
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
    [applyTransform, endGesture, safeReleaseCapture],
  );

  const settle = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerId !== pointerIdRef.current) return;

      const wasHorizontal = axisRef.current === "horizontal";
      const dx = dxRef.current;
      const opts = optsRef.current;
      // Stale-flick guard: a long pause before release is not a flick.
      const stale = e.timeStamp - lastTRef.current > STALE_VELOCITY_MS;
      const velocity = stale ? 0 : velocityRef.current;

      // End the gesture (nulls pointerId) BEFORE releasing capture, so a
      // synchronously-dispatched lostpointercapture can't re-handle it.
      endGesture();
      safeReleaseCapture(e);

      if (!wasHorizontal) {
        phaseRef.current = "idle";
        return;
      }

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
        snapBack();
        return;
      }

      // Instant-cut commit: flushSync so the new src is in the DOM before we
      // reset the transform — no deferred nav window (can't double-advance),
      // and no one-frame flash of the outgoing photo.
      flushSync(() => {
        if (result === "prev") opts.onPrev();
        else opts.onNext();
      });
      resetStylesImmediate();
      phaseRef.current = "idle";
    },
    [endGesture, resetStylesImmediate, safeReleaseCapture, snapBack],
  );

  // Cancellation (browser-cancelled gesture or lost capture): snap back. Both
  // share one guarded path so a stray cancel during an in-flight snap is a no-op.
  const cancelGesture = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerId !== pointerIdRef.current) return;
      if (phaseRef.current !== "dragging") return;
      safeReleaseCapture(e);
      endGesture();
      snapBack();
    },
    [endGesture, safeReleaseCapture, snapBack],
  );

  // Base cursor (grab when navigable, default otherwise) when not dragging.
  useEffect(() => {
    const el = contentRef.current;
    if (el) el.style.cursor = options.enabled ? "grab" : "default";
  }, [options.enabled]);

  // Finish snap-back early via transitionend (the fallback timer is the safety
  // net). Scoped to the content element + the transform property.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handleEnd = (event: TransitionEvent) => {
      if (event.target !== el || event.propertyName !== "transform") return;
      finishSnapBack();
    };
    el.addEventListener("transitionend", handleEnd);
    return () => el.removeEventListener("transitionend", handleEnd);
  }, [finishSnapBack]);

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
      onPointerCancel: cancelGesture,
      onLostPointerCapture: cancelGesture,
    }),
    [onPointerDown, onPointerMove, settle, cancelGesture],
  );

  return { contentRef, handlers, isDraggingRef, didDragRef };
}
