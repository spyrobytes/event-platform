"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TOTAL_PAGES } from "./types";
import type { LayoutMode } from "./useLayoutMode";
import styles from "./BookPage.module.css";

type BookPageProps = {
  index: number;
  currentSpread: number;
  variant: "dark" | "light" | "accent";
  children: ReactNode;
  /** Active layout; defaults to spread for backward compat. */
  layoutMode?: LayoutMode;
  /** Active page index in single mode (0..TOTAL_PAGES-1). Ignored in spread. */
  currentPage?: number;
};

/**
 * A single page panel.
 *
 * Spread mode (default — landscape / wide viewports):
 *  - All pages are width:50%, positioned at right:0 (except page 0 → left:0)
 *  - transform-origin is the left edge (the "spine")
 *  - Flipped pages rotate -180° around the Y axis
 *  - Even-indexed pages (>0) have their inner content pre-rotated 180°
 *    so content reads correctly on the left side after flip
 *  - backface-visibility:hidden on the inner ensures only the correct face
 *    is visible at any given time
 *
 * Single mode (portrait / narrow viewports):
 *  - Each page fills the book; no spine, no 3D rotation
 *  - Slide-based nav: active page at translateX(0); pages ahead of the
 *    active one wait at +100%, pages behind sit at -100%. When React
 *    re-renders with a new currentPage, every mounted page's transform
 *    animates to its new position, producing a horizontal page turn.
 *  - Default direction: forward advances the slide leftward (new page
 *    enters from right). Confirm on-device before opening the PR —
 *    invert the ahead/behind signs below if it reads backward.
 */
export function BookPage({
  index,
  currentSpread,
  variant,
  children,
  layoutMode = "spread",
  currentPage = 0,
}: BookPageProps) {
  if (layoutMode === "single") {
    const offset = index - currentPage;
    const isActive = offset === 0;
    const isAhead = offset > 0;
    const isBehind = offset < 0;

    return (
      <div
        className={cn(
          styles.page,
          styles.single,
          isActive && styles.active,
          isAhead && styles.ahead,
          isBehind && styles.behind,
        )}
        aria-hidden={!isActive}
      >
        <div className={cn(styles.pageInner, styles[variant])}>
          <div
            className={cn(styles.content, isActive && styles.contentActive)}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

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
