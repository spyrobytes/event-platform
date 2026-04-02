"use client";

/**
 * Editorial Spread Gallery — The Editorial
 *
 * Split-view gallery: 25% left editorial text column with caption,
 * image counter, and prev/next navigation. 75% right for the
 * featured image. Horizontal thumbnail strip below for quick access.
 *
 * Each photo is treated as a "page spread" with accompanying
 * editorial text — not a grid dump.
 *
 * Mobile: stacks vertically — image first, text below, thumbnails at bottom.
 */

import { useState, useCallback, useMemo } from "react";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";
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

  const [activeIndex, setActiveIndex] = useState(0);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % resolvedItems.length);
  }, [resolvedItems.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + resolvedItems.length) % resolvedItems.length);
  }, [resolvedItems.length]);

  if (resolvedItems.length === 0) return null;

  const heading = normalized.heading || "Gallery";
  const current = resolvedItems[activeIndex];
  const captionText = current?.caption || current?.title || "";

  return (
    <section className={styles.section} aria-label="Gallery" id="gallery">
      <div className={styles.container}>
        {/* Section header */}
        <div className={styles.header}>
          <p className={styles.kicker}>Gallery</p>
          <h2 className={styles.heading}>{heading}</h2>
        </div>

        {/* Split view: sidebar + featured image */}
        <div className={styles.spread}>
          {/* Left: Editorial sidebar */}
          <div className={styles.sidebar}>
            {/* Counter */}
            <div className={styles.counter}>
              <span className={styles.counterCurrent}>
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
              <span className={styles.counterSep}>/</span>
              <span className={styles.counterTotal}>
                {String(resolvedItems.length).padStart(2, "0")}
              </span>
            </div>

            {/* Caption */}
            {captionText && (
              <p className={styles.captionText}>{captionText}</p>
            )}

            {/* Prev / Next links */}
            <div className={styles.navLinks}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={goPrev}
                aria-label="Previous image"
              >
                &larr; Prev
              </button>
              <button
                type="button"
                className={styles.navBtn}
                onClick={goNext}
                aria-label="Next image"
              >
                Next &rarr;
              </button>
            </div>
          </div>

          {/* Right: Featured image */}
          <div className={styles.featured}>
            <img
              key={current?.assetId}
              src={current?.url}
              alt={captionText}
              className={styles.featuredImg}
              loading="lazy"
            />
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className={styles.thumbStrip} role="listbox" aria-label="Gallery thumbnails">
          {resolvedItems.map((item, i) => (
            <button
              key={item.assetId || i}
              type="button"
              className={`${styles.thumb} ${i === activeIndex ? styles.thumbActive : ""}`}
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-selected={i === activeIndex}
              role="option"
            >
              <img
                src={item.url}
                alt=""
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
