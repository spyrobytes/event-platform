"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  HTMLAttributes,
  MouseEvent as ReactMouseEvent,
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
 * `handlers` on that same element. The full lightbox-nav contract ships from
 * the hook so consumers can't implement half of it:
 *   - `backdropProps` — spread on the backdrop element. Packages the
 *     drag/close disambiguation: re-arm on press, swallow the click that ends
 *     a drag, close (via the `onClose` option) only on a true backdrop tap.
 *   - `prev` / `next` — busy-gated wrappers around onPrev/onNext for arrow
 *     buttons; they no-op while a gesture or its settle glide is in flight so
 *     a click can't swap src mid-animation.
 *   - Keyboard: when the `onClose` option is provided the hook owns the
 *     document keydown handler for the surface's lifetime — Escape closes
 *     (never gated), ArrowLeft/ArrowRight navigate (busy-gated). Mount the
 *     hook inside the lightbox component so the listener's lifetime matches.
 *   - `isBusyRef` — the raw busy signal, for gating nav paths the hook can't
 *     see (e.g. a filmstrip thumbnail's goTo). True while a gesture OR its
 *     settle animation is in flight.
 *
 * Navigation is wrap-around by design: every gallery surface in this codebase
 * wraps (modulo prev/next), so the hook has no bounded-edge mode. If a bounded
 * consumer ever lands (e.g. a filmstrip with real ends), edge behavior must be
 * built WITH it — a blocked edge needs rubber-band resistance during the drag,
 * not a full-tracking drag that silently snaps back (reads as a dropped
 * gesture).
 *
 * Commit navigates and then springs the drag offset back to center: the
 * consumer's single persistent image swaps src in place (holding the previous
 * frame until the new one decodes — the same smooth path the arrows use) while
 * the photo glides home. No flushSync, no separate slide panes — both of those
 * cost smoothness on real hardware. Only the snap-back is animated.
 *
 * Filmstrip track mode (`track: true`): `contentRef` is a 3-slide track and
 * neighbors peek in during the drag. The commit contract changes shape — the
 * hook still navigates at release, but the spring is completed by the
 * consumer calling `reanchor()` from a useLayoutEffect after its slides
 * rotate, so the rotation and the transform re-anchor land in one paint. The
 * no-on-screen-src-swap rule still holds: slides are persistent slot-keyed
 * elements whose src only changes while off-screen (see GalleryLightbox).
 *
 * The stage's per-element gesture requirements are applied imperatively to
 * `contentRef` by the hook itself — `touch-action: pan-y pinch-zoom` (we own
 * horizontal, the browser keeps vertical scroll + pinch-zoom) and
 * `user-select: none` unconditionally (a single-photo stage must not select
 * its caption on drag either), plus, while `enabled`, the grab cursor and
 * `will-change: transform` so the compositor layer is resident BEFORE the
 * first drag (otherwise that drag can jank promoting the layer mid-gesture —
 * the same first-interaction layer-materialization class fixed on the flip
 * cards in #238/#239). Consumers must not redeclare any of these on the
 * stage.
 */

// --- Tunables -------------------------------------------------------------

const AXIS_LOCK_PX = 8; // movement before we decide horizontal vs vertical
const DID_DRAG_PX = 6; // movement before a press counts as a drag (not a tap)
const STALE_VELOCITY_MS = 100; // a pause longer than this before release = no flick
const VELOCITY_WINDOW_MS = 80; // trailing window the release velocity averages over
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

export type VelocitySample = {
  /** Pointer x at this move (px). */
  x: number;
  /** Event timeStamp at this move (ms). */
  t: number;
};

/**
 * Velocity over a trailing window of move samples (px/ms). A single
 * last-segment velocity is noisy — pointer-event coalescing on high-refresh
 * screens makes one segment's dt jitter wildly, and one erratic sample can
 * flip a flick's sign. Averaging displacement over the trailing `windowMs`
 * reads the finger's actual throw. Falls back to the last single segment when
 * the window holds only the newest pair; returns 0 when there's nothing to
 * measure.
 */
export function windowVelocity(
  samples: readonly VelocitySample[],
  windowMs = VELOCITY_WINDOW_MS,
): number {
  if (samples.length < 2) return 0;
  const newest = samples[samples.length - 1];
  const cutoff = newest.t - windowMs;
  // Oldest sample still inside the window (samples are time-ordered).
  let first = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (samples[i].t < cutoff) break;
    first = samples[i];
  }
  const dt = newest.t - first.t;
  if (dt <= 0) return 0;
  return (newest.x - first.x) / dt;
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

/**
 * Track-mode re-anchor math. After a committed navigation the consumer's
 * slides rotate one slot (the world shifts by one slide width), so to keep
 * the pixels identical the track transform must jump from `dx` to
 * `dx ± width` in the same frame — then spring to 0 to finish centering the
 * incoming slide. "next" enters from the right (dx ≤ 0 → re-anchor right of
 * center), "prev" mirrors it.
 */
export function reanchorOffset(
  dx: number,
  width: number,
  direction: "prev" | "next",
): number {
  return dx + (direction === "next" ? width : -width);
}

// --- Hook -----------------------------------------------------------------

export type UseSwipeNavigationOptions = {
  onPrev: () => void;
  onNext: () => void;
  /** When provided, the hook owns lightbox keyboard nav (Escape closes,
   *  arrows navigate busy-gated) and `backdropProps` closes on a true
   *  backdrop tap. Mount the hook inside the lightbox so the document
   *  listener's lifetime matches the surface. */
  onClose?: () => void;
  /** Gate the whole gesture (e.g. false for a single-item gallery). */
  enabled: boolean;
  /** When true, skip the live translate and commit instantly on threshold. */
  reducedMotion: boolean;
  /**
   * Filmstrip track mode. `contentRef` is a multi-slide TRACK (neighbors
   * peek during the drag) instead of a single stage:
   *  - the drag translate skips the opacity falloff (carousels don't fade);
   *  - a committed swipe navigates at release but does NOT spring here —
   *    the consumer must rotate its slides on the index change and call
   *    `reanchor()` from a `useLayoutEffect`, which re-anchors the track
   *    transform for the rotated slide positions and springs it home. Busy
   *    is held from release through the spring (with a fallback reset in
   *    case the consumer's reanchor never comes).
   */
  track?: boolean;
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

export type BackdropProps = {
  onPointerDown: () => void;
  onClick: (e: ReactMouseEvent<HTMLElement>) => void;
};

export type UseSwipeNavigationResult<T extends HTMLElement = HTMLDivElement> = {
  contentRef: RefObject<T | null>;
  handlers: SwipeHandlers<T>;
  /** True while a gesture OR its settle animation is in flight. Gate any nav
   *  path the hook can't see (e.g. filmstrip goTo) on this. */
  isBusyRef: RefObject<boolean>;
  /** Spread on the backdrop element: closes (via the onClose option) on a
   *  genuine backdrop tap, never on the click that ends a drag. */
  backdropProps: BackdropProps;
  /** Busy-gated onPrev/onNext for arrow buttons. */
  prev: () => void;
  next: () => void;
  /** Track mode only: call from a useLayoutEffect after the slides have
   *  rotated on an index change. Re-anchors the track transform for the
   *  rotated slot positions and springs it home. No-op outside track mode. */
  reanchor: () => void;
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
  // Trailing move samples for the release velocity; pruned to the window as
  // they're recorded, so it stays a handful of entries.
  const samplesRef = useRef<VelocitySample[]>([]);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBusyRef = useRef(false);
  const didDragRef = useRef(false);
  // Direction of the most recent hook-driven navigation (gesture, arrow, or
  // keyboard). Track mode's reanchor() reads it instead of taking a param so
  // a 2-item wrap-around gallery (where next and prev land on the same index)
  // can't mis-derive the glide direction from index deltas.
  const lastNavDirRef = useRef<"prev" | "next">("next");

  // Phase + its "busy" mirror, kept in lockstep. isBusyRef (read by the consumer)
  // is true for BOTH "dragging" and "snapping-back", so a committed swipe's
  // ~220ms glide window also blocks external keyboard/button nav.
  const setPhase = useCallback((p: SwipePhase) => {
    phaseRef.current = p;
    isBusyRef.current = p !== "idle";
  }, []);

  // --- DOM write helpers (imperative; bypass React during the gesture) ---
  const applyTransform = useCallback((x: number) => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, 0, 0)`;
    // Single-stage mode fades the card as it leaves; a track doesn't — the
    // neighbor peeking in IS the depart cue, and fading the strip would dim
    // the incoming photo too.
    if (optsRef.current.track) return;
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

  // Finalize the snap-back transition (used by both a committed swipe and an
  // under-threshold release). Driven by transitionend with a fallback timer.
  const finishSnapBack = useCallback(() => {
    clearFallback();
    if (phaseRef.current === "snapping-back") {
      dxRef.current = 0;
      resetStylesImmediate();
      setPhase("idle");
    }
  }, [clearFallback, resetStylesImmediate, setPhase]);

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

  // Spring the card to center. Runs on an under-threshold release, on any
  // cancel, AND on a committed swipe (after navigating) so the new photo glides
  // home. Holds phase in "snapping-back" until it settles, which keeps isBusyRef
  // true so external nav stays gated through the glide.
  const snapBack = useCallback(() => {
    dxRef.current = 0; // consumed — a later reanchor must not reuse a stale drag
    if (optsRef.current.reducedMotion) {
      resetStylesImmediate();
      setPhase("idle");
      return;
    }
    const el = contentRef.current;
    setPhase("snapping-back");
    if (el) {
      el.style.transition = SNAP_TRANSITION;
      el.style.transform = "translate3d(0, 0, 0)";
      el.style.opacity = "1";
    }
    armFallback(SNAP_MS);
  }, [armFallback, resetStylesImmediate, setPhase]);

  const endGesture = useCallback(() => {
    // Note: the "busy" state follows the phase (set by callers via setPhase
    // right after this), so endGesture deliberately doesn't touch it.
    pointerIdRef.current = null;
    axisRef.current = "none";
    setRestCursor();
  }, [setRestCursor]);

  // --- Pointer handlers ---
  const onPointerDown = useCallback((e: ReactPointerEvent<T>) => {
    const opts = optsRef.current;
    if (!opts.enabled) return;
    if (!e.isPrimary || e.button !== 0) return; // primary pointer / left button
    if (pointerIdRef.current !== null) return; // a pointer is already active
    // Interrupt an in-flight snap-back so fast back-to-back swipes register: the
    // committed photo is already swapped, so jump it to center and start fresh.
    if (phaseRef.current === "snapping-back") {
      clearFallback();
      resetStylesImmediate();
      setPhase("idle");
    }
    if (phaseRef.current !== "idle") return;

    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dxRef.current = 0;
    samplesRef.current = [{ x: e.clientX, t: e.timeStamp }];
    axisRef.current = "none";
    didDragRef.current = false;
    setPhase("dragging");

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
  }, [clearFallback, resetStylesImmediate, setPhase]);

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
          setPhase("idle");
          safeReleaseCapture(e);
          endGesture();
          return;
        }
        axisRef.current = "horizontal";
      }

      // Horizontal: we own it. preventDefault only AFTER the lock (touch-action
      // is the primary scroll contract; this just suppresses text selection etc).
      e.preventDefault();

      // Record a velocity sample and prune to the trailing window (+1 sample of
      // slack so windowVelocity always has a pair to fall back on).
      const samples = samplesRef.current;
      samples.push({ x: e.clientX, t: e.timeStamp });
      const cutoff = e.timeStamp - VELOCITY_WINDOW_MS;
      while (samples.length > 2 && samples[0].t < cutoff) samples.shift();

      if (!optsRef.current.reducedMotion) applyTransform(dx);
    },
    [applyTransform, endGesture, safeReleaseCapture, setPhase],
  );

  const settle = useCallback(
    (e: ReactPointerEvent<T>) => {
      if (e.pointerId !== pointerIdRef.current) return;

      const wasHorizontal = axisRef.current === "horizontal";
      const dx = dxRef.current;
      const opts = optsRef.current;
      // Stale-flick guard: a long pause before release is not a flick.
      const samples = samplesRef.current;
      const newestT = samples.length ? samples[samples.length - 1].t : 0;
      const stale = e.timeStamp - newestT > STALE_VELOCITY_MS;
      const velocity = stale ? 0 : windowVelocity(samples);

      // End the gesture (nulls pointerId) BEFORE releasing capture, so a
      // synchronously-dispatched lostpointercapture can't re-handle it.
      endGesture();
      safeReleaseCapture(e);

      if (!wasHorizontal) {
        setPhase("idle");
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

      // Commit (past threshold): navigate. Single-stage mode: the persistent
      // image swaps src in place (frame-held) and snapBack springs it home.
      // Track mode: navigation triggers the consumer's slide rotation; its
      // layout-effect reanchor() (not snapBack here) re-anchors the track for
      // the rotated slot positions and springs it — so hold busy from release
      // and arm the fallback in case the reanchor never comes. React flushes
      // discrete pointerup updates synchronously, so the rotation + reanchor
      // land before any other event can slip into the gap. An under-threshold
      // release skips the nav; either way isBusyRef stays set through the
      // glide so an arrow or key press can't swap src mid-animation. No
      // flushSync, no on-screen src swaps — both cost smoothness on real
      // hardware.
      if (result === "prev" || result === "next") {
        lastNavDirRef.current = result;
        if (result === "prev") opts.onPrev();
        else opts.onNext();
        if (opts.track) {
          setPhase("snapping-back");
          armFallback(SNAP_MS);
          return;
        }
      }
      snapBack();
    },
    [armFallback, endGesture, safeReleaseCapture, snapBack, setPhase],
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

  // Stage contract — the hook owns every per-element requirement of the
  // gesture so a consumer can't ship half of it. Selection/callout
  // suppression and touch-action are UNCONDITIONAL: even a single-photo
  // stage must not blue-highlight its caption on a mouse drag or pop the
  // iOS long-press selection UI (parity with the per-consumer declarations
  // this replaced). Only the grab cursor and will-change are gated on
  // `enabled` — will-change pre-materializes the compositor layer so the
  // FIRST drag doesn't jank promoting it mid-gesture (cf. flip-card
  // #238/#239), and a non-navigable stage shouldn't hold a full-size GPU
  // layer for a gesture that can never happen.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.touchAction = "pan-y pinch-zoom";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    if (options.enabled) {
      el.style.cursor = "grab";
      el.style.willChange = "transform";
    } else {
      el.style.cursor = "default";
      el.style.willChange = "";
    }
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

  // The full backdrop contract in one spread: re-arm the drag guard on every
  // fresh press (incl. presses that never touch the stage), swallow the click
  // that ends a drag (ref-based — pointerup → click → setState batching makes
  // state too late here), and close only on a true backdrop tap (not a click
  // that bubbled from a child).
  const backdropProps = useMemo<BackdropProps>(
    () => ({
      onPointerDown: () => {
        didDragRef.current = false;
      },
      onClick: (e: ReactMouseEvent<HTMLElement>) => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        if (e.target === e.currentTarget) optsRef.current.onClose?.();
      },
    }),
    [],
  );

  // Busy-gated arrow nav: a click mid-gesture or mid-glide would swap src
  // mid-animation, the same race the keyboard gate below prevents. Direction
  // is recorded so track mode's reanchor glides arrow presses too — button,
  // key, and finger all produce the same one-step motion.
  const prev = useCallback(() => {
    if (isBusyRef.current) return;
    lastNavDirRef.current = "prev";
    optsRef.current.onPrev();
  }, []);
  const next = useCallback(() => {
    if (isBusyRef.current) return;
    lastNavDirRef.current = "next";
    optsRef.current.onNext();
  }, []);

  // Track-mode partner of the consumer's slide rotation: call from a
  // useLayoutEffect keyed on the lightbox index, AFTER the slides have
  // re-rendered into their rotated slots. Jumps the track transform to the
  // equivalent position for the rotated world (net visual change: zero, both
  // land in the same paint) and springs it home to finish centering the
  // incoming slide. No-op outside track mode.
  const reanchor = useCallback(() => {
    if (!optsRef.current.track) return;
    const el = contentRef.current;
    if (!el) return;
    const width = el.offsetWidth || widthRef.current || 1;
    const from = reanchorOffset(dxRef.current, width, lastNavDirRef.current);
    dxRef.current = 0;
    clearFallback();
    if (optsRef.current.reducedMotion) {
      resetStylesImmediate();
      setPhase("idle");
      return;
    }
    setPhase("snapping-back");
    el.style.transition = "none";
    el.style.transform = `translate3d(${from}px, 0, 0)`;
    // Force a reflow so the spring below animates FROM the re-anchored
    // position instead of coalescing both writes into one style update.
    void el.offsetWidth;
    el.style.transition = SNAP_TRANSITION;
    el.style.transform = "translate3d(0, 0, 0)";
    armFallback(SNAP_MS);
  }, [armFallback, clearFallback, resetStylesImmediate, setPhase]);

  // Lightbox keyboard nav, owned by the hook so no consumer can copy half of
  // it (Escape must close ungated; arrows must be busy-gated). Active only
  // when an onClose is provided; lifetime = the hook's mount, which is why
  // the hook belongs inside the lightbox component.
  const hasKeyboard = Boolean(options.onClose);
  useEffect(() => {
    if (!hasKeyboard) return;
    const handleKey = (e: KeyboardEvent) => {
      const opts = optsRef.current;
      if (e.key === "Escape") {
        opts.onClose?.();
        return;
      }
      if (isBusyRef.current) return;
      if (e.key === "ArrowRight") {
        lastNavDirRef.current = "next";
        opts.onNext();
      } else if (e.key === "ArrowLeft") {
        lastNavDirRef.current = "prev";
        opts.onPrev();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [hasKeyboard]);

  return { contentRef, handlers, isBusyRef, backdropProps, prev, next, reanchor };
}
