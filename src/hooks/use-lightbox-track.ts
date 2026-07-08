"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { useSwipeNavigation } from "./use-swipe-navigation";
import type {
  BackdropProps,
  SwipeHandlers,
} from "./use-swipe-navigation";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Shared consumer half of the filmstrip track (the hook half is
 * `useSwipeNavigation`'s `track` mode). Owns the slot-rotation state and the
 * rotation↔reanchor choreography so every filmstrip lightbox — full-bleed
 * (post-event) or strip-of-cards (templates) — gets the same, correct
 * mechanics from one call:
 *
 *  - Photos rotate through 3 persistent slots so the side slide gliding in
 *    BECOMES the center: same element, same src, no on-screen swap (the
 *    frame-holding rule the whole swipe stack is built on).
 *  - The center slot advances inside the wrapped onPrev/onNext — the same
 *    call site the swipe hook records direction from — so rotation and
 *    re-anchor can never disagree. (Inferring direction from index deltas
 *    can: a 2-item album's prev step is indistinguishable from next by
 *    index alone, but not by glide geometry.)
 *  - On an index change the slides re-render into their rotated slots and a
 *    layout effect calls `reanchor()` in the SAME paint (net visual change:
 *    zero), then the strip springs home.
 *
 * Consumers spread `trackProps` on the track element (NEVER raw swipe
 * handlers + backdropProps together — both carry an onPointerDown and the
 * later spread would silently disarm the gesture; trackProps composes them
 * correctly), attach `trackRef` to it, and render `slides` — keeping each
 * slide's `key` verbatim: it's stable
 * exactly as long as that slot shows that photo, so the two slides that
 * survive a rotation keep their elements and decoded frames, while the far
 * side remounts OFF-screen with fresh load state.
 */

/**
 * Which photo a track slot shows, and where the slot sits (-1 = peeking
 * left, 0 = center, +1 = peeking right), given which slot currently holds
 * the center role.
 *
 * `centerSlot` is SEQUENTIAL state, advanced ±1 (mod 3) per navigation via
 * advanceCenterSlot — it cannot be derived from the index: stepping across
 * an album-boundary wrap on a count that isn't a multiple of 3 would
 * re-seat the center into a different slot and swap the visible src
 * (caught by the invariant tests).
 */
export function trackSlotAssignment(
  slot: number,
  centerSlot: number,
  index: number,
  count: number,
): { offset: -1 | 0 | 1; itemIndex: number } {
  const m = (slot - centerSlot + 3) % 3;
  const offset = (m === 2 ? -1 : m) as -1 | 0 | 1;
  const itemIndex = (((index + offset) % count) + count) % count;
  return { offset, itemIndex };
}

/** Center-slot rotation for one navigation step. */
export function advanceCenterSlot(
  centerSlot: number,
  direction: "prev" | "next",
): number {
  return (centerSlot + (direction === "next" ? 1 : 2)) % 3;
}

export type LightboxTrackSlideData<T> = {
  /** React key — stable exactly as long as this slot shows this photo. */
  key: string;
  offset: -1 | 0 | 1;
  item: T;
};

/** The ONLY sanctioned spread for the track element (see trackProps). */
export type LightboxTrackProps = SwipeHandlers<HTMLDivElement> &
  Pick<BackdropProps, "onClick">;

export type UseLightboxTrackOptions<T> = {
  items: readonly T[];
  index: number;
  /** Stable identity for an item (e.g. assetId) — becomes part of the
   *  slide key so a slot showing a NEW photo remounts (off-screen). */
  getItemKey: (item: T) => string;
  onPrev: () => void;
  onNext: () => void;
  /** Forwarded to useSwipeNavigation: hook-owned keyboard (Esc closes,
   *  arrows busy-gated) + backdropProps closing on a true backdrop tap. */
  onClose?: () => void;
};

export type UseLightboxTrackResult<T> = {
  /** Attach to the track element (the hook translates it imperatively). */
  trackRef: RefObject<HTMLDivElement | null>;
  /** Spread on the track element: the swipe gesture handlers plus the
   *  backdrop tap-to-close for any track area not covered by content
   *  (e.g. the gaps between cards; a no-op when slides cover the track). */
  trackProps: LightboxTrackProps;
  /** Spread on additional backdrop element(s) OUTSIDE the track (e.g. the
   *  dialog root around a clipped viewport). */
  backdropProps: BackdropProps;
  /** Busy-gated arrow-button navigation. */
  prev: () => void;
  next: () => void;
  /** Render these in order, keyed by `slide.key`. One slide when the
   *  gallery has a single photo, three otherwise. */
  slides: Array<LightboxTrackSlideData<T>>;
};

export function useLightboxTrack<T>({
  items,
  index,
  getItemKey,
  onPrev,
  onNext,
  onClose,
}: UseLightboxTrackOptions<T>): UseLightboxTrackResult<T> {
  const count = items.length;

  // The count guard keeps a single-photo album's keyboard no-op nav from
  // re-seating its lone slide.
  const [centerSlot, setCenterSlot] = useState(0);
  const handlePrev = useCallback(() => {
    if (count > 1) setCenterSlot((s) => advanceCenterSlot(s, "prev"));
    onPrev();
  }, [count, onPrev]);
  const handleNext = useCallback(() => {
    if (count > 1) setCenterSlot((s) => advanceCenterSlot(s, "next"));
    onNext();
  }, [count, onNext]);

  const reducedMotion = useReducedMotion();
  const { contentRef, handlers, backdropProps, prev, next, reanchor } =
    useSwipeNavigation<HTMLDivElement>({
      onPrev: handlePrev,
      onNext: handleNext,
      onClose,
      enabled: count > 1,
      reducedMotion,
      track: true,
    });

  // Rotation partner: when the index commits, the slides render into their
  // rotated slots and this layout effect re-anchors the track transform in
  // the SAME paint, then the hook springs the strip home. Must be
  // useLayoutEffect — a plain effect would let the rotated slides paint one
  // frame at the wrong offset.
  const prevIndexRef = useRef(index);
  useLayoutEffect(() => {
    if (prevIndexRef.current === index) return;
    prevIndexRef.current = index;
    reanchor();
  }, [index, reanchor]);

  // Gesture + gap tap-to-close in ONE spread. Whether a press is a "gap
  // press" must be decided at POINTERDOWN: the gesture handler calls
  // setPointerCapture on the track, which retargets the subsequent
  // pointerup AND click to the track itself — by click time, e.target says
  // "track" even for taps that started on a card (which must NOT close).
  // Slides are pointer-events-none, so a pointerdown whose target is the
  // track itself can only be the gap between cards.
  const downOnGapRef = useRef(false);
  const trackProps = useMemo(
    () => ({
      ...handlers,
      onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
        // Same primary/left-button filter the gesture applies: a second
        // resting finger on the gap must not overwrite the primary press's
        // gap/card classification (it could reclassify a photo tap as a
        // backdrop tap and close the lightbox).
        if (e.isPrimary && e.button === 0) {
          downOnGapRef.current = e.target === e.currentTarget;
        }
        handlers.onPointerDown?.(e);
      },
      onClick: (e: ReactMouseEvent<HTMLElement>) => {
        if (!downOnGapRef.current) return;
        downOnGapRef.current = false;
        // backdropProps.onClick still applies its own didDrag swallow, so a
        // drag that starts AND ends on the gap doesn't close either.
        backdropProps.onClick(e);
      },
    }),
    [handlers, backdropProps],
  );

  // items=[] would make the slot modulo NaN and getItemKey(undefined)
  // throw — hooks run above the consumers' own `return null` guards, so
  // degrade to an empty strip instead of crashing the tree.
  const slots = count === 0 ? [] : count > 1 ? [0, 1, 2] : [centerSlot];
  const slides = slots.map((slot) => {
    const { offset, itemIndex } = trackSlotAssignment(
      slot,
      centerSlot,
      index,
      count,
    );
    const item = items[itemIndex];
    return { key: `${slot}-${getItemKey(item)}`, offset, item };
  });

  return { trackRef: contentRef, trackProps, backdropProps, prev, next, slides };
}
