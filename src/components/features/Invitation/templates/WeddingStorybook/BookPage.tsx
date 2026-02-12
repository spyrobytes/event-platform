"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TOTAL_PAGES } from "./types";
import styles from "./BookPage.module.css";

type BookPageProps = {
  index: number;
  currentSpread: number;
  variant: "dark" | "light" | "accent";
  children: ReactNode;
};

/**
 * A single page panel in the 3D book.
 *
 * Geometry:
 *  - All pages are width:50%, positioned at right:0 (except page 0 → left:0)
 *  - transform-origin is the left edge (the "spine")
 *  - Flipped pages rotate -180° around the Y axis
 *  - Even-indexed pages (>0) have their inner content pre-rotated 180°
 *    so that when the page flips, content reads correctly on the left side
 *  - backface-visibility:hidden on the inner ensures only the correct
 *    face is visible at any given time
 */
export function BookPage({
  index,
  currentSpread,
  variant,
  children,
}: BookPageProps) {
  const isFixedLeft = index === 0;
  const isFlipped = !isFixedLeft && index <= currentSpread * 2;
  const isBackFace = !isFixedLeft && index % 2 === 0;

  const spreadIndex = Math.floor(index / 2);
  const isActive = spreadIndex === currentSpread;

  const zIndex = isFixedLeft
    ? 1
    : isFlipped
      ? 10 + index
      : TOTAL_PAGES - index;

  return (
    <div
      className={cn(
        styles.page,
        isFixedLeft && styles.fixedLeft,
        isFlipped && styles.flipped,
      )}
      style={{ zIndex }}
      aria-hidden={!isActive}
    >
      <div
        className={cn(
          styles.pageInner,
          isBackFace && styles.backFace,
          styles[variant],
        )}
      >
        {/* Spine edge shadow */}
        <div className={styles.spineShadow} aria-hidden />

        {/* Page content with reveal animation */}
        <div
          className={cn(
            styles.content,
            isActive && styles.contentActive,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
