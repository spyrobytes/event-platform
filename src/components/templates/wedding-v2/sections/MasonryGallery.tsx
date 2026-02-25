"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { normalizeGalleryData } from "@/schemas/event-page";
import type { GallerySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import styles from "./MasonryGallery.module.css";

type MasonryGalleryProps = {
  data: GallerySection["data"];
  assets: MediaAsset[];
  primaryColor: string;
};

/** Grid span class cycling pattern from POC */
const SPAN_CLASSES = [
  styles.gi1,
  styles.gi2,
  styles.gi3,
  styles.gi4,
  styles.gi5,
  styles.gi6,
];

/**
 * Masonry Gallery — POC-parity rewrite
 *
 * 12-column asymmetric grid with specific span patterns,
 * 3D tilt on hover, caption overlays, and full lightbox
 * with keyboard navigation.
 */
export function MasonryGallery({ data, assets, primaryColor: _primaryColor }: MasonryGalleryProps) {
  const { heading, items, showCaptions } = normalizeGalleryData(data);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Resolve asset URLs (memoized for stable reference)
  const resolvedItems = useMemo(() =>
    items
      .map((item) => {
        const asset = assets.find((a) => a.id === item.assetId);
        if (!asset?.publicUrl) return null;
        return {
          ...item,
          url: asset.publicUrl,
          alt: asset.alt || item.caption || item.title || "Gallery image",
        };
      })
      .filter(Boolean) as Array<{
      assetId: string;
      caption?: string;
      title?: string;
      moment?: string;
      url: string;
      alt: string;
    }>,
    [items, assets]
  );

  const itemCount = resolvedItems.length;

  // Lightbox navigation
  const closeLightbox = () => setLightboxIndex(null);
  const showPrev = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + itemCount) % itemCount : null
    );
  };
  const showNext = () => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % itemCount : null
    );
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [lightboxIndex, closeLightbox, showNext, showPrev]);

  if (resolvedItems.length === 0) {
    return (
      <section
        className="section"
        style={{ padding: "var(--section-y, 96px) 0" }}
        aria-label="Gallery"
        id="gallery"
      >
        <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Gallery</p>
            <h2 className={styles.heading}>{heading}</h2>
          </div>
          <div className={styles.empty}>Gallery images coming soon</div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="section"
      style={{ padding: "var(--section-y, 96px) 0" }}
      aria-label="Gallery"
      id="gallery"
    >
      <div style={{ width: "min(var(--max, 1140px), 100% - 2 * var(--pad, 40px))", margin: "0 auto" }}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Gallery</p>
          <h2 className={styles.heading}>{heading}</h2>
        </div>

        <div className={styles.grid} role="group" aria-label="Photo gallery">
          {resolvedItems.map((item, index) => (
            <GalleryItem
              key={item.assetId}
              item={item}
              index={index}
              spanClass={SPAN_CLASSES[index % SPAN_CLASSES.length]}
              showCaption={showCaptions}
              onOpen={() => setLightboxIndex(index)}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          items={resolvedItems}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={showPrev}
          onNext={showNext}
        />
      )}
    </section>
  );
}

/** Individual gallery item with 3D tilt on hover */
function GalleryItem({
  item,
  index,
  spanClass,
  showCaption,
  onOpen,
}: {
  item: { url: string; alt: string; caption?: string; title?: string };
  index: number;
  spanClass: string;
  showCaption: boolean;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // 3D tilt effect on mousemove
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches || "ontouchstart" in window) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `translateY(-3px) scale(1.005) perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
    };
    const handleLeave = () => {
      el.style.transform = "";
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  const captionText = item.caption || item.title;

  return (
    <button
      ref={ref}
      className={`${styles.item} ${spanClass}`}
      onClick={onOpen}
      aria-label={`View photo: ${captionText || `Photo ${index + 1}`}`}
    >
      <img
        src={item.url}
        alt={item.alt}
        loading={index > 2 ? "lazy" : undefined}
      />
      {showCaption && captionText && (
        <div className={styles.overlay}>
          <span className={styles.caption}>{captionText}</span>
        </div>
      )}
    </button>
  );
}

/** Full-screen lightbox with navigation */
function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: Array<{ url: string; alt: string; caption?: string; title?: string }>;
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const item = items[index];
  const captionText = item.caption || item.title;

  return (
    <div
      className={`${styles.lightbox} ${styles.lightboxOpen}`}
      aria-hidden="false"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={20} height={20}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <button
        className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
        onClick={onPrev}
        aria-label="Previous image"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={22} height={22}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        className={`${styles.lightboxNav} ${styles.lightboxNext}`}
        onClick={onNext}
        aria-label="Next image"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={22} height={22}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className={styles.lightboxStage} role="dialog" aria-modal="true" aria-label="Image preview">
        <img src={item.url} alt={item.alt} />
        {captionText && (
          <div className={styles.lightboxCaption}>{captionText}</div>
        )}
      </div>

      <div className={styles.lightboxCounter}>
        {index + 1} / {items.length}
      </div>
    </div>
  );
}
