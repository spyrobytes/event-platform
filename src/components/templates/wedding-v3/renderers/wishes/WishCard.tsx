"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { getReducedMotionPreference } from "@/hooks/use-reduced-motion";
import { wishNeedsClamp } from "./wish-clamp";
import { WishSpotlight } from "./WishSpotlight";
import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/** Shared-element morph gate. Without the View Transitions API (or with
 *  reduced motion) the spotlight falls back to WishSpotlight's own
 *  fade/scale entrance and exit choreography. */
function canMorph(): boolean {
  return "startViewTransition" in document && !getReducedMotionPreference();
}

/**
 * A single ripped-paper wish card. The paper hugs its content (the grid
 * top-aligns cards instead of stretching them); long messages stay uniformly
 * clamped and "Read more" opens the full wish in a spotlight (WishSpotlight).
 *
 * This card owns the card→panel shared-element morph: it carries the
 * view-transition-name (.morphSource) ONLY around the snapshot instants —
 * before the open capture and inside the close update — because the panel
 * holds the same name statically and two live elements must never share it.
 * The flushSync calls make the React commit synchronous inside
 * startViewTransition's DOM-update callback, which is what the API requires
 * to capture old/new states (same pattern as the mobile-nav portal unmount).
 *
 * Shared by the preview grid (WishesRenderer) and the full-page client grid
 * (WishesGrid). The list key is owned by the caller's `.map`, not here.
 */
export function WishCard({ wish }: { wish: ApprovedWish }) {
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [morphSource, setMorphSource] = useState(false);
  // True when the open ran as a morph — the spotlight then suppresses its
  // fallback entrance animation and routes close back through closeMorph.
  const [morphOpen, setMorphOpen] = useState(false);
  // Bumped by every morph. A transition's finished-cleanup only runs when no
  // newer morph superseded it: focus returns to this button synchronously
  // during a close, so a reopen can land inside the 300ms reverse morph, and
  // the skipped close transition's finally would otherwise clobber the
  // reopened spotlight's morphOpen/morphSource.
  const morphGen = useRef(0);
  const clampable = wishNeedsClamp(wish.message);

  const openSpotlight = () => {
    if (!canMorph()) {
      setSpotlightOpen(true);
      return;
    }
    const gen = ++morphGen.current;
    // The old-state capture must see the grid card carrying the name.
    flushSync(() => setMorphSource(true));
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setMorphSource(false);
        setMorphOpen(true);
        setSpotlightOpen(true);
      });
    });
    // finished also resolves for skipped/interrupted transitions.
    transition.finished.finally(() => {
      if (morphGen.current === gen) setMorphSource(false);
    });
  };

  const closeMorph = () => {
    // Re-check at close time: the OS preference may have flipped while the
    // spotlight was open — never animate a close for a user who now asks
    // for reduced motion.
    if (getReducedMotionPreference()) {
      setSpotlightOpen(false);
      setMorphOpen(false);
      setMorphSource(false);
      return;
    }
    const gen = ++morphGen.current;
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setSpotlightOpen(false);
        setMorphSource(true);
      });
    });
    transition.finished.finally(() => {
      if (morphGen.current !== gen) return;
      setMorphSource(false);
      setMorphOpen(false);
    });
  };

  return (
    <article className={cn(styles.card, morphSource && styles.morphSource)}>
      <p
        className={cn(styles.message, clampable && styles.messageClamped)}
        // Hook for the no-JS unclamp in WishesRenderer's <noscript> style —
        // attribute selector because module class names are hashed.
        data-wish-clamped={clampable ? "" : undefined}
      >
        {wish.message}
      </p>
      {clampable && (
        <button
          type="button"
          className={styles.readMore}
          aria-haspopup="dialog"
          data-wish-readmore=""
          onClick={openSpotlight}
        >
          Read more
        </button>
      )}
      {wish.authorName && (
        <footer className={styles.author}>— {wish.authorName}</footer>
      )}
      {spotlightOpen && (
        <WishSpotlight
          wish={wish}
          onMorphClose={morphOpen ? closeMorph : undefined}
          onClose={() => setSpotlightOpen(false)}
        />
      )}
    </article>
  );
}
