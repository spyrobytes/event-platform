"use client";

/**
 * Compact Strip Gallery — The Intimate Note
 *
 * Horizontal strip of portrait images, centered when fewer than
 * viewport width. Subtle hover lift, click opens a minimal
 * lightbox. Image count shown as a quiet caption.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";
import { EventImage } from "@/components/media/EventImage";
import { DEFAULT_LIGHTBOX_FALLBACK_WIDTH, DEFAULT_LIGHTBOX_FALLBACK_HEIGHT } from "@/components/media/image-defaults";
import type { ResolvedGalleryItem } from "./types";
import styles from "./CompactStrip.module.css";

export function CompactStrip({
  data,
  assets,
}: SectionRendererProps<GallerySection["data"]>) {
  const normalized = useMemo(() => normalizeGalleryData(data), [data]);

  const resolvedItems = useMemo(() => {
    return normalized.items
      .map((item) => {
        const asset = assets.find((a) => a.id === item.assetId);
        if (!asset?.publicUrl) return null;
        return {
          ...item,
          url: asset.publicUrl,
          blurDataUrl: asset.blurDataUrl,
          width: asset.width,
          height: asset.height,
          renditionWidths: asset.renditionWidths,
        };
      })
      .filter(Boolean) as ResolvedGalleryItem[];
  }, [normalized.items, assets]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goNext = useCallback(() => {
    setLightboxIndex((i) => i !== null ? (i + 1) % resolvedItems.length : null);
  }, [resolvedItems.length]);
  const goPrev = useCallback(() => {
    setLightboxIndex((i) => i !== null ? (i - 1 + resolvedItems.length) % resolvedItems.length : null);
  }, [resolvedItems.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [lightboxIndex, closeLightbox, goNext, goPrev]);

  if (resolvedItems.length === 0) return null;

  const displayItems = resolvedItems.slice(0, 6);
  const current = lightboxIndex !== null ? resolvedItems[lightboxIndex] : null;

  return (
    <section className={styles.section} aria-label="Gallery" id="gallery">
      <div className={styles.container}>
        <h2 className={styles.heading}>
          {normalized.heading || "Gallery"}
        </h2>

        {/* Strip */}
        <div className={styles.strip}>
          {displayItems.map((item, i) => (
            <button
              key={item.assetId || i}
              type="button"
              className={styles.item}
              onClick={() => setLightboxIndex(i)}
              aria-label={`View photo ${i + 1}`}
            >
              <EventImage
                src={item.url}
                alt={item.caption || item.title || ""}
                fill
                sizes="(max-width: 768px) 33vw, 25vw"
                blurDataURL={item.blurDataUrl}
                renditionWidths={item.renditionWidths}
              />
            </button>
          ))}
        </div>

        {/* Image count */}
        <p className={styles.count}>
          {displayItems.length} moment{displayItems.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && current && (
        <LightboxPortal>
          <div className={styles.lightbox} onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Image lightbox">
            <button type="button" className={styles.lbClose} onClick={closeLightbox} aria-label="Close lightbox">
              &times;
            </button>

            <button type="button" className={styles.lbPrev} onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous image">
              &larr;
            </button>

            <div className={styles.lbImageWrap} onClick={(e) => e.stopPropagation()}>
              <EventImage
                src={current.url}
                alt={current.caption || ""}
                width={current.width ?? DEFAULT_LIGHTBOX_FALLBACK_WIDTH}
                height={current.height ?? DEFAULT_LIGHTBOX_FALLBACK_HEIGHT}
                sizes="(max-width: 768px) 100vw, 80vw"
                blurDataURL={current.blurDataUrl}
                className={styles.lbImage}
                renditionWidths={current.renditionWidths}
              />
              {current.caption && (
                <p className={styles.lbCaption}>{current.caption}</p>
              )}
              <p className={styles.lbCounter}>
                {lightboxIndex + 1} / {resolvedItems.length}
              </p>
            </div>

            <button type="button" className={styles.lbNext} onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next image">
              &rarr;
            </button>
          </div>
        </LightboxPortal>
      )}
    </section>
  );
}

function LightboxPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
