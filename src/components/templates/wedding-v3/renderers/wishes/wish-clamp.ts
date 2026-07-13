/**
 * Deterministic "does this wish need a Read more toggle?" heuristic.
 *
 * The CSS clamp (`.messageClamped` in WishesRenderer.module.css) does the
 * actual truncation; this only decides whether to APPLY it. Deciding from the
 * message text rather than DOM measurement keeps WishCard hydration-safe and
 * free of layout-measurement effects (react-hooks/set-state-in-effect).
 *
 * The estimate errs LOW on purpose (generous chars-per-line): a missed clamp
 * degrades to a taller card, while clamping a message that actually fits
 * would show a "Read more" that reveals nothing.
 */

/** Visible lines when clamped — keep in sync with `-webkit-line-clamp` on
 *  `.messageClamped` in WishesRenderer.module.css. */
export const WISH_CLAMP_LINES = 7;

/** Narrowest card content width is ~290px, which fits ~40 chars of 1.08rem
 *  Georgia per line; 50 keeps the line estimate below what actually renders. */
const CHARS_PER_LINE = 50;

/** Messages render with `white-space: pre-wrap`, so forced breaks ("\n")
 *  produce line boxes just like soft wraps — count both. */
export function estimateWishLines(message: string): number {
  return message
    .split("\n")
    .reduce(
      (lines, segment) => lines + Math.max(1, Math.ceil(segment.length / CHARS_PER_LINE)),
      0,
    );
}

export function wishNeedsClamp(message: string): boolean {
  return estimateWishLines(message) > WISH_CLAMP_LINES;
}
