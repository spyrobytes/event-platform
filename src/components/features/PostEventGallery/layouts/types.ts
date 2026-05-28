import type { PublicGalleryItem } from "@/schemas/gallery";

/**
 * Shape every layout component accepts. The orchestrator
 * (`PostEventGalleryGrid`) owns pagination, lightbox state, error/loading
 * UI, and the IntersectionObserver sentinel — layouts are pure rendering
 * given the already-loaded items array.
 *
 * `onOpenLightbox(index)` is the lightbox-trigger callback; the
 * orchestrator translates the index into the lightbox view. Layouts
 * SHOULD NOT manage their own lightbox state — the shared `GalleryLightbox`
 * is portaled once at the orchestrator level so keyboard handlers,
 * focus trap, and BFCache safeguards stay consistent across variants.
 */
export type GalleryLayoutProps = {
  items: PublicGalleryItem[];
  onOpenLightbox: (index: number) => void;
};
