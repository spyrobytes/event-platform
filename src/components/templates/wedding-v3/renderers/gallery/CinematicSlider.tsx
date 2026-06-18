"use client";

/**
 * Cinematic Slider Gallery — The Grand Luxe
 *
 * Full-width horizontal scroll strip with cinematic aspect ratio.
 * Dark gutters, hover glow + scale, prev/next navigation arrows,
 * dot indicators, and mouse drag-scroll. Click opens a dramatic
 * dark lightbox with metallic-accented controls.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import type { SectionRendererProps } from "../../types";
import type { GallerySection } from "@/schemas/event-page";
import { normalizeGalleryData } from "@/schemas/event-page";
import { EventImage } from "@/components/media/EventImage";
import { DEFAULT_LIGHTBOX_FALLBACK_WIDTH, DEFAULT_LIGHTBOX_FALLBACK_HEIGHT } from "@/components/media/image-defaults";
import type { ResolvedGalleryItem } from "./types";
import styles from "./CinematicSlider.module.css";

export function CinematicSlider({
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

  const stripRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Drag state refs (not state — avoids re-renders during drag)
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    moved: 0,
  });

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goNext = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null ? (i + 1) % resolvedItems.length : null,
    );
  }, [resolvedItems.length]);
  const goPrev = useCallback(() => {
    setLightboxIndex((i) =>
      i !== null
        ? (i - 1 + resolvedItems.length) % resolvedItems.length
        : null,
    );
  }, [resolvedItems.length]);

  // Keyboard navigation for lightbox
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

  // Track active slide — find which slide center is closest to strip center
  const updateActiveSlide = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const slides = strip.querySelectorAll("button");
    if (slides.length === 0) return;
    const stripRect = strip.getBoundingClientRect();
    const stripCenter = stripRect.left + stripRect.width / 2;
    let closest = 0;
    let minDist = Infinity;
    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.left + rect.width / 2;
      const dist = Math.abs(slideCenter - stripCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setActiveSlide(closest);
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.addEventListener("scroll", updateActiveSlide, { passive: true });
    return () => strip.removeEventListener("scroll", updateActiveSlide);
  }, [updateActiveSlide]);

  // Scroll the strip by one slide width
  const scrollStrip = useCallback((direction: "prev" | "next") => {
    const strip = stripRef.current;
    if (!strip) return;
    const slide = strip.querySelector("button");
    const slideWidth = slide ? slide.offsetWidth + 4 : 400;
    strip.scrollBy({
      left: direction === "next" ? slideWidth : -slideWidth,
      behavior: "smooth",
    });
  }, []);

  // Scroll to a specific slide (for dot clicks)
  const scrollToSlide = useCallback((index: number) => {
    const strip = stripRef.current;
    if (!strip) return;
    const slide = strip.querySelector("button");
    const slideWidth = slide ? slide.offsetWidth + 4 : 400;
    strip.scrollTo({
      left: slideWidth * index,
      behavior: "smooth",
    });
  }, []);

  // --- Drag-scroll handlers ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const strip = stripRef.current;
      if (!strip) return;
      dragRef.current = {
        isDragging: true,
        startX: e.pageX - strip.offsetLeft,
        scrollLeft: strip.scrollLeft,
        moved: 0,
      };
      strip.classList.add(styles.dragging);
    },
    [],
  );

  const handleDragMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragRef.current.isDragging) return;
      e.preventDefault();
      const strip = stripRef.current;
      if (!strip) return;
      const x = e.pageX - strip.offsetLeft;
      const delta = x - dragRef.current.startX;
      dragRef.current.moved = Math.abs(delta);
      strip.scrollLeft = dragRef.current.scrollLeft - delta;
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current.isDragging = false;
    const strip = stripRef.current;
    if (strip) {
      strip.classList.remove(styles.dragging);
    }
  }, []);

  // Click handler that suppresses lightbox open during drag
  const handleSlideClick = useCallback(
    (index: number) => {
      if (dragRef.current.moved > 5) return;
      setLightboxIndex(index);
    },
    [],
  );

  if (resolvedItems.length === 0) return null;

  const current =
    lightboxIndex !== null ? resolvedItems[lightboxIndex] : null;

  return (
    <section className={styles.section} aria-label="Gallery" id="gallery">
      <div className={styles.header}>
        <p className={styles.kicker}>Gallery</p>
        <h2 className={styles.heading}>
          {normalized.heading || "Moments"}
        </h2>
      </div>

      {/* Slider with nav arrows */}
      <div className={styles.sliderWrap}>
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navPrev}`}
          onClick={() => scrollStrip("prev")}
          aria-label="Previous photos"
        >
          &#8592;
        </button>

        <div
          className={styles.strip}
          ref={stripRef}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {resolvedItems.map((item, i) => (
            <button
              key={item.assetId || i}
              type="button"
              className={styles.slide}
              onClick={() => handleSlideClick(i)}
              aria-label={`View photo ${i + 1}`}
            >
              <EventImage
                src={item.url}
                alt={item.caption || item.title || ""}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.slideImg}
                draggable={false}
                blurDataURL={item.blurDataUrl}
                renditionWidths={item.renditionWidths}
              />
              {(item.caption || item.title) && (
                <div className={styles.caption}>
                  {item.caption || item.title}
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.navBtn} ${styles.navNext}`}
          onClick={() => scrollStrip("next")}
          aria-label="Next photos"
        >
          &#8594;
        </button>
      </div>

      {/* Dot indicators */}
      {resolvedItems.length > 1 && (
        <div className={styles.dots}>
          {resolvedItems.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === activeSlide ? styles.dotActive : ""}`}
              onClick={() => scrollToSlide(i)}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && current && (
        <LightboxPortal>
          <div
            className={styles.lightbox}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
          >
            <button
              type="button"
              className={styles.lbClose}
              onClick={closeLightbox}
              aria-label="Close"
            >
              &times;
            </button>

            <button
              type="button"
              className={styles.lbPrev}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous"
            >
              &#8592;
            </button>

            <div
              className={styles.lbFrame}
              onClick={(e) => e.stopPropagation()}
            >
              <EventImage
                src={current.url}
                alt={current.caption || ""}
                width={current.width ?? DEFAULT_LIGHTBOX_FALLBACK_WIDTH}
                height={current.height ?? DEFAULT_LIGHTBOX_FALLBACK_HEIGHT}
                sizes="(max-width: 768px) 100vw, 80vw"
                blurDataURL={current.blurDataUrl}
                renditionWidths={current.renditionWidths}
                className={styles.lbImage}
              />
              {current.caption && (
                <p className={styles.lbCaption}>{current.caption}</p>
              )}
              <p className={styles.lbCounter}>
                {lightboxIndex + 1} / {resolvedItems.length}
              </p>
            </div>

            <button
              type="button"
              className={styles.lbNext}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next"
            >
              &#8594;
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
