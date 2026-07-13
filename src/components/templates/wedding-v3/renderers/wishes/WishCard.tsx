"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { wishNeedsClamp } from "./wish-clamp";
import type { ApprovedWish } from "./WishesRenderer";
import styles from "./WishesRenderer.module.css";

/**
 * A single ripped-paper wish card. The paper hugs its content (the grid
 * top-aligns cards instead of stretching them); long messages are
 * line-clamped with an in-place "Read more" toggle so no single wish
 * dominates the wall. Shared by the preview grid (WishesRenderer) and the
 * full-page client grid (WishesGrid). The list key is owned by the caller's
 * `.map`, not here.
 */
export function WishCard({ wish }: { wish: ApprovedWish }) {
  const [expanded, setExpanded] = useState(false);
  const clampable = wishNeedsClamp(wish.message);

  return (
    <article className={styles.card}>
      <p className={cn(styles.message, clampable && !expanded && styles.messageClamped)}>
        {wish.message}
      </p>
      {clampable && (
        <button
          type="button"
          className={styles.readMore}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      {wish.authorName && (
        <footer className={styles.author}>— {wish.authorName}</footer>
      )}
    </article>
  );
}
