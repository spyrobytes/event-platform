"use client";

import { useEffect, type RefObject } from "react";

/**
 * Minimum scale the hook will apply. Below this, type becomes unreadable —
 * better to let the residual overflow clip than to render 6px text.
 */
const MIN_FIT_SCALE = 0.55;

/**
 * useFitScale — shrink-to-fit backstop for fixed-size invitation cards.
 *
 * The animated invitation templates (SplitRevealCard, GoldenCardReveal,
 * FlipFlapReveal, WeddingStorybook cover) render user content into a
 * fixed-height card face. Their compact/extreme density cascades absorb the
 * common crowded cases, but schema-max content (80-char family names +
 * ceremony AND reception + long couple names) can still exceed the card and
 * clip vital content — including the RSVP CTA. Per the design principle that
 * a scrollable invitation is a visual smell, the last-resort fix is to scale
 * the whole content stack down uniformly until it fits.
 *
 * The hook measures the natural height of `contentRef`'s children (union of
 * their offsetTop/offsetHeight boxes) against the padding-box of
 * `containerRef` and writes the resulting factor to the `--fit-scale`
 * custom property on the content element. The template's CSS Module
 * consumes the scalar inside its existing transform declarations
 * (e.g. `transform: translateY(0) scale(var(--fit-scale, 1))`), so all
 * styling stays in the module. Scale only ever shrinks (≤ 1) and is floored
 * at MIN_FIT_SCALE.
 *
 * Measurement uses offset* layout metrics deliberately: they ignore CSS
 * transforms, so reveal translations, an already-applied --fit-scale, and
 * mid-transition frames can never skew a re-measure. This requires the
 * measured children to share one offsetParent (true for a plain flex stack —
 * don't add `position` to individual content blocks) and to keep their
 * natural layout height: give them `flex-shrink: 0` or a crushed child
 * measures at its crushed height.
 *
 * Re-measures on container resize, font load, and whenever `deps` change.
 */
export function useFitScale(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  deps: readonly unknown[] = []
): void {
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let frame: number | null = null;
    let disposed = false;
    // Seed from the element so a re-run (deps change) can still clear a
    // previously applied scale when the new content fits at 1.
    let appliedScale =
      parseFloat(content.style.getPropertyValue("--fit-scale")) || 1;

    const measure = () => {
      frame = null;
      if (disposed || !container.isConnected) return;

      const containerStyle = getComputedStyle(container);
      const available =
        container.clientHeight -
        parseFloat(containerStyle.paddingTop) -
        parseFloat(containerStyle.paddingBottom);
      if (!(available > 0)) return;

      let top = Infinity;
      let bottom = -Infinity;
      for (const node of content.children) {
        const child = node as HTMLElement;
        if (child.offsetHeight === 0) continue;
        top = Math.min(top, child.offsetTop);
        bottom = Math.max(bottom, child.offsetTop + child.offsetHeight);
      }
      if (bottom <= top) return;

      const nextScale = Math.min(
        1,
        Math.max(MIN_FIT_SCALE, available / (bottom - top))
      );

      if (Math.abs(nextScale - appliedScale) < 0.01) return;
      appliedScale = nextScale;
      if (nextScale >= 1) {
        content.style.removeProperty("--fit-scale");
      } else {
        content.style.setProperty("--fit-scale", String(nextScale));
      }
    };

    const scheduleMeasure = () => {
      if (disposed || frame !== null) return;
      frame = requestAnimationFrame(measure);
    };

    scheduleMeasure();

    // Web fonts change text metrics — re-measure once they settle. This can
    // resolve after cleanup; the disposed flag makes it a guaranteed no-op.
    document.fonts?.ready.then(scheduleMeasure).catch(() => {});

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's re-measure signal
  }, [containerRef, contentRef, ...deps]);
}
