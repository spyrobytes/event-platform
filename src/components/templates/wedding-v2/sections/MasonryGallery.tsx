"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { EventImage } from "@/components/media/EventImage";
import { DEFAULT_LIGHTBOX_FALLBACK_WIDTH, DEFAULT_LIGHTBOX_FALLBACK_HEIGHT } from "@/components/media/image-defaults";
import { useProgressiveReveal, GALLERY_REVEAL } from "@/hooks/use-progressive-reveal";
import { useLightboxTrack } from "@/hooks/use-lightbox-track";
import { LightboxTrack, LightboxTrackSlide } from "@/components/media/LightboxTrackSlide";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { RevealMoreButton } from "@/components/media/RevealMoreButton";
import { normalizeGalleryData } from "@/schemas/event-page";
import type { GallerySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { cn } from "@/lib/utils";
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
  blurDataUrl: string | null;
  width: number | null;
  height: number | null;
  renditionWidths?: readonly number[] | null;
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
 * Maps each slideshow transition name to its CSS duration in ms.
 * Must stay in sync with the transition durations in MasonryGallery.module.css.
 */
const TRANSITION_DURATIONS: Record<string, number> = {
  fade: 700,
  zoom: 700,
  slide: 600,
  flip: 600,
};

/**
 * V2 Gallery — supports masonry, grid, slideshow, and carousel display modes.
 *
 * All modes share the same lightbox and resolved items.
 */
export function MasonryGallery({ data, assets }: GalleryV2Props) {
  const { heading, items, displayMode, showCaptions, autoPlay, autoPlayInterval, transition } =
    normalizeGalleryData(data);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isLightboxOpen = lightboxIndex !== null;

  const resolvedItems = useMemo(
    () =>
      items
        .map((item) => {
          const asset = assets.find((a) => a.id === item.assetId);
          if (!asset?.publicUrl) return null;
          return {
            ...item,
            url: asset.publicUrl,
            alt: asset.alt || item.caption || item.title || "Gallery image",
            blurDataUrl: asset?.blurDataUrl ?? null,
            width: asset.width,
            height: asset.height,
            renditionWidths: asset.renditionWidths,
          };
        })
        .filter(Boolean) as ResolvedItem[],
    [items, assets]
  );

  const itemCount = resolvedItems.length;

  // Mobile image budget for the grid/masonry layouts (slideshow & carousel
  // already expose one image at a time). The lightbox keeps the full list.
  const { visibleCount, hasMore, remaining, revealMore } = useProgressiveReveal(
    itemCount,
    GALLERY_REVEAL,
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const showPrev = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev - 1 + itemCount) % itemCount : null
    );
  }, [itemCount]);

  const showNext = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % itemCount : null
    );
  }, [itemCount]);

  // Body scroll lock while the lightbox is open. Keyboard nav lives inside
  // Lightbox itself, where it can read the swipe hook's busy state.
  useBodyScrollLock(isLightboxOpen);

  if (resolvedItems.length === 0) {
    return (
      <section className={cn("section", styles.sectionWrapper)} aria-label="Gallery" id="gallery">
        <div className={styles.sectionInner}>
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
          isLightboxOpen={isLightboxOpen}
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
    const visibleItems = resolvedItems.slice(0, visibleCount);
    return (
      <>
        <div
          className={isMasonry ? styles.grid : styles.gridEven}
          role="group"
          aria-label="Photo gallery"
        >
          {visibleItems.map((item, index) => (
            <GalleryItem
              key={item.assetId}
              item={item}
              index={index}
              spanClass={isMasonry ? SPAN_CLASSES[index % SPAN_CLASSES.length] : undefined}
              showCaption={showCaptions}
              onOpen={() => setLightboxIndex(index)}
            />
          ))}
        </div>
        {hasMore && (
          <RevealMoreButton
            label="View more photos"
            remaining={remaining}
            onClick={revealMore}
          />
        )}
      </>
    );
  };

  return (
    <section className={cn("section", styles.sectionWrapper)} aria-label="Gallery" id="gallery">
      <div className={styles.sectionInner}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Gallery</p>
          <h2 className={styles.heading}>{heading}</h2>
        </div>

        {renderGalleryContent()}
      </div>

      {/* Lightbox — portaled to document.body to escape AnimatedWrapper's
          transform-based containing block, which breaks position:fixed */}
      {isLightboxOpen && (
        <LightboxPortal>
          <Lightbox
            items={resolvedItems}
            index={lightboxIndex as number}
            onClose={closeLightbox}
            onPrev={showPrev}
            onNext={showNext}
          />
        </LightboxPortal>
      )}
    </section>
  );
}

// =============================================================================
// LIGHTBOX PORTAL
// =============================================================================

/**
 * Portals children to document.body to escape transform-based containing blocks.
 * Safe to use without a mount guard because this component is only rendered when
 * the lightbox is open (requires a user click, so always client-side).
 */
function LightboxPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

// =============================================================================
// GALLERY ITEM (masonry / grid mode)
// =============================================================================

