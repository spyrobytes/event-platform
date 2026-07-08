"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isAllowedImageHost } from "@/lib/images/host";
import { useLightboxTrack } from "@/hooks/use-lightbox-track";
import { LightboxTrack, LightboxTrackSlide } from "@/components/media/LightboxTrackSlide";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import type { PublicGalleryItem } from "@/schemas/gallery";

// useSyncExternalStore-based "is the client mounted" check. Returns false
// during SSR + the first client render (matching server output, avoiding
// hydration mismatch), then true on the second client render so the
// portal can mount. The codebase's react-hooks lint forbids setState in
// useEffect — this is the lint-clean equivalent.
const subscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

type Props = {
  items: PublicGalleryItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * Full-screen image viewer rendered via portal so it escapes the parent
 * stacking context. The stage is a filmstrip track (useLightboxTrack /
 * LightboxTrackSlide own the slot rotation, stale-peek guard, and the
 * swipe + keyboard + backdrop contracts); the side slides double as the ±1
 * preload. Focus handoff/trap and the body-scroll lock come from the
 * shared useFocusTrap / useBodyScrollLock hooks. This component owns the
 * flushSync close that mitigates the BFCache ghost issue documented in
 * project_v2_mobile_nav_bfcache.
 */
export function GalleryLightbox({ items, index, onClose, onPrev, onNext }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // `mounted` gates createPortal so SSR doesn't try to mount into a
  // non-existent document.body.
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const closeLightbox = useCallback(() => {
    // flushSync forces the portal to unmount synchronously before any
    // subsequent navigation, so a BFCache restore doesn't bring back a
    // ghost dialog. See project_v2_mobile_nav_bfcache.
    flushSync(() => {
      onClose();
    });
  }, [onClose]);

  // Filmstrip track: slot rotation + swipe/drag + busy-gated keyboard nav
  // (Esc / ← / → via onClose) + the backdrop drag/close contract. Esc goes
  // through closeLightbox so the flushSync BFCache mitigation is preserved.
  const { trackRef, trackProps, backdropProps, prev, next, slides } =
    useLightboxTrack({
      items,
      index,
      getItemKey: (item) => item.id,
      onPrev,
      onNext,
      onClose: closeLightbox,
    });

  // Focus handoff + Tab trap and body-scroll lock (shared across all
  // lightboxes). Esc/arrow handling lives in the track hook above, where it
  // can be gated on the gesture's busy state.
  useFocusTrap(containerRef, mounted);
  useBodyScrollLock(mounted);

  // BFCache safety: when this page is restored from BFCache (e.g. mobile
  // Back), unmount immediately. The keyboard handlers + scroll lock
  // re-attach if the user re-opens.
  useEffect(() => {
    if (!mounted) return;
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) closeLightbox();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [mounted, closeLightbox]);

  if (!mounted) return null;

  const current = items[index];
  if (!current) return null;

  const node = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt || `Photo ${index + 1} of ${items.length}`}
      tabIndex={-1}
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 outline-none"
      // Backdrop tap closes; a drag that ends here doesn't (the hook's
      // backdropProps package the didDrag disambiguation + re-arm).
      {...backdropProps}
    >
      <header className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm tabular-nums" aria-live="polite">
          {index + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={closeLightbox}
          className="rounded-full p-2 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close"
        >
          <span aria-hidden className="block text-xl leading-none">
            ✕
          </span>
        </button>
      </header>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        // Mirror the dialog-root backdrop handler so the dark space
        // around the image also closes on a tap (but never on the click
        // that ends a drag). Spreading the same backdropProps on both
        // elements is safe: the inner handler consumes the drag guard and
        // the bubbled outer click fails its own-target check.
        {...backdropProps}
      >
        {items.length > 1 && (
          <button
            type="button"
            // Busy-gated wrapper: a click mid-gesture or mid-settle-glide
            // can't swap src mid-animation.
            onClick={prev}
            className="absolute left-2 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-4"
            aria-label="Previous photo"
          >
            <span aria-hidden className="block text-xl leading-none">
              ←
            </span>
          </button>
        )}
        {/* Viewport clips the strip; the TRACK is the element the swipe
            gesture translates (the hook applies the gesture contract —
            touch-action / will-change / user-select / cursor — to it).
            Side slides double as the ±1 preload: they fetch the same
            rendition the stage uses. */}
        <LightboxTrack
          trackRef={trackRef}
          trackProps={trackProps}
          className="relative h-full max-h-[85vh] w-full max-w-[95vw]"
        >
          {slides.map(({ key, offset, item }) => (
              <LightboxTrackSlide
                key={key}
                offset={offset}
                blurDataUrl={item.blurDataUrl}
              >
                {({ imageProps, hideStale, staleOverlay }) => (
                  <>
                    <Image
                      src={item.src}
                      alt={offset === 0 ? item.alt : ""}
                      fill
                      sizes="95vw"
                      className={cn("object-contain", hideStale && "invisible")}
                      placeholder={item.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={item.blurDataUrl ?? undefined}
                      priority={offset === 0}
                      unoptimized={!isAllowedImageHost(item.src)}
                      {...imageProps}
                    />
                    {staleOverlay}
                  </>
                )}
              </LightboxTrackSlide>
          ))}
        </LightboxTrack>
        {items.length > 1 && (
          <button
            type="button"
            onClick={next}
            className="absolute right-2 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:right-4"
            aria-label="Next photo"
          >
            <span aria-hidden className="block text-xl leading-none">
              →
            </span>
          </button>
        )}
      </div>

      {current.caption && (
        <footer className="px-4 py-3 text-center text-sm text-white/80">
          {current.caption}
        </footer>
      )}
    </div>
  );

  return createPortal(node, document.body);
}
