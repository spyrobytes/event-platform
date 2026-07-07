"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation";
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
 * stacking context. Swipe/drag + keyboard nav (Esc / ← / →) come from
 * useSwipeNavigation (busy-gated, with Esc routed through the flushSync
 * close below); this component owns the Tab focus trap, body-scroll lock
 * while open, and the flushSync close that mitigates the BFCache ghost
 * issue documented in project_v2_mobile_nav_bfcache.
 *
 * Verify on a real mobile browser before flipping that memory to resolved:
 * open lightbox → hit native Back → forward → confirm no DOM ghost.
 */
export function GalleryLightbox({ items, index, onClose, onPrev, onNext }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
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

  // Swipe / drag navigation (mouse + touch + pen). The hook owns the
  // imperative translate + cursor on the stage, the busy-gated keyboard
  // nav (Esc / ← / → via onClose), the backdrop drag/close contract, and
  // busy-gated prev/next for the arrow buttons. Esc goes through
  // closeLightbox so the flushSync BFCache mitigation is preserved.
  const reducedMotion = useReducedMotion();
  const { contentRef, handlers, backdropProps, prev, next } =
    useSwipeNavigation<HTMLDivElement>({
      onPrev,
      onNext,
      onClose: closeLightbox,
      enabled: items.length > 1,
      reducedMotion,
    });

  // Focus-trap Tab boundary wrap. (Esc/arrow handling lives in the swipe
  // hook above, where it can be gated on the gesture's busy state.)
  useEffect(() => {
    if (!mounted) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        // Real focus trap: query focusables inside the dialog and wrap
        // at the boundaries. Without this, Tab past the last button
        // leaks focus to the page underneath the modal — accessibility
        // bug for keyboard / screen-reader users.
        const root = containerRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button, [href], input, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mounted]);

  // Body-scroll lock while open. Saves the prior overflow so we restore
  // it cleanly even if it was already non-default (some themes set
  // `overflow: hidden` for modal stacks).
  useEffect(() => {
    if (!mounted) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prior;
    };
  }, [mounted]);

  // Open/close focus handoff: snapshot the previously-focused element,
  // move focus into the dialog, restore on unmount. Tab cycling within
  // the dialog is handled by the keydown trap above.
  useEffect(() => {
    if (!mounted) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, [mounted]);

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
        {/* Stage — the single element the swipe gesture translates.
            touch-action keeps vertical scroll + pinch-zoom native while we
            own horizontal; will-change pre-materializes the compositor
            layer so the FIRST drag doesn't jank promoting it — only when a
            gesture is possible: a single-photo lightbox would otherwise
            hold a full-viewport GPU layer for nothing. */}
        <div
          ref={contentRef}
          {...handlers}
          className={`relative h-full max-h-[85vh] w-full max-w-[95vw] touch-pan-y touch-pinch-zoom select-none ${
            items.length > 1 ? "will-change-transform" : ""
          }`}
        >
          <Image
            // Intentionally NO `key` here. With a per-item key, every
            // prev/next click unmounts the Image and a fresh one mounts
            // with `placeholder=blur` — re-showing the blur backdrop
            // before the new image streams in. That's the flash the
            // organizer reported during smoke-test. Without the key,
            // React reuses the same Image and just swaps `src`; the
            // browser holds the previous frame visible until the next
            // bytes arrive — no blur reset, no flash.
            src={current.src}
            alt={current.alt}
            fill
            sizes="95vw"
            className="object-contain"
            // Blur placeholder still fires on the FIRST mount (lightbox
            // open). Subsequent navigations skip it because the Image
            // component persists.
            placeholder={current.blurDataUrl ? "blur" : "empty"}
            blurDataURL={current.blurDataUrl ?? undefined}
            priority
            // Native HTML5 image-drag would hijack mouse swipes (ghost
            // image + lostpointercapture mid-gesture).
            draggable={false}
            unoptimized={!isAllowedImageHost(current.src)}
          />
        </div>
        <AdjacentPreloads items={items} index={index} />
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
 * Off-screen Image stubs for the items adjacent to `index`. Next.js
 * Image fetches them at full resolution as soon as they mount, so by
 * the time the user clicks Next (or Prev) the bytes are already in the
 * HTTP cache and the visible <Image>'s src swap is effectively instant.
 *
 * Rendered as `width=1 height=1` `aria-hidden` images positioned far
 * off-screen — invisible to sighted users and assistive tech, but the
 * browser still issues the fetch.
 *
 * We don't preload the rest of the gallery — only ±1 — to keep the
 * priming cheap on slow connections. Adjacent-only matches the natural
 * navigation pattern (left/right keystrokes).
 */
function AdjacentPreloads({
  items,
  index,
}: {
  items: PublicGalleryItem[];
  index: number;
}) {
  if (items.length < 2) return null;
  const prev = items[(index - 1 + items.length) % items.length];
  const next = items[(index + 1) % items.length];
  // Same id at +1 and -1 only happens with a 2-item gallery; dedupe so
  // we don't issue the same fetch twice in that edge case.
  const ids = new Set<string>();
  const adjacent: PublicGalleryItem[] = [];
  for (const item of [prev, next]) {
    if (item && item.id !== items[index].id && !ids.has(item.id)) {
      ids.add(item.id);
      adjacent.push(item);
    }
  }
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: -9999,
        left: -9999,
        width: 1,
        height: 1,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {adjacent.map((item) => (
        <Image
          key={item.id}
          src={item.src}
          alt=""
          width={1}
          height={1}
          // `sizes="95vw"` matches the visible lightbox Image so the
          // browser's srcset picker fetches the same high-res variant
          // it will need on navigation — not a 1px optimizer thumbnail.
          // Without this we'd be priming the cache with the wrong asset.
          sizes="95vw"
          // CRITICAL: without `loading="eager"`, Next.js Image defaults
          // to `loading="lazy"` for non-priority Images. Native
          // lazy-loading then gates the fetch on viewport intersection
          // — and a 1×1 element parked at top:-9999/left:-9999 never
          // intersects, so the browser never fetches the resource and
          // the entire preload helper becomes a no-op. `eager` forces
          // the fetch immediately without injecting a
          // `<link rel="preload">` (which `priority` would do — that's
          // reserved for the visible image, which already has it).
          loading="eager"
          unoptimized={!isAllowedImageHost(item.src)}
        />
      ))}
    </div>
  );
}
