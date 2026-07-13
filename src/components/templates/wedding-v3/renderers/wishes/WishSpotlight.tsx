"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/**
 * Spotlight view for a long wish: the complete message on a larger paper
 * card above a dimmed, scroll-locked page. Mounted only while open and
 * portaled to <body> — the grid card's ancestors carry transforms (per-card
 * rotation, scroll-reveal wrappers) that would hijack position:fixed
 * containment if the overlay rendered in place. The tear/tape SVG filters
 * still resolve from the portal (url(#ww-…) is document-wide), but the
 * --wish-* palette does not, so the overlay re-applies `.wishVars`.
 *
 * Closes via ESC, backdrop click, or the × button; useFocusTrap returns
 * focus to the originating "Read more" button on unmount.
 */
export function WishSpotlight({
  wish,
  onClose,
}: {
  wish: ApprovedWish;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Backdrop dismissal arms on pointerdown: a press that starts on the card
  // and releases over the backdrop (drag/text-selection) fires its click on
  // the common ancestor — the overlay — and must NOT close the spotlight.
  const backdropArmed = useRef(false);

  useFocusTrap(dialogRef);
  useBodyScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className={cn(styles.wishVars, styles.spotlightOverlay)}
      onPointerDown={(e) => {
        backdropArmed.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (backdropArmed.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={wish.authorName ? `Wish from ${wish.authorName}` : "Wedding wish"}
        tabIndex={-1}
        className={cn(styles.card, styles.spotlightCard)}
      >
        <button
          type="button"
          className={styles.spotlightClose}
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
        <div className={styles.spotlightScroll}>
          <p className={styles.message}>{wish.message}</p>
          {wish.authorName && (
            <footer className={styles.author}>— {wish.authorName}</footer>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
