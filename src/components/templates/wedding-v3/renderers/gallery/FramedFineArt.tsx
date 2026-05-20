"use client";

/**
 * Framed Fine Art Gallery — The Fine Art Romance
 *
 * Images presented in decorative frames with mat-like borders,
 * as if hung in a gallery. Hover scale reveals depth, click
 * opens lightbox with mat-framed image. Each photo feels
 * precious and intentional.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";
import { EventImage } from "@/components/media/EventImage";
import { DEFAULT_LIGHTBOX_FALLBACK_WIDTH, DEFAULT_LIGHTBOX_FALLBACK_HEIGHT } from "@/components/media/image-defaults";
import type { ResolvedGalleryItem } from "./types";
import styles from "./FramedFineArt.module.css";

export function FramedFineArt({
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

  const current = lightboxIndex !== null ? resolvedItems[lightboxIndex] : null;

  return (
    <section className={styles.section} aria-label="Gallery" id="gallery">
      <div className={styles.container}>
        {/* Header */}
        <p className={styles.kicker}>Gallery</p>
        <h2 className={styles.heading}>
          {normalized.heading || "Moments"}
        </h2>

        {/* Framed grid */}
        <div className={styles.grid}>
          {resolvedItems.map((item, i) => (
            <button
              key={item.assetId || i}
              type="button"
              className={styles.frame}
              onClick={() => setLightboxIndex(i)}
              aria-label={`View photo ${i + 1}`}
            >
              <div
                className={styles.imageWrap}
                style={{ aspectRatio: i % 3 === 0 ? "4 / 5" : "3 / 4" }}
              >
                <EventImage
                  src={item.url}
                  alt={item.caption || item.title || ""}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  blurDataURL={item.blurDataUrl}
                />
              </div>
              {(item.caption || item.title) && (
                <p className={styles.caption}>
                  {item.caption || item.title}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && current && (
        <LightboxPortal>
          <div className={styles.lightbox} onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Image lightbox">
            <button type="button" className={styles.lbClose} onClick={closeLightbox} aria-label="Close">
              &times;
            </button>

            <button type="button" className={styles.lbPrev} onClick={(e) => { e.stopPropagation(); goPrev(); }} aria-label="Previous">
              &larr;
            </button>

            <div className={styles.lbFrame} onClick={(e) => e.stopPropagation()}>
              <EventImage
                src={current.url}
                alt={current.caption || ""}
                width={current.width ?? DEFAULT_LIGHTBOX_FALLBACK_WIDTH}
                height={current.height ?? DEFAULT_LIGHTBOX_FALLBACK_HEIGHT}
                sizes="(max-width: 768px) 100vw, 80vw"
                blurDataURL={current.blurDataUrl}
                className={styles.lbImage}
              />
              {current.caption && (
                <p className={styles.lbCaption}>{current.caption}</p>
              )}
              <p className={styles.lbCounter}>
                {lightboxIndex + 1} / {resolvedItems.length}
              </p>
            </div>

            <button type="button" className={styles.lbNext} onClick={(e) => { e.stopPropagation(); goNext(); }} aria-label="Next">
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
