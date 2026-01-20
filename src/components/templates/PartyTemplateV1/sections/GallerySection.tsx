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
 * Party Gallery Section
 * Playful masonry-style grid with fun hover effects and lightbox.
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
      <SectionTitle>Party Pics 📸</SectionTitle>
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryAssets.map((asset, index) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => openLightbox(index)}
              className="group relative aspect-square overflow-hidden rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-offset-2"
              style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
            >
              <Image
                src={asset.publicUrl || ""}
                alt={asset.alt || `Gallery image ${index + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-110"
              />
              {/* Colorful overlay on hover */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-30"
                style={{ backgroundColor: primaryColor }}
              />
              {/* View icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <span className="rounded-full bg-white/90 p-3 text-2xl shadow-lg">
                  👀
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close lightbox"
          >
            ✕
          </button>

          {/* Previous button */}
          {galleryAssets.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Previous image"
            >
              ←
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
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Next image"
            >
              →
            </button>
          )}

          {/* Counter */}
          <div
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full px-6 py-2 text-white backdrop-blur-sm"
            style={{ backgroundColor: `${primaryColor}cc` }}
          >
            {lightboxIndex + 1} / {galleryAssets.length}
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
