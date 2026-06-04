"use client";

import type { CSSProperties } from "react";

type RevealMoreButtonProps = {
  /** Visible CTA text, e.g. "View more memories". */
  label: string;
  onClick: () => void;
  /** Hidden-item count; appended as "(N)" and announced for screen readers. */
  remaining?: number;
  /**
   * Fully styles the button — when provided, the default ghost-pill styling is
   * skipped (the caller owns appearance, e.g. a CSS-module class).
   */
  className?: string;
  /** Style overrides merged onto the default styling (ignored if className set). */
  style?: CSSProperties;
};

const DEFAULT_BUTTON_STYLE: CSSProperties = {
  fontFamily: "var(--sans, inherit)",
  fontSize: "var(--sm, 0.9rem)",
  fontWeight: 500,
  letterSpacing: "0.02em",
  color: "inherit",
  background: "transparent",
  // Derive the border from the inherited text colour so it stays visible on
  // both light and dark section themes (no theme defines a `--line` token).
  border: "1px solid color-mix(in srgb, currentColor 35%, transparent)",
  borderRadius: 999,
  padding: "0.7em 1.7em",
  cursor: "pointer",
  transition: "background 0.25s ease, border-color 0.25s ease, opacity 0.25s ease",
};

/**
 * Centered "reveal more" CTA for progressively-loaded image grids.
 *
 * Pair with `useProgressiveReveal`: render it after the grid when `hasMore` is
 * true. Inherits the surrounding section's text colour, and derives its border
 * from that same colour (`currentColor`), so it stays visible on both light and
 * dark section themes. Pass `className` to fully theme it (e.g. V2 CSS modules).
 */
export function RevealMoreButton({
  label,
  onClick,
  remaining,
  className,
  style,
}: RevealMoreButtonProps) {
  const hasCount = typeof remaining === "number" && remaining > 0;
  const text = hasCount ? `${label} (${remaining})` : label;
  const ariaLabel = hasCount ? `${label}, ${remaining} more` : label;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "clamp(28px, 4vw, 44px)",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={className}
        style={className ? style : { ...DEFAULT_BUTTON_STYLE, ...style }}
      >
        {text}
      </button>
    </div>
  );
}
