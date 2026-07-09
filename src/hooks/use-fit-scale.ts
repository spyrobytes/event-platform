"use client";

import { useEffect, useRef, type RefObject } from "react";

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
 * their border boxes, corrected for any scale already applied) against the
 * padding-box of `containerRef` and writes the resulting factor to the
 * `--fit-scale` custom property on the content element. The template's CSS
 * Module consumes the scalar inside its existing transform declarations
 * (e.g. `transform: translateY(0) scale(var(--fit-scale, 1))`), so all
 * styling stays in the module. Scale only ever shrinks (≤ 1) and is floored
 * at MIN_FIT_SCALE.
 *
 * Re-measures on container resize, font load, and whenever `deps` change.
 * Content elements must not be crushable by flex (give the measured children
 * `flex-shrink: 0`) or the measurement reads the crushed height.
 */
export function useFitScale(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  deps: readonly unknown[] = []
): void {
  // The scale currently applied to the content element. Measurements via
  // getBoundingClientRect include this transform, so it must be divided
  // back out to recover the natural (unscaled) content height.
  const appliedScaleRef = useRef(1);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const containerStyle = getComputedStyle(container);
      const available =
        container.clientHeight -
        parseFloat(containerStyle.paddingTop) -
        parseFloat(containerStyle.paddingBottom);
      if (available <= 0) return;

      let top = Infinity;
      let bottom = -Infinity;
      for (const child of content.children) {
        const rect = (child as HTMLElement).getBoundingClientRect();
        if (rect.height === 0) continue;
        top = Math.min(top, rect.top);
        bottom = Math.max(bottom, rect.bottom);
      }
      if (bottom <= top) return;

      const naturalHeight = (bottom - top) / appliedScaleRef.current;
      const nextScale = Math.min(
        1,
        Math.max(MIN_FIT_SCALE, available / naturalHeight)
      );

      if (Math.abs(nextScale - appliedScaleRef.current) < 0.01) return;
      appliedScaleRef.current = nextScale;
      if (nextScale >= 1) {
        content.style.removeProperty("--fit-scale");
      } else {
        content.style.setProperty("--fit-scale", String(nextScale));
      }
    };

    const scheduleMeasure = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(measure);
    };

    scheduleMeasure();

    // Web fonts change text metrics — re-measure once they settle.
    document.fonts?.ready.then(scheduleMeasure).catch(() => {});

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the caller's re-measure signal
  }, [containerRef, contentRef, ...deps]);
}
