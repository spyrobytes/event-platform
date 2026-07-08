"use client";

import { useState } from "react";
import type {
  CSSProperties,
  ReactNode,
  RefObject,
  SyntheticEvent,
} from "react";
import type { LightboxTrackProps } from "@/hooks/use-lightbox-track";
import { cn } from "@/lib/utils";

/**
 * Structural shell of a filmstrip lightbox: the clipping viewport and the
 * TRACK element the swipe hook translates (and applies the gesture contract
 * to). Keeps the viewport/track wiring in one place so template and
 * full-bleed lightboxes can't drift; only sizing comes from the consumer.
 */
export function LightboxTrack({
  trackRef,
  trackProps,
  className,
  children,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  /** The composed spread from useLightboxTrack — the ONLY thing that may
   *  go on the track (raw swipe handlers + backdropProps collide). */
  trackProps: LightboxTrackProps;
  /** Sizing/positioning for the clipping viewport (e.g. `absolute inset-0`
   *  for a full-screen card strip, or a max-w/max-h box for a full-bleed
   *  stage). `overflow-hidden` is built in. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div ref={trackRef} {...trackProps} className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}

/**
 * Everything the slide's image element must carry — spread it on the
 * EventImage / next Image inside the slide:
 *  - stale-peek guard plumbing (onLoad/onError),
 *  - drag safety (draggable=false),
 *  - and the preload contract: side slides sit OUTSIDE the clipped viewport,
 *    where native lazy loading would never fetch them — and they ARE the ±1
 *    preload, so they load eagerly. (Omitting this on one consumer silently
 *    regresses preloading; it lives here so it can't be forgotten.)
 */
export type TrackSlideImageProps = {
  draggable: false;
  loading: "eager" | undefined;
  onLoad: (e: SyntheticEvent<HTMLImageElement>) => void;
  onError: () => void;
};

type SlideRenderProps = {
  /** Spread on the slide's image. */
  imageProps: TrackSlideImageProps;
  /** True while a SIDE slide's photo is still loading — hide the image
   *  (e.g. `visibility: hidden` / the `invisible` class) so a peek can't
   *  show a stale or half-painted frame. Always false for the center,
   *  which paints progressively and frame-holds. */
  hideStale: boolean;
  /** Render inside the image's positioned container while hiding: a blur
   *  stand-in of the REAL photo (null when the item has no blur data). */
  staleOverlay: ReactNode;
};

/**
 * One positioned slide of a filmstrip lightbox track: translate by offset,
 * aria-hidden off-center, and the stale-peek guard state. The consumer
 * renders the actual content (full-bleed image, or a complete card with
 * chrome + caption) via the render prop.
 *
 * `center` layout (strip-of-cards): the slide is pointer-events-none and
 * flex-centers its card, so a tap in the gap between cards falls through
 * to the track (whose trackProps close the lightbox) — the card itself
 * must opt back in with pointer-events: auto. This invariant is what the
 * hook's gap-vs-card pointerdown classification depends on, so it lives
 * here rather than as a per-consumer className.
 *
 * Stale-peek guard — SIDES ONLY: a freshly assigned side slide has no
 * meaningful frame to hold, so until its src loads (or definitively fails)
 * the consumer hides the img behind the item's blur placeholder — an early
 * peek shows a blur of the REAL neighbor, never the wrong photo. The
 * CENTER is exempt: it paints progressively and frame-holds like a plain
 * lightbox image (the organizer-approved no-flash behavior). On error we
 * settle rather than blur forever: the browser's broken-image state is
 * more honest than a permanent placeholder. Because slides are keyed by
 * slot + item, an element's src never changes within its lifetime — a
 * stale load event can't outlive its element, so `settled` can't be
 * confused. After load, `decode()` pre-decompresses the bitmap off-screen
 * so the first composite during a drag doesn't pay decode cost
 * mid-gesture.
 */
export function LightboxTrackSlide({
  offset,
  blurDataUrl,
  center = false,
  children,
}: {
  offset: -1 | 0 | 1;
  blurDataUrl?: string | null;
  /** Strip-of-cards layout: flex-center the card in a pointer-events-none
   *  slide (the card must re-enable pointer-events itself). */
  center?: boolean;
  children: (slide: SlideRenderProps) => ReactNode;
}) {
  const [settled, setSettled] = useState(false);
  const hideStale = !settled && offset !== 0;

  const imageProps: TrackSlideImageProps = {
    // Native HTML5 image-drag would hijack mouse swipes (ghost image +
    // lostpointercapture mid-gesture).
    draggable: false,
    loading: offset === 0 ? undefined : "eager",
    onLoad: (e) => {
      setSettled(true);
      e.currentTarget.decode?.().catch(() => {});
    },
    onError: () => setSettled(true),
  };

  const staleOverlay: ReactNode =
    hideStale && blurDataUrl ? (
      <div
        aria-hidden
        className="absolute inset-0 bg-contain bg-center bg-no-repeat [background-image:var(--peek-blur)]"
        style={{ "--peek-blur": `url(${blurDataUrl})` } as CSSProperties}
      />
    ) : null;

  return (
    <div
      aria-hidden={offset !== 0}
      className={cn(
        "absolute inset-0",
        offset === -1 && "-translate-x-full",
        offset === 1 && "translate-x-full",
        center && "pointer-events-none flex items-center justify-center",
      )}
    >
      {children({ imageProps, hideStale, staleOverlay })}
    </div>
  );
}
