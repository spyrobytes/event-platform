"use client";

import type { GalleryVariant } from "@/schemas/gallery";
import type { GalleryLayoutProps } from "./types";
import { ClassicGridLayout } from "./ClassicGridLayout";
import { RomanticMasonryLayout } from "./RomanticMasonryLayout";
import { ScrapbookLayout } from "./ScrapbookLayout";

type Props = GalleryLayoutProps & {
  variant: GalleryVariant;
};

/**
 * Dispatches to the appropriate layout component based on the
 * organizer-chosen variant. Falls back to `ClassicGridLayout` for any
 * value not in the switch — this matches `parseGalleryPresentation`'s
 * safe-fallback contract, so a future schema migration (e.g. a removed
 * variant) renders the same default the public payload would resolve to.
 *
 * Layouts are pure rendering: pagination, lightbox state, and error UI
 * stay in the orchestrator (`PostEventGalleryGrid`).
 */
export function PostEventGalleryRenderer({
  variant,
  items,
  onOpenLightbox,
}: Props) {
  switch (variant) {
    case "romantic-masonry":
      return (
        <RomanticMasonryLayout items={items} onOpenLightbox={onOpenLightbox} />
      );
    case "scrapbook-memories":
      return <ScrapbookLayout items={items} onOpenLightbox={onOpenLightbox} />;
    case "classic-grid":
    default:
      return (
        <ClassicGridLayout items={items} onOpenLightbox={onOpenLightbox} />
      );
  }
}
