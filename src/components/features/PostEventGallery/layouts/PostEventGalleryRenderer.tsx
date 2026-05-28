"use client";

import type { GalleryPresentation } from "@/schemas/gallery";
import type { GalleryLayoutProps } from "./types";
import { ClassicGridLayout } from "./ClassicGridLayout";
import { RomanticMasonryLayout } from "./RomanticMasonryLayout";
import { ScrapbookLayout } from "./ScrapbookLayout";
import { SlideshowLayout } from "./SlideshowLayout";

type Props = GalleryLayoutProps & {
  /** Full parsed presentation so layouts can read their own settings
   *  (Slideshow reads autoplay/interval/transition; others currently
   *  read nothing extra). Renderer plucks the variant for dispatch
   *  and forwards the rest only to the layouts that need it. */
  presentation: GalleryPresentation;
};

/**
 * Dispatches to the appropriate layout component based on the
 * organizer-chosen variant. Falls back to `ClassicGridLayout` for any
 * value not in the switch — this matches `parseGalleryPresentation`'s
 * safe-fallback contract, so a future schema migration (e.g. a removed
 * variant) renders the same default the public payload would resolve to.
 *
 * Layouts are pure rendering: pagination, lightbox state, and error UI
 * stay in the orchestrator (`PostEventGalleryGrid`). Variant-specific
 * settings (e.g. slideshow autoplay/interval/transition) flow through
 * `presentation` rather than expanding `GalleryLayoutProps` — keeps the
 * shared prop surface lean while still threading the per-variant
 * configuration cleanly.
 */
export function PostEventGalleryRenderer({
  presentation,
  items,
  onOpenLightbox,
}: Props) {
  switch (presentation.variant) {
    case "romantic-masonry":
      return (
        <RomanticMasonryLayout items={items} onOpenLightbox={onOpenLightbox} />
      );
    case "scrapbook-memories":
      return <ScrapbookLayout items={items} onOpenLightbox={onOpenLightbox} />;
    case "slideshow":
      return (
        <SlideshowLayout
          items={items}
          onOpenLightbox={onOpenLightbox}
          autoplay={presentation.slideshowAutoplay}
          autoplayInterval={presentation.slideshowAutoplayInterval}
          transition={presentation.slideshowTransition}
        />
      );
    case "classic-grid":
    default:
      return (
        <ClassicGridLayout items={items} onOpenLightbox={onOpenLightbox} />
      );
  }
}
