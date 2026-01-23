"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SectionWrapper, SectionTitle } from "../../shared";
import { normalizeGalleryData } from "@/schemas/event-page";
import type { GallerySection as GallerySectionType } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";

type GallerySectionProps = {
  data: GallerySectionType["data"];
  assets: MediaAsset[];
  primaryColor: string;
};

type GalleryItem = {
  assetId: string;
  caption?: string;
  title?: string;
  moment?: string;
  asset: MediaAsset;
};

// Transition class mappings
const transitionClasses = {
  fade: {
    enter: "opacity-0",
    enterActive: "opacity-100 transition-opacity duration-500",
    exit: "opacity-100",
    exitActive: "opacity-0 transition-opacity duration-500",
  },
  slide: {
    enter: "translate-x-full opacity-0",
    enterActive: "translate-x-0 opacity-100 transition-all duration-500",
    exit: "translate-x-0 opacity-100",
    exitActive: "-translate-x-full opacity-0 transition-all duration-500",
  },
  zoom: {
    enter: "scale-50 opacity-0",
    enterActive: "scale-100 opacity-100 transition-all duration-500",
    exit: "scale-100 opacity-100",
    exitActive: "scale-150 opacity-0 transition-all duration-500",
  },
  flip: {
    enter: "rotateY-90 opacity-0",
    enterActive: "rotateY-0 opacity-100 transition-all duration-500",
    exit: "rotateY-0 opacity-100",
    exitActive: "rotateY-90 opacity-0 transition-all duration-500",
  },
};

/**
 * Party Gallery Section
 * Playful style with fun hover effects, multiple display modes, and lightbox.
 */
