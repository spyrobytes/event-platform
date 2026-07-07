"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isAllowedImageHost } from "@/lib/images/host";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";
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
 * Which photo a track slot shows, and where the slot sits (-1 = peeking
 * left, 0 = center, +1 = peeking right), given which slot currently holds
 * the center role.
 *
 * Photos rotate through the three slots so that on every index step the
 * incoming side slide simply *becomes* the center — same element, same src,
 * no on-screen swap — and only the far slide (off-screen) is assigned a new
 * photo. Slides are keyed by slot + item id: the two slots that keep their
 * item across a step keep their elements (and decoded frames), while the
 * far slide's key change remounts it off-screen with fresh load state. That
 * preserves the frame-holding smoothness rule the whole swipe stack is
 * built on: no visible element ever changes src or mounts.
 *
 * `centerSlot` is SEQUENTIAL state, advanced ±1 (mod 3) per navigation via
 * advanceCenterSlot — it cannot be derived from the index: stepping across
 * an album-boundary wrap on a count that isn't a multiple of 3 would
 * re-seat the center into a different slot and swap the visible src
 * (caught by the invariant tests).
 *
 * Invariants (unit-tested):
 *  - the three slots always cover offsets {-1, 0, +1};
 *  - a slot's item is always items[(index + offset) mod count];
 *  - any navigation sequence (including wraps) keeps two slots' items
 *    unchanged per step — the entering side becomes the center, and only
 *    the new far side changes.
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

/**
 * Full-screen image viewer rendered via portal so it escapes the parent
 * stacking context. Swipe/drag + keyboard nav (Esc / ← / →) come from
 * useSwipeNavigation in filmstrip track mode — the stage is a 3-slide track
 * so neighbors physically peek in during the drag, and a committed swipe
 * glides the strip one step (see trackSlotAssignment for the rotation
 * contract). Focus handoff/trap and the body-scroll lock come from the
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

  // Which persistent slot holds the center role — sequential rotation state
  // (see trackSlotAssignment). Rotated inside the SAME event that navigates
  // (the wrapped onPrev/onNext below), so the slide rotation and the parent
  // index update batch into one commit, AND the rotation direction comes
  // from the same call site the hook records for reanchor() — the two can
  // never disagree. (An index-delta inference would: a 2-item album's prev
  // step is indistinguishable from next by index alone, but NOT by glide
  // geometry — the review caught the wrong slide on screen mid-glide.)
  // The count guard keeps a single-photo album's keyboard no-op nav from
  // re-seating its lone slide.
  const count = items.length;
  const [centerSlot, setCenterSlot] = useState(0);
  const handlePrev = useCallback(() => {
    if (count > 1) setCenterSlot((s) => advanceCenterSlot(s, "prev"));
    onPrev();
  }, [count, onPrev]);
  const handleNext = useCallback(() => {
    if (count > 1) setCenterSlot((s) => advanceCenterSlot(s, "next"));
    onNext();
  }, [count, onNext]);

  // Swipe / drag navigation (mouse + touch + pen) in track mode. The hook
  // owns the imperative track translate + stage contract, the busy-gated
  // keyboard nav (Esc / ← / → via onClose), the backdrop drag/close
  // contract, and busy-gated prev/next for the arrow buttons. Esc goes
  // through closeLightbox so the flushSync BFCache mitigation is preserved.
  const reducedMotion = useReducedMotion();
  const { contentRef, handlers, backdropProps, prev, next, reanchor } =
    useSwipeNavigation<HTMLDivElement>({
      onPrev: handlePrev,
      onNext: handleNext,
      onClose: closeLightbox,
      enabled: items.length > 1,
      reducedMotion,
      track: true,
    });

  // Track-mode rotation partner: when the index commits, the slides render
  // into their rotated slots and this layout effect re-anchors the track
  // transform in the SAME paint (net visual change zero), then the hook
  // springs the strip home. Must be useLayoutEffect — a plain effect would
  // let the rotated slides paint one frame at the wrong offset.
  const prevIndexRef = useRef(index);
  useLayoutEffect(() => {
    if (prevIndexRef.current === index) return;
    prevIndexRef.current = index;
    reanchor();
  }, [index, reanchor]);

  // Focus handoff + Tab trap and body-scroll lock (shared across all
  // lightboxes). Esc/arrow handling lives in the swipe hook above, where it
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

  // Side slides double as the ±1 preload (they fetch the same rendition the
  // stage uses), so the old off-screen AdjacentPreloads stubs are gone. A
  // single-photo album needs no track — render just the center slide.
  const slots = items.length > 1 ? [0, 1, 2] : [centerSlot];

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
            touch-action / will-change / user-select / cursor — to it). */}
        <div className="relative h-full max-h-[85vh] w-full max-w-[95vw] overflow-hidden">
          <div ref={contentRef} {...handlers} className="absolute inset-0">
            {slots.map((slot) => {
              const { offset, itemIndex } = trackSlotAssignment(
                slot,
                centerSlot,
                index,
                items.length,
              );
              const item = items[itemIndex];
              return (
                <TrackSlide
                  // Keyed by slot + photo: across a rotation the entering
                  // side and the old center both keep their item, so their
                  // keys — and therefore their elements and decoded frames —
                  // persist (the center NEVER remounts on screen; a per-item
                  // key alone would collide in a 2-photo album where both
                  // sides show the same photo). Only the far side's item
                  // changes, and its key change remounts it OFF-screen with
                  // fresh per-element load state — which is what makes the
                  // stale-peek guard race-free: a stale load event can't
                  // outlive its element.
                  key={`${slot}-${item.id}`}
                  item={item}
                  offset={offset}
                />
              );
            })}
          </div>
        </div>
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

