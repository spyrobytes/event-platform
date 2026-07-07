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
  /** Optional callback layouts can fire when they're approaching the
   *  end of the loaded items array and would benefit from a fresh
   *  page. Returns the new total length once the load resolves so the
   *  caller can reason about whether more pages might follow. The
   *  orchestrator dedupes concurrent calls (its own `loadingMore`
   *  flag) so layouts can call this freely without coordinating.
   *
   *  Scroll-driven layouts (ClassicGrid, RomanticMasonry, Scrapbook)
   *  don't need this — the orchestrator's IntersectionObserver
   *  sentinel triggers pagination as the user scrolls. Slideshow
   *  needs it because the viewer never scrolls; navigation past the
   *  last loaded item would otherwise wrap silently. */
  onRequestMore?: () => void;
  /** True when more items exist beyond what's loaded. Layouts can use
   *  this to gate prefetch nudges (e.g. "load more when current >=
   *  length - 3 AND hasMore"). False after the last page lands. */
  hasMore?: boolean;
  /** True while the orchestrator's GalleryLightbox portal is open.
   *  Layouts with their OWN document-level keyboard handlers (Slideshow)
   *  must no-op while open — the lightbox owns keyboard nav then, and
   *  both listeners sit on `document`, so nothing else suppresses the
   *  double-handling. */
  isLightboxOpen?: boolean;
};
