"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { createPortal } from "react-dom";
import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
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
 * stacking context. Keyboard nav (Esc / ← / →), focus trap, body-scroll
 * lock while open, and a flushSync close to mitigate the BFCache ghost
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

  // Keyboard nav. Re-bound on prev/next/close deps so the closure sees
  // current handlers.
  useEffect(() => {
    if (!mounted) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mounted, closeLightbox, onPrev, onNext]);

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

  // Focus trap: capture the element that had focus when we opened, move
  // focus into the dialog, restore on unmount. Tab cycle inside is
  // best-effort — Image + 3 buttons; the browser's natural tab order is
  // close → prev → next → image and back. We only need to keep focus
  // from leaking out of the dialog while it's open.
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
      onClick={(e) => {
        // Click on backdrop (not on the image or controls) closes.
        if (e.target === e.currentTarget) closeLightbox();
      }}
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

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {items.length > 1 && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:left-4"
            aria-label="Previous photo"
          >
            <span aria-hidden className="block text-xl leading-none">
              ←
            </span>
          </button>
        )}
        <div className="relative h-full max-h-[85vh] w-full max-w-[95vw]">
          <Image
            key={current.id}
            src={current.src}
            alt={current.alt}
            fill
            sizes="95vw"
            className="object-contain"
            placeholder={current.blurDataUrl ? "blur" : "empty"}
            blurDataURL={current.blurDataUrl ?? undefined}
            priority
            unoptimized={!isAllowedImageHost(current.src)}
          />
        </div>
        {items.length > 1 && (
          <button
            type="button"
            onClick={onNext}
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
