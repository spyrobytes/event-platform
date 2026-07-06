"use client";

import { EventImage } from "@/components/media/EventImage";
import styles from "./AdjacentPreloads.module.css";

/** Minimal structural shape — any lightbox item type satisfies it. */
export type AdjacentPreloadItem = {
  assetId?: string | null;
  url: string;
  renditionWidths?: readonly number[] | null;
};

/**
 * Off-screen decode warmers for a lightbox's ±1 neighbours, so a swipe or
 * arrow commit swaps to an already-decoded frame. `loading="eager"` forces the
 * fetch despite the 1×1 off-screen box, and `sizes` MUST match the visible
 * stage's `sizes` so the warmer primes the same rendition the stage will
 * request (a mismatch downloads a rendition nobody displays). Scoped to ±1
 * only — never the whole gallery — to keep network pressure low on
 * image-heavy pages.
 *
 * Assumes wrap-around (modulo) navigation, like every lightbox in this
 * codebase. The post-event GalleryLightbox has its own next/image-based
 * variant (different image component + host allowlist).
 */
export function AdjacentPreloads({
  items,
  index,
  sizes,
}: {
  items: readonly AdjacentPreloadItem[];
  index: number;
  /** Must equal the lightbox stage's `sizes` prop. */
  sizes: string;
}) {
  if (items.length < 2) return null;
  const prev = items[(index - 1 + items.length) % items.length];
  const next = items[(index + 1) % items.length];
  const current = items[index];
  const seen = new Set<string>();
  const adjacent: AdjacentPreloadItem[] = [];
  for (const candidate of [prev, next]) {
    const key = candidate.assetId || candidate.url;
    if (candidate !== current && !seen.has(key)) {
      seen.add(key);
      adjacent.push(candidate);
    }
  }

  return (
    <div aria-hidden className={styles.preloads}>
      {adjacent.map((it, i) => (
        <EventImage
          key={it.assetId || i}
          src={it.url}
          alt=""
          width={1}
          height={1}
          sizes={sizes}
          renditionWidths={it.renditionWidths}
          loading="eager"
        />
      ))}
    </div>
  );
}
