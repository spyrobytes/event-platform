"use client";

import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import type { GalleryLayoutProps } from "./types";
import styles from "./RomanticMasonryLayout.module.css";

/**
 * Romantic Masonry — variable-height CSS-columns masonry.
 *
 * Photos preserve their natural aspect ratio so portrait and landscape
 * shots flow organically. Hover lifts each frame with a soft shadow
 * growth (disabled under `prefers-reduced-motion`). CSS columns are
 * sufficient at the gallery's 50-item cap — no measured-layout library
 * needed.
 *
 * Aspect ratio is read off the item's `width`/`height` when available
 * (the worker fills both for every imported photo), falling back to the
 * stylesheet's 4:3 default for items without dimensions. This prevents
 * cumulative layout shift while images stream in.
 */
export function RomanticMasonryLayout({
  items,
  onOpenLightbox,
}: GalleryLayoutProps) {
  return (
    <div className={styles.masonry}>
      {items.map((item, idx) => {
        const aspectRatio =
          item.width && item.height ? `${item.width} / ${item.height}` : undefined;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenLightbox(idx)}
            className={styles.frame}
            aria-label={item.alt || `Open photo ${idx + 1}`}
          >
            <div
              className={styles.imgWrap}
              style={aspectRatio ? { aspectRatio } : undefined}
            >
              <Image
                src={item.thumbnailSrc}
                alt={item.alt}
                fill
                sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 33vw"
                className={styles.img}
                placeholder={item.blurDataUrl ? "blur" : "empty"}
                blurDataURL={item.blurDataUrl ?? undefined}
                unoptimized={!isAllowedImageHost(item.thumbnailSrc)}
              />
            </div>
            {item.caption && <p className={styles.caption}>{item.caption}</p>}
          </button>
        );
      })}
    </div>
  );
}