/**
 * One slide of the track. Sits at `offset * 100%` of the viewport;
 * aria-hidden unless centered. Its `slot + item` key means the element
 * lives exactly as long as this slot shows this photo — so `item.src`
 * never changes within an element's lifetime, and `settled` below can't
 * be confused by load events from a previous assignment.
 *
 * Stale-peek guard — SIDES ONLY: a freshly assigned side slide has no
 * meaningful frame to hold, so until its src loads (or errors) the img is
 * hidden behind the item's blur placeholder — an early peek shows a blur
 * of the REAL neighbor, never the wrong photo. The CENTER is exempt: it
 * paints progressively and frame-holds like the pre-track lightbox (the
 * organizer-approved no-flash behavior), including when fast navigation
 * rotates a still-loading side into view. After load, `decode()`
 * pre-decompresses the bitmap off-screen so the first composite during a
 * drag doesn't pay decode cost mid-gesture.
 */
function TrackSlide({
  item,
  offset,
}: {
  item: PublicGalleryItem;
  offset: -1 | 0 | 1;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  // "This element's src has finished loading — or definitively failed."
  // On error we settle rather than blur forever: the browser's broken-image
  // state is more honest than a permanent placeholder (and matches the
  // pre-track lightbox, which had no special error handling either).
  const [settled, setSettled] = useState(false);
  const hideStale = !settled && offset !== 0;

  return (
    <div
      aria-hidden={offset !== 0}
      className={cn(
        "absolute inset-0",
        offset === -1 && "-translate-x-full",
        offset === 1 && "translate-x-full",
      )}
    >
      <Image
        ref={imgRef}
        src={item.src}
        alt={offset === 0 ? item.alt : ""}
        fill
        sizes="95vw"
        className={cn("object-contain", hideStale && "invisible")}
        placeholder={item.blurDataUrl ? "blur" : "empty"}
        blurDataURL={item.blurDataUrl ?? undefined}
        priority={offset === 0}
        // Side slides sit outside the clipped viewport — native lazy
        // loading would never fetch them (same lesson as the old
        // AdjacentPreloads stubs), and they ARE the preload now.
        loading={offset === 0 ? undefined : "eager"}
        // Native HTML5 image-drag would hijack mouse swipes (ghost
        // image + lostpointercapture mid-gesture).
        draggable={false}
        unoptimized={!isAllowedImageHost(item.src)}
        onLoad={() => {
          setSettled(true);
          // Decode while off-screen so the first drag composites a
          // ready bitmap instead of decoding mid-gesture.
          imgRef.current?.decode?.().catch(() => {});
        }}
        onError={() => setSettled(true)}
      />
      {hideStale && item.blurDataUrl && (
        <div
          aria-hidden
          className="absolute inset-0 bg-contain bg-center bg-no-repeat [background-image:var(--peek-blur)]"
          style={{ "--peek-blur": `url(${item.blurDataUrl})` } as CSSProperties}
        />
      )}
    </div>
  );
}
