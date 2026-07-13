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

/** Real chars-per-line across every grid layout stays ≤ ~44: three-col
 *  ≈ 36–37, two-col ≈ 27–44, and single-column card width is capped at
 *  26rem (see the 620px media block in WishesRenderer.module.css — that cap
 *  is what upholds this bound; without it a ~600px viewport fits 55+).
 *  Assuming 50 therefore errs low EVERYWHERE: the estimate never exceeds
 *  the rendered line count, so a miss is a taller card — never a clamp (and
 *  "Read more") on text that already fits. */
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
