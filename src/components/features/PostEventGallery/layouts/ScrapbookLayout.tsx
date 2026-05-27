"use client";

import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import type { GalleryLayoutProps } from "./types";
import styles from "./ScrapbookLayout.module.css";

/**
 * Deterministic rotation angles, cycled by item index. Hand-picked to
 * feel playful without anyone tile being so tilted it reads as broken.
 * Order matters — adjacent tiles should lean in opposite directions to
 * avoid all cards drifting the same way across the grid.
 */
const ROTATIONS = [
  "-2deg",
  "1.5deg",
  "-1deg",
  "2.5deg",
  "-1.5deg",
  "1deg",
  "-2.5deg",
  "0.5deg",
] as const;

function rotationFor(index: number): string {
  return ROTATIONS[index % ROTATIONS.length];
}

/**
 * Scrapbook Memories — playful, polaroid-styled card grid.
 *
 * Each card sits at a deterministic angle (driven by index, not
 * Math.random, so SSR ↔ client agree and the layout doesn't shift on
 * re-render). On mobile the rotation amplitude is dialed to ~45% via
 * the stylesheet's media-query cascade — the tilt reads as a flourish,
 * not a usability tax. Caption sits under the photo in the polaroid's
 * white margin.
 */
export function ScrapbookLayout({ items, onOpenLightbox }: GalleryLayoutProps) {
  return (
    <div className={styles.grid}>
      {items.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpenLightbox(idx)}
          className={styles.card}
          style={{ "--rotation": rotationFor(idx) } as React.CSSProperties}
          aria-label={item.alt || `Open photo ${idx + 1}`}
        >
          <div className={styles.cardInner}>
            <div className={styles.imgWrap}>
              <Image
                src={item.thumbnailSrc}
                alt={item.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className={styles.img}
                placeholder={item.blurDataUrl ? "blur" : "empty"}
                blurDataURL={item.blurDataUrl ?? undefined}
                unoptimized={!isAllowedImageHost(item.thumbnailSrc)}
              />
            </div>
            {item.caption && <p className={styles.caption}>{item.caption}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}