export function GallerySection({ data, assets, primaryColor }: GallerySectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Normalize data to handle both legacy assetIds and new items format
  const normalizedData = normalizeGalleryData(data);
  const { displayMode, autoPlay, autoPlayInterval, transition, showCaptions } = normalizedData;

  // Map items to assets with their metadata
  const galleryItems: GalleryItem[] = normalizedData.items
    .map((item) => {
      const asset = assets.find((a) => a.id === item.assetId);
      return asset ? { ...item, asset } : null;
    })
    .filter((item): item is GalleryItem => item !== null);

  // Auto-play functionality
  const goToNext = useCallback(() => {
    if (galleryItems.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % galleryItems.length);
      setIsTransitioning(false);
    }, 100);
  }, [galleryItems.length]);

  const goToPrev = useCallback(() => {
    if (galleryItems.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
      setIsTransitioning(false);
    }, 100);
  }, [galleryItems.length]);

  const goToSlide = useCallback((index: number) => {
    if (index === currentSlide) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsTransitioning(false);
    }, 100);
  }, [currentSlide]);

  // Scroll carousel to specific index (for auto-play)
  const scrollCarouselToIndex = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const items = container.children;
    if (items[index]) {
      const item = items[index] as HTMLElement;
      const scrollLeft = item.offsetLeft - (container.clientWidth - item.clientWidth) / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, []);

  // Auto-play effect for slideshow and carousel modes
  useEffect(() => {
    if (!autoPlay || isPaused || galleryItems.length <= 1) {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
      return;
    }

    if (displayMode === "slideshow") {
      autoPlayRef.current = setInterval(() => {
        goToNext();
      }, autoPlayInterval * 1000);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }

    if (displayMode === "carousel") {
      autoPlayRef.current = setInterval(() => {
        setCurrentSlide((prev) => {
          const next = (prev + 1) % galleryItems.length;
          setTimeout(() => scrollCarouselToIndex(next), 0);
          return next;
        });
      }, autoPlayInterval * 1000);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, displayMode, isPaused, goToNext, galleryItems.length, scrollCarouselToIndex]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          prevImage();
          break;
        case "ArrowRight":
          nextImage();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex]);

  // Lightbox auto-play
  useEffect(() => {
    if (lightboxIndex === null || !autoPlay || isPaused || galleryItems.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      nextImage();
    }, autoPlayInterval * 1000);

    return () => clearInterval(timer);
  }, [lightboxIndex, autoPlay, autoPlayInterval, isPaused, galleryItems.length]);

  if (galleryItems.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextImage = () =>
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % galleryItems.length : null
    );
  const prevImage = () =>
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + galleryItems.length) % galleryItems.length
        : null
    );

  const currentItem = lightboxIndex !== null ? galleryItems[lightboxIndex] : null;
  const currentSlideItem = galleryItems[currentSlide];

  // Get transition classes based on state
  const getTransitionClass = (isEntering: boolean) => {
    const classes = transitionClasses[transition] || transitionClasses.fade;
    if (isTransitioning) {
      return isEntering ? classes.enter : classes.exitActive;
    }
    return isEntering ? classes.enterActive : classes.exit;
  };

  // Scroll carousel to current slide
  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = carouselRef.current.clientWidth * 0.8;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Render grid layout - Party style with playful effects
  const renderGrid = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {galleryItems.map((item, index) => (
        <button
          key={item.asset.id}
          type="button"
          onClick={() => openLightbox(index)}
          className="group relative aspect-square overflow-hidden rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-offset-2"
          style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
        >
          <img
            src={item.asset.publicUrl || ""}
            alt={item.asset.alt || item.title || `Gallery image ${index + 1}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div
            className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-30"
            style={{ backgroundColor: primaryColor }}
          />
          {showCaptions && (item.caption || item.title) ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
              {item.title && (
                <p className="text-sm font-medium text-white">{item.title}</p>
              )}
              {item.caption && (
                <p className="text-xs text-white/80 line-clamp-2">{item.caption}</p>
              )}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded-full bg-white/90 p-3 text-2xl shadow-lg">
                👀
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );

  // Render carousel layout
  const renderCarousel = () => (
    <div className="relative">
      {galleryItems.length > 3 && (
        <>
          <button
            type="button"
            onClick={() => scrollCarousel("left")}
            className="absolute -left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 text-2xl shadow-lg transition-all hover:bg-white hover:scale-110"
            aria-label="Scroll left"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollCarousel("right")}
            className="absolute -right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-3 text-2xl shadow-lg transition-all hover:bg-white hover:scale-110"
            aria-label="Scroll right"
          >
            →
          </button>
        </>
      )}

      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {galleryItems.map((item, index) => (
          <button
            key={item.asset.id}
            type="button"
            onClick={() => openLightbox(index)}
            className="group relative aspect-square w-72 flex-shrink-0 overflow-hidden rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-offset-2"
            style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
          >
            <img
              src={item.asset.publicUrl || ""}
              alt={item.asset.alt || item.title || `Gallery image ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div
              className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-30"
              style={{ backgroundColor: primaryColor }}
            />
            {showCaptions && (item.caption || item.title) && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                {item.title && (
                  <p className="text-sm font-medium text-white">{item.title}</p>
                )}
                {item.caption && (
                  <p className="text-xs text-white/80 line-clamp-2">{item.caption}</p>
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {autoPlay && (
        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: primaryColor }} />
          Auto-playing 🎉
        </div>
      )}
    </div>
  );

  // Render masonry layout
  const renderMasonry = () => (
    <div className="columns-2 gap-4 lg:columns-3">
      {galleryItems.map((item, index) => (
        <button
          key={item.asset.id}
          type="button"
          onClick={() => openLightbox(index)}
          className="group relative mb-4 block w-full overflow-hidden rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-offset-2"
          style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
        >
          <img
            src={item.asset.publicUrl || ""}
            alt={item.asset.alt || item.title || `Gallery image ${index + 1}`}
            className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div
            className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-30"
            style={{ backgroundColor: primaryColor }}
          />
          {showCaptions && (item.caption || item.title) && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
              {item.title && (
                <p className="text-sm font-medium text-white">{item.title}</p>
              )}
              {item.caption && (
                <p className="text-xs text-white/80 line-clamp-2">{item.caption}</p>
              )}
            </div>
          )}
        </button>
      ))}
    </div>
  );

  // Render slideshow layout
  const renderSlideshow = () => (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-muted shadow-xl">
        <div
          className={`absolute inset-0 flex items-center justify-center ${getTransitionClass(true)}`}
        >
          <img
            src={currentSlideItem?.asset.publicUrl || ""}
            alt={currentSlideItem?.asset.alt || currentSlideItem?.title || `Slide ${currentSlide + 1}`}
            className="h-full w-full object-contain"
          />
        </div>

        {showCaptions && currentSlideItem && (currentSlideItem.caption || currentSlideItem.title || currentSlideItem.moment) && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            {currentSlideItem.moment && (
              <p className="text-sm text-white/70">{currentSlideItem.moment}</p>
            )}
            {currentSlideItem.title && (
              <p className="text-xl font-medium text-white">{currentSlideItem.title}</p>
            )}
            {currentSlideItem.caption && (
              <p className="mt-1 max-w-2xl text-sm text-white/80">{currentSlideItem.caption}</p>
            )}
          </div>
        )}

        {galleryItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-4 text-2xl text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-110"
              aria-label="Previous slide"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-4 text-2xl text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-110"
              aria-label="Next slide"
            >
              →
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => openLightbox(currentSlide)}
          className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-all hover:bg-white/30"
          aria-label="View fullscreen"
        >
          🔍
        </button>

        {autoPlay && isPaused && (
          <div className="absolute left-4 top-4 rounded-full bg-white/20 px-3 py-1 text-sm text-white backdrop-blur-sm">
            ⏸️ Paused
          </div>
        )}
      </div>

      {galleryItems.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {galleryItems.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-3 rounded-full transition-all ${
                index === currentSlide ? "w-8" : "w-3 hover:opacity-80"
              }`}
              style={{
                backgroundColor: index === currentSlide ? primaryColor : `${primaryColor}40`,
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {galleryItems.length > 1 && galleryItems.length <= 10 && (
        <div className="mt-4 flex justify-center gap-2">
          {galleryItems.map((item, index) => (
            <button
              key={item.asset.id}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all ${
                index === currentSlide
                  ? "border-primary ring-2 ring-primary/30 scale-110"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={item.asset.publicUrl || ""}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {autoPlay && !isPaused && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: primaryColor,
              animation: `progress ${autoPlayInterval}s linear infinite`,
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );

  const renderGallery = () => {
    switch (displayMode) {
      case "carousel":
        return renderCarousel();
      case "masonry":
        return renderMasonry();
      case "slideshow":
        return renderSlideshow();
      case "grid":
      default:
        return renderGrid();
    }
  };

  return (
    <SectionWrapper ariaLabel="Photo gallery" className="bg-muted/30">
      <SectionTitle>{normalizedData.heading}</SectionTitle>
      <div className="mx-auto max-w-5xl">{renderGallery()}</div>

      {/* Lightbox */}
      {lightboxIndex !== null && currentItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          onClick={closeLightbox}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Close lightbox"
          >
            ✕
          </button>

          {autoPlay && (
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
              {isPaused ? "⏸️ Paused" : "▶️ Auto-playing"}
            </div>
          )}

          {galleryItems.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Previous image"
            >
              ←
            </button>
          )}

          <div
            className={`flex h-[80vh] w-[90vw] max-w-5xl flex-col items-center justify-center ${getTransitionClass(true)}`}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentItem.asset.publicUrl || ""}
              alt={currentItem.asset.alt || currentItem.title || `Gallery image ${lightboxIndex + 1}`}
              className="max-h-[70vh] max-w-full object-contain"
            />
            {showCaptions && (currentItem.caption || currentItem.title || currentItem.moment) && (
              <div className="mt-4 text-center">
                {currentItem.moment && (
                  <p className="text-sm text-white/60">{currentItem.moment}</p>
                )}
                {currentItem.title && (
                  <p className="text-lg font-medium text-white">{currentItem.title}</p>
                )}
                {currentItem.caption && (
                  <p className="mt-1 max-w-xl text-sm text-white/80">{currentItem.caption}</p>
                )}
              </div>
            )}
          </div>

          {galleryItems.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              aria-label="Next image"
            >
              →
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4">
            <div
              className="rounded-full px-6 py-2 text-white backdrop-blur-sm"
              style={{ backgroundColor: `${primaryColor}cc` }}
            >
              {lightboxIndex + 1} / {galleryItems.length}
            </div>
            {autoPlay && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsPaused(!isPaused); }}
                className="rounded-full bg-white/10 p-2 text-xl text-white transition-colors hover:bg-white/20"
                aria-label={isPaused ? "Resume auto-play" : "Pause auto-play"}
              >
                {isPaused ? "▶️" : "⏸️"}
              </button>
            )}
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
