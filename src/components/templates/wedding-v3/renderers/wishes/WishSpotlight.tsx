"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/** Keep in sync with the .overlayClosing animation duration in
 *  WishesRenderer.module.css. The unmount fallback timer adds headroom. */
const EXIT_MS = 200;

/**
 * Spotlight view for a long wish: the complete message on a larger paper
 * card above a dimmed, scroll-locked page. Mounted only while open and
 * portaled to <body> — the grid card's ancestors carry transforms (per-card
 * rotation, scroll-reveal wrappers) that would hijack position:fixed
 * containment if the overlay rendered in place. The overlay re-applies
 * `.wishVars` because the --wish-* palette doesn't reach the portal.
 *
 * Closing plays a CSS exit animation first: every dismissal path routes
 * through beginClose(), which flips the `closing` class; the real onClose
 * (unmount) fires on the overlay's animationend, with a timer fallback for
 * a dropped event (throttled background tab). Under prefers-reduced-motion
 * the exit is instant — animation:none would never fire animationend.
 * useFocusTrap returns focus to the originating "Read more" button.
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
  const [closing, setClosing] = useState(false);

  const beginClose = useCallback(() => {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
  }, [closing, onClose]);

  useFocusTrap(dialogRef);
  useBodyScrollLock(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") beginClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [beginClose]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, EXIT_MS + 80);
    return () => clearTimeout(timer);
  }, [closing, onClose]);

  return createPortal(
    <div
      className={cn(
        styles.wishVars,
        styles.spotlightOverlay,
        closing && styles.overlayClosing,
      )}
      onAnimationEnd={(e) => {
        // Only the overlay's own fade-out — the card's exit animation
        // bubbles here too and would unmount before the backdrop finishes.
        if (closing && e.target === e.currentTarget) onClose();
      }}
      onPointerDown={(e) => {
        backdropArmed.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (backdropArmed.current && e.target === e.currentTarget) beginClose();
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
          onClick={beginClose}
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
