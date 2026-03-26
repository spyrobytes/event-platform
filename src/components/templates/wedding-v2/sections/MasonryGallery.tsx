"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { normalizeGalleryData } from "@/schemas/event-page";
import type { GallerySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import styles from "./MasonryGallery.module.css";

type GalleryV2Props = {
  data: GallerySection["data"];
  assets: MediaAsset[];
};

type ResolvedItem = {
  assetId: string;
  caption?: string;
  title?: string;
  moment?: string;
  url: string;
  alt: string;
};

/** Grid span class cycling pattern for masonry mode */
const SPAN_CLASSES = [
  styles.gi1,
  styles.gi2,
  styles.gi3,
  styles.gi4,
  styles.gi5,
  styles.gi6,
];

/**
 * V2 Gallery — supports masonry, grid, slideshow, and carousel display modes.
 *
 * Masonry: 12-column asymmetric grid with specific span patterns.
 * Grid: even columns with consistent sizing.
 * Slideshow: cinematic full-width hero slideshow with transitions and autoplay.
 * Carousel: horizontal scroll strip with snap points and peek.
 *
 * All modes share the same lightbox and resolved items.
 */
export function MasonryGallery({ data, assets }: GalleryV2Props) {
  const { heading, items, displayMode, showCaptions, autoPlay, autoPlayInterval, transition } = normalizeGalleryData(data);
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

  const renderGalleryContent = () => {
    if (displayMode === "slideshow") {
      return (
        <Slideshow
          items={resolvedItems}
          showCaptions={showCaptions}
          autoPlay={autoPlay}
          autoPlayInterval={autoPlayInterval}
          transition={transition}
          onOpen={(i) => setLightboxIndex(i)}
        />
      );
    }

    if (displayMode === "carousel") {
      return (
        <Carousel
          items={resolvedItems}
          showCaptions={showCaptions}
          onOpen={(i) => setLightboxIndex(i)}
        />
      );
    }

    const isMasonry = displayMode === "masonry";
    return (
      <div className={isMasonry ? styles.grid : styles.gridEven} role="group" aria-label="Photo gallery">
        {resolvedItems.map((item, index) => (
          <GalleryItem
            key={item.assetId}
            item={item}
            index={index}
            spanClass={isMasonry ? SPAN_CLASSES[index % SPAN_CLASSES.length] : ""}
            showCaption={showCaptions}
            onOpen={() => setLightboxIndex(index)}
          />
        ))}
      </div>
    );
  };

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

        {renderGalleryContent()}
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

// =============================================================================
// SLIDESHOW MODE
// =============================================================================

/** Cinematic full-width slideshow with transitions, autoplay, and progress bar */
function Slideshow({
  items,
  showCaptions,
  autoPlay,
  autoPlayInterval,
  transition,
  onOpen,
}: {
  items: ResolvedItem[];
  showCaptions: boolean;
  autoPlay: boolean;
  autoPlayInterval: number;
  transition: "fade" | "slide" | "zoom" | "flip";
  onOpen: (index: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrent(index);
      setTimeout(() => setIsTransitioning(false), 600);
    },
    [isTransitioning]
  );

  const goNext = useCallback(() => {
    goTo((current + 1) % items.length);
  }, [current, items.length, goTo]);

  const goPrev = useCallback(() => {
    goTo((current - 1 + items.length) % items.length);
  }, [current, items.length, goTo]);

  // Autoplay
  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    timerRef.current = setTimeout(goNext, autoPlayInterval * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoPlay, autoPlayInterval, current, goNext, items.length]);

  // Progress bar animation
  useEffect(() => {
    const el = progressRef.current;
    if (!el || !autoPlay) return;
    el.style.transition = "none";
    el.style.width = "0%";
    requestAnimationFrame(() => {
      el.style.transition = `width ${autoPlayInterval}s linear`;
      el.style.width = "100%";
    });
  }, [current, autoPlay, autoPlayInterval]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  const transitionClass =
    transition === "slide" ? styles.slideshowSlide
      : transition === "zoom" ? styles.slideshowZoom
        : transition === "flip" ? styles.slideshowFlip
          : styles.slideshowFade;

  const item = items[current];
  const captionText = item.caption || item.title;

  return (
    <div className={styles.slideshow} role="region" aria-label="Photo slideshow" aria-roledescription="slideshow">
      {/* Stage */}
      <div
        className={styles.slideshowStage}
        onClick={() => onOpen(current)}
      >
        {items.map((img, i) => (
          <div
            key={img.assetId}
            className={`${styles.slideshowSlideItem} ${transitionClass} ${i === current ? styles.slideshowActive : ""}`}
            aria-hidden={i !== current}
          >
            <img src={img.url} alt={img.alt} />
          </div>
        ))}

        {/* Caption overlay */}
        {showCaptions && captionText && (
          <div className={styles.slideshowCaption}>
            {item.moment && (
              <span className={styles.slideshowMoment}>{item.moment}</span>
            )}
            <span className={styles.slideshowCaptionText}>{captionText}</span>
          </div>
        )}

        {/* Counter */}
        <div className={styles.slideshowCounter}>
          {current + 1} / {items.length}
        </div>
      </div>

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <button className={`${styles.slideshowNav} ${styles.slideshowNavPrev}`} onClick={goPrev} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={20} height={20}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className={`${styles.slideshowNav} ${styles.slideshowNavNext}`} onClick={goNext} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={20} height={20}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className={styles.slideshowDots}>
          {items.map((_, i) => (
            <button
              key={i}
              className={`${styles.slideshowDot} ${i === current ? styles.slideshowDotActive : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Autoplay progress bar */}
      {autoPlay && items.length > 1 && (
        <div className={styles.slideshowProgress}>
          <div ref={progressRef} className={styles.slideshowProgressFill} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CAROUSEL MODE
// =============================================================================

/** Horizontal scroll carousel with snap points, peek, and touch support */
function Carousel({
  items,
  showCaptions,
  onOpen,
}: {
  items: ResolvedItem[];
  showCaptions: boolean;
  onOpen: (index: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(`.${styles.carouselCard}`)?.clientWidth || 400;
    el.scrollBy({ left: direction === "right" ? cardWidth + 20 : -(cardWidth + 20), behavior: "smooth" });
  }, []);

  return (
    <div className={styles.carousel} role="region" aria-label="Photo carousel" aria-roledescription="carousel">
      {/* Scroll track */}
      <div ref={trackRef} className={styles.carouselTrack}>
        {items.map((item, i) => {
          const captionText = item.caption || item.title;
          return (
            <button
              key={item.assetId}
              className={styles.carouselCard}
              onClick={() => onOpen(i)}
              aria-label={`View photo: ${captionText || `Photo ${i + 1}`}`}
            >
              <img src={item.url} alt={item.alt} loading={i > 2 ? "lazy" : undefined} />
              {showCaptions && captionText && (
                <div className={styles.carouselCaption}>
                  {item.moment && (
                    <span className={styles.carouselMoment}>{item.moment}</span>
                  )}
                  <span>{captionText}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {canScrollLeft && (
        <button className={`${styles.carouselNav} ${styles.carouselNavLeft}`} onClick={() => scroll("left")} aria-label="Scroll left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={20} height={20}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button className={`${styles.carouselNav} ${styles.carouselNavRight}`} onClick={() => scroll("right")} aria-label="Scroll right">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" width={20} height={20}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Fade edges */}
      <div className={`${styles.carouselEdge} ${styles.carouselEdgeLeft} ${canScrollLeft ? styles.carouselEdgeVisible : ""}`} />
      <div className={`${styles.carouselEdge} ${styles.carouselEdgeRight} ${canScrollRight ? styles.carouselEdgeVisible : ""}`} />
    </div>
  );
}
