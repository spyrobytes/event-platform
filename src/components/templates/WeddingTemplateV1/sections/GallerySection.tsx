"use client";

import { useState } from "react";
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

export function GallerySection({ data, assets, primaryColor }: GallerySectionProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Filter assets to only those in the gallery
  const galleryAssets = data.assetIds
    .map((id) => assets.find((a) => a.id === id))
    .filter((a): a is MediaAsset => a !== undefined);

  if (galleryAssets.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextImage = () =>
    setLightboxIndex((prev) =>
      prev !== null ? (prev + 1) % galleryAssets.length : null
    );
  const prevImage = () =>
    setLightboxIndex((prev) =>
      prev !== null
        ? (prev - 1 + galleryAssets.length) % galleryAssets.length
        : null
    );

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
              className="group relative aspect-square overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
            >
              <Image
                src={asset.publicUrl || ""}
                alt={asset.alt || `Gallery image ${index + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
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
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          {galleryAssets.length > 1 && (
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Previous image"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="relative h-[80vh] w-[90vw] max-w-5xl">
            <Image
              src={galleryAssets[lightboxIndex].publicUrl || ""}
              alt={galleryAssets[lightboxIndex].alt || `Gallery image ${lightboxIndex + 1}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>

          {/* Next button */}
          {galleryAssets.length > 1 && (
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              aria-label="Next image"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white">
            {lightboxIndex + 1} / {galleryAssets.length}
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
