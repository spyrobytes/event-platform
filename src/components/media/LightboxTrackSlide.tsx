"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode, SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Everything the slide's image element must carry for the stale-peek guard
 * (and mouse-drag safety) to work — spread it on the EventImage / next
 * Image inside the slide.
 */
export type TrackSlideImageProps = {
  draggable: false;
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
  className,
  children,
}: {
  offset: -1 | 0 | 1;
  blurDataUrl?: string | null;
  /** Extra shell classes — e.g. the strip-of-cards layout passes
   *  `pointer-events-none flex items-center justify-center` so gap taps
   *  fall through to the track's backdropProps while the card (which must
   *  re-enable pointer-events) stays centered in the slide. */
  className?: string;
  children: (slide: SlideRenderProps) => ReactNode;
}) {
  const [settled, setSettled] = useState(false);
  const hideStale = !settled && offset !== 0;

  const imageProps: TrackSlideImageProps = {
    // Native HTML5 image-drag would hijack mouse swipes (ghost image +
    // lostpointercapture mid-gesture).
    draggable: false,
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
        className,
      )}
    >
      {children({ imageProps, hideStale, staleOverlay })}
    </div>
  );
}