/** Individual gallery item with 3D tilt on hover */
function GalleryItem({
  item,
  index,
  spanClass,
  showCaption,
  onOpen,
}: {
  item: { url: string; alt: string; caption?: string; title?: string; blurDataUrl?: string | null; renditionWidths?: readonly number[] | null };
  index: number;
  spanClass?: string;
  showCaption: boolean;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // 3D tilt effect on mousemove — imperative because the transform values are
  // computed from live mouse coordinates, not expressible as static CSS.
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
      className={cn(styles.item, spanClass)}
      onClick={onOpen}
      aria-label={`View photo: ${captionText || `Photo ${index + 1}`}`}
    >
      <EventImage
        src={item.url}
        alt={item.alt}
        fill
        sizes="(max-width: 700px) 100vw, 50vw"
        loading={index > 2 ? "lazy" : undefined}
        blurDataURL={item.blurDataUrl}
        renditionWidths={item.renditionWidths}
      />
      {showCaption && captionText && (
        <div className={styles.overlay}>
          <span className={styles.caption}>{captionText}</span>
        </div>
      )}
    </button>
  );
}

// =============================================================================
// LIGHTBOX
// =============================================================================

/**
 * Full-screen strip-of-cards lightbox: each slide is a complete card —
 * chrome, photo, caption — sized to its own photo, so mixed aspect ratios
 * never letterbox; neighbor cards glide in as their own objects with the
 * backdrop visible between them. useLightboxTrack owns slot rotation,
 * swipe/keyboard nav, and the reanchor choreography; side cards double as
 * the ±1 preload. Slides are pointer-events-none (cards opt back in), so a
 * tap in the gap falls through to the track, whose backdropProps close the
 * lightbox.
 */
