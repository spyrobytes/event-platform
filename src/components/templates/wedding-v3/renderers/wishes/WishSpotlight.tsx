"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useAnimationComplete } from "@/hooks/use-animation-complete";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { getReducedMotionPreference } from "@/hooks/use-reduced-motion";
import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/**
 * Spotlight view for a long wish: the complete message on a larger paper
 * card above a dimmed, scroll-locked page. Mounted only while open and
 * portaled to <body> — the grid card's ancestors carry transforms (per-card
 * rotation, scroll-reveal wrappers) that would hijack position:fixed
 * containment if the overlay rendered in place. The overlay re-applies
 * `.wishVars` because the --wish-* palette doesn't reach the portal.
 *
 * Every dismissal path (ESC / backdrop / ✕) routes through beginClose().
 * When the open ran as a shared-element morph (`onMorphClose` provided),
 * close is handed back to WishCard's closeMorph — the reverse view
 * transition contracts the panel into the grid card and unmounts
 * synchronously. Otherwise the CSS exit choreography runs: the `closing`
 * class plays a fade/sink and useAnimationComplete unmounts on the
 * overlay's own animationend (target-filtered — the card's exit bubbles
 * past it), with its fallback timer covering a dropped event in a
 * throttled background tab. Under prefers-reduced-motion the exit is
 * instant — animation:none would never fire animationend. useFocusTrap
 * returns focus to the originating "Read more" button either way.
 */
export function WishSpotlight({
  wish,
  onClose,
  onMorphClose,
}: {
  wish: ApprovedWish;
  onClose: () => void;
  /** Provided iff WishCard opened this spotlight via a view-transition
   *  morph — its presence selects the morph close path and suppresses the
   *  fallback entrance animation. */
  onMorphClose?: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Backdrop dismissal arms on pointerdown: a press that starts on the card
  // and releases over the backdrop (drag/text-selection) fires its click on
  // the common ancestor — the overlay — and must NOT close the spotlight.
  const backdropArmed = useRef(false);
  // The morph close runs ~300ms before the update callback unmounts us;
  // repeated ESC/✕ in that window would start new transitions that skip
  // (visibly cut) the running reverse morph.
  const morphCloseRequested = useRef(false);
  const [closing, setClosing] = useState(false);

  const beginClose = useCallback(() => {
    if (closing || morphCloseRequested.current) return;
    if (onMorphClose) {
      morphCloseRequested.current = true;
      onMorphClose();
      return;
    }
    if (getReducedMotionPreference()) {
      onClose();
      return;
    }
    setClosing(true);
  }, [closing, onMorphClose, onClose]);

  useFocusTrap(dialogRef);
  useBodyScrollLock(true);

  // Fallback exit: unmount when the overlay's fade-out animation completes.
  // Generous fallbackTimeout — it only exists for dropped events, and firing
  // early would pop the overlay out mid-animation.
  useAnimationComplete(overlayRef, closing ? "closing" : "open", onClose, {
    activeStates: ["closing"],
    fallbackTimeout: 400,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") beginClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [beginClose]);

  return createPortal(
    <div
      ref={overlayRef}
      className={cn(
        styles.wishVars,
        styles.spotlightOverlay,
        closing && styles.overlayClosing,
      )}
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
        className={cn(
          styles.card,
          styles.spotlightCard,
          onMorphClose && styles.spotlightNoEnter,
        )}
      >
        <button
          type="button"
          className={styles.spotlightClose}
          aria-label="Close"
          onClick={beginClose}
        >
          ✕
        </button>
        {/* tabIndex: the message can overflow this container while body
            scroll is locked — without focus, keyboard users could never
            reach the text below the fold (arrow keys would target the
            frozen document). The focus trap's [tabindex] selector picks
            it up automatically. */}
        <div
          className={styles.spotlightScroll}
          tabIndex={0}
          role="region"
          aria-label="Wish message"
        >
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
