"use client";

/**
 * Magazine Grid Gallery — The Editorial
 *
 * Editorial photo grid with mixed aspect ratios and thin 4px gutters.
 * Images follow a 12-column grid pattern that creates visual rhythm:
 * large hero → portrait → three squares → full-width cinematic.
 */

import { useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import styles from "./MagazineGrid.module.css";

export function MagazineGrid({
  data,
  assets,
}: SectionRendererProps<GallerySection["data"]>) {
  const normalized = useMemo(() => normalizeGalleryData(data), [data]);

  const resolvedItems = useMemo(() => {
    return normalized.items
      .map((item) => {
        const asset = assets.find((a) => a.id === item.assetId);
        if (!asset?.publicUrl) return null;
        return { ...item, url: asset.publicUrl };
      })
      .filter(Boolean) as Array<{
        assetId: string;
        caption?: string;
        title?: string;
        url: string;
      }>;
  }, [normalized.items, assets]);

  if (resolvedItems.length === 0) return null;

  const heading = normalized.heading || "Gallery";

  return (
    <section className={styles.section} aria-label="Gallery" id="gallery">
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.kicker}>Gallery</p>
          <h2 className={styles.heading}>{heading}</h2>
        </div>

        <div className={styles.grid}>
          {resolvedItems.map((item, i) => (
            <div key={item.assetId || i} className={styles.item}>
              <img
                src={item.url}
                alt={item.caption || item.title || ""}
                loading="lazy"
              />
              {(item.caption || item.title) && (
                <div className={styles.caption}>
                  {item.caption || item.title}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
