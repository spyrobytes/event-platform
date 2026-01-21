"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { SectionWrapper, SectionTitle } from "../../shared";
import type { MediaAsset } from "@prisma/client";

type GallerySectionProps = {
  data: {
    assetIds: string[];
  };
  assets: MediaAsset[];
  primaryColor: string;
};

/**
 * Conference Gallery Section
 * Professional grid layout with keyboard-accessible lightbox.
 */
export function GallerySection({ data, assets, primaryColor }: GallerySectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filter assets to only those in the gallery
  const galleryAssets = data.assetIds
    .map((id) => assets.find((a) => a.id === id))
    .filter((a): a is MediaAsset => a !== undefined);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const nextImage = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % galleryAssets.length : null
    );
  }, [galleryAssets.length]);

  const prevImage = useCallback(() => {
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + galleryAssets.length) % galleryAssets.length
        : null
    );
  }, [galleryAssets.length]);

  // Handle keyboard navigation
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
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, closeLightbox, nextImage, prevImage]);

  if (galleryAssets.length === 0) {
    return null;
  }

  return (
    <SectionWrapper ariaLabel="Photo gallery" className="bg-muted/30">
      <SectionTitle>Gallery</SectionTitle>
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryAssets.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => openLightbox(index)}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
            >
              <Image
                src={asset.publicUrl || ""}
                alt={asset.alt || `Gallery image ${index + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                <span className="rounded-full bg-white/0 p-3 text-white opacity-0 transition-all group-hover:bg-white/20 group-hover:opacity-100">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close lightbox (Escape)"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {galleryAssets.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 z-10 rounded-lg bg-white/10 p-3 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Previous image (Left arrow)"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image container */}
          <div
            className="relative h-[80vh] w-[90vw] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={galleryAssets[lightboxIndex].publicUrl || ""}
              alt={galleryAssets[lightboxIndex].alt || `Gallery image ${lightboxIndex + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
          </div>

          {/* Next button */}
          {galleryAssets.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 z-10 rounded-lg bg-white/10 p-3 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Next image (Right arrow)"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Counter and keyboard hint */}
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center">
            <div className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
              {lightboxIndex + 1} / {galleryAssets.length}
            </div>
            <div className="mt-2 text-xs text-white/60">
              Use arrow keys to navigate, Esc to close
            </div>
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
