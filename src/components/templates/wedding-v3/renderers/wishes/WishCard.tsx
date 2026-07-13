"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { wishNeedsClamp } from "./wish-clamp";
import { WishSpotlight } from "./WishSpotlight";
import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/**
 * A single ripped-paper wish card. The paper hugs its content (the grid
 * top-aligns cards instead of stretching them); long messages stay uniformly
 * clamped and "Read more" opens the full wish in a spotlight (WishSpotlight)
 * above the page. Shared by the preview grid (WishesRenderer) and the
 * full-page client grid (WishesGrid). The list key is owned by the caller's
 * `.map`, not here.
 */
export function WishCard({ wish }: { wish: ApprovedWish }) {
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const clampable = wishNeedsClamp(wish.message);

  return (
    <article className={styles.card}>
      <p className={cn(styles.message, clampable && styles.messageClamped)}>
        {wish.message}
      </p>
      {clampable && (
        <button
          type="button"
          className={styles.readMore}
          aria-haspopup="dialog"
          onClick={() => setSpotlightOpen(true)}
        >
          Read more
        </button>
      )}
      {wish.authorName && (
        <footer className={styles.author}>— {wish.authorName}</footer>
      )}
      {spotlightOpen && (
        <WishSpotlight wish={wish} onClose={() => setSpotlightOpen(false)} />
      )}
    </article>
  );
}