function Lightbox({
  items,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  items: ResolvedItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus handoff + Tab trap (shared across all lightboxes).
  useFocusTrap(dialogRef);

  const { trackRef, trackProps, backdropProps, prev, next, slides } =
    useLightboxTrack({
      items,
      index,
      getItemKey: (item) => item.assetId,
      onPrev,
      onNext,
      onClose,
    });

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      tabIndex={-1}
      className={cn(styles.lightbox, styles.lightboxOpen)}
      {...backdropProps}
    >
      <button className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          width={20}
          height={20}
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <button
        className={cn(styles.lightboxNav, styles.lightboxPrev)}
        onClick={prev}
        aria-label="Previous image"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          width={22}
          height={22}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        className={cn(styles.lightboxNav, styles.lightboxNext)}
        onClick={next}
        aria-label="Next image"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          width={22}
          height={22}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Viewport clips the card strip; the TRACK carries the gesture (the
          hook applies touch-action / will-change / user-select / cursor to
          it) AND the backdrop tap-to-close for the gaps between cards. */}
      <LightboxTrack trackRef={trackRef} trackProps={trackProps} className="absolute inset-0">
          {slides.map(({ key, offset, item }) => {
            const captionText = item.caption || item.title;
            return (
              <LightboxTrackSlide
                key={key}
                offset={offset}
                blurDataUrl={item.blurDataUrl}
                center
              >
                {({ imageProps, hideStale, staleOverlay }) => (
                  <div className={styles.lightboxStage}>
                    <EventImage
                      src={item.url}
                      alt={offset === 0 ? item.alt : ""}
                      width={item.width ?? DEFAULT_LIGHTBOX_FALLBACK_WIDTH}
                      height={item.height ?? DEFAULT_LIGHTBOX_FALLBACK_HEIGHT}
                      sizes="(max-width: 768px) 100vw, 80vw"
                      blurDataURL={item.blurDataUrl}
                      renditionWidths={item.renditionWidths}
                      className={cn(hideStale && "invisible")}
                      {...imageProps}
                    />
                    {captionText && (
                      <div className={styles.lightboxCaption}>{captionText}</div>
                    )}
                    {staleOverlay}
                  </div>
                )}
              </LightboxTrackSlide>
            );
          })}
      </LightboxTrack>

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
  isLightboxOpen,
  onOpen,
}: {
  items: ResolvedItem[];
  showCaptions: boolean;
  autoPlay: boolean;
  autoPlayInterval: number;
  transition: "fade" | "slide" | "zoom" | "flip";
  isLightboxOpen: boolean;
  onOpen: (index: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const isTransitioningRef = useRef(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAutoPlaying = autoPlay && !isPaused;

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      setCurrent(index);
      setTimeout(
        () => { isTransitioningRef.current = false; },
        TRANSITION_DURATIONS[transition] ?? 600
      );
    },
    [transition]
  );

  const goNext = useCallback(
    () => goTo((current + 1) % items.length),
    [current, items.length, goTo]
  );

  const goPrev = useCallback(
    () => goTo((current - 1 + items.length) % items.length),
    [current, items.length, goTo]
  );

  // Manual navigation pauses autoplay.
  const goToManual = useCallback(
    (index: number) => {
      setIsPaused(true);
      goTo(index);
    },
    [goTo]
  );
  const goNextManual = useCallback(() => {
    setIsPaused(true);
    goNext();
  }, [goNext]);
  const goPrevManual = useCallback(() => {
    setIsPaused(true);
    goPrev();
  }, [goPrev]);

  // Autoplay — suspended while paused or lightbox is open.
  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1 || isLightboxOpen) return;
    timerRef.current = setTimeout(goNext, autoPlayInterval * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAutoPlaying, autoPlayInterval, current, goNext, items.length, isLightboxOpen]);

  // Progress bar animation — forced reflow guarantees transition restart.
  useEffect(() => {
    const el = progressRef.current;
    if (!el || !isAutoPlaying || isLightboxOpen) return;
    el.style.transition = "none";
    el.style.width = "0%";
    void el.offsetWidth; // force reflow
    el.style.transition = `width ${autoPlayInterval}s linear`;
    el.style.width = "100%";
  }, [current, isAutoPlaying, autoPlayInterval, isLightboxOpen]);

  // Reset progress bar when paused.
  useEffect(() => {
    const el = progressRef.current;
    if (!el) return;
    if (isPaused || isLightboxOpen) {
      el.style.transition = "none";
      el.style.width = "0%";
    }
  }, [isPaused, isLightboxOpen]);

  // Keyboard navigation — gated behind isLightboxOpen to avoid double-fire.
  useEffect(() => {
    if (isLightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNextManual();
      if (e.key === "ArrowLeft") goPrevManual();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [goNextManual, goPrevManual, isLightboxOpen]);

  const transitionClass =
    transition === "slide"
      ? styles.slideshowSlide
      : transition === "zoom"
        ? styles.slideshowZoom
        : transition === "flip"
          ? styles.slideshowFlip
          : styles.slideshowFade;

  const item = items[current];
  const captionText = item.caption || item.title;

  return (
    <div
      className={styles.slideshow}
      role="region"
      aria-label="Photo slideshow"
      aria-roledescription="slideshow"
    >
      {/* Stage */}
      <div className={styles.slideshowStage} onClick={() => onOpen(current)}>
        {items.map((img, i) => (
          <div
            key={img.assetId}
            className={cn(
              styles.slideshowSlideItem,
              transitionClass,
              i === current && styles.slideshowActive,
            )}
            aria-hidden={i !== current}
          >
            <EventImage
              src={img.url}
              alt={img.alt}
              fill
              sizes="(max-width: 700px) 100vw, (max-width: 1200px) 80vw, 1140px"
              priority={i === 0}
              blurDataURL={img.blurDataUrl}
              renditionWidths={img.renditionWidths}
            />
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
          <button
            className={cn(styles.slideshowNav, styles.slideshowNavPrev)}
            onClick={goPrevManual}
            aria-label="Previous"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              width={20}
              height={20}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className={cn(styles.slideshowNav, styles.slideshowNavNext)}
            onClick={goNextManual}
            aria-label="Next"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              width={20}
              height={20}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators + autoplay toggle */}
      {items.length > 1 && (
        <div className={styles.slideshowDots}>
          {autoPlay && (
            <button
              className={styles.slideshowPlayPause}
              onClick={() => setIsPaused((p) => !p)}
              aria-label={isPaused ? "Resume autoplay" : "Pause autoplay"}
            >
              {isPaused ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                  <rect x="5" y="4" width="4" height="16" rx="1" />
                  <rect x="15" y="4" width="4" height="16" rx="1" />
                </svg>
              )}
            </button>
          )}
          {items.map((_, i) => (
            <button
              key={i}
              className={cn(
                styles.slideshowDot,
                i === current && styles.slideshowDotActive,
              )}
              onClick={() => goToManual(i)}
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
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    const cardWidth =
      el.querySelector(`.${styles.carouselCard}`)?.clientWidth || 400;
    el.scrollBy({
      left: direction === "right" ? cardWidth + 20 : -(cardWidth + 20),
      behavior: "smooth",
    });
  }, []);

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-label="Photo carousel"
      aria-roledescription="carousel"
    >
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
              <EventImage
                src={item.url}
                alt={item.alt}
                fill
                sizes="(max-width: 700px) 75vw, 420px"
                loading={i > 2 ? "lazy" : undefined}
                blurDataURL={item.blurDataUrl}
                renditionWidths={item.renditionWidths}
              />
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
        <button
          className={cn(styles.carouselNav, styles.carouselNavLeft)}
          onClick={() => scroll("left")}
          aria-label="Scroll left"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            width={20}
            height={20}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button
          className={cn(styles.carouselNav, styles.carouselNavRight)}
          onClick={() => scroll("right")}
          aria-label="Scroll right"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            width={20}
            height={20}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Fade edges */}
      <div className={cn(styles.carouselEdge, styles.carouselEdgeLeft, canScrollLeft && styles.carouselEdgeVisible)} />
      <div className={cn(styles.carouselEdge, styles.carouselEdgeRight, canScrollRight && styles.carouselEdgeVisible)} />
    </div>
  );
}
