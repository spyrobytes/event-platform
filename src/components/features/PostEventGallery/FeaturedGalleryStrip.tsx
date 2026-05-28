"use client";

import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import type { PublicGalleryItem } from "@/schemas/gallery";

type Props = {
  featuredItems: PublicGalleryItem[];
  /** The orchestrator's full items array — used to translate a featured
   *  item id into its index in the main grid so clicking a featured
   *  thumbnail opens the SAME lightbox at the SAME position. */
  allItems: PublicGalleryItem[];
  onOpenLightbox: (index: number) => void;
};

/**
 * Horizontal scroll-snap row of curated featured photos, shown above
 * the main gallery grid. Acts as an editorial preview — guide §2.3.
 *
 * Featured items overlap the main grid by design (the PublicGallery
 * type's overlap contract). Clicking a featured tile resolves it to its
 * index in `allItems` and opens the orchestrator's shared lightbox at
 * that position — so the strip and grid feel like one experience, not
 * two separate viewers.
 *
 * If a featured item somehow doesn't appear in the first page of items
 * (organizer flagged item 25+ while the strip is on), we fall back to
 * opening at the first featured index — the lightbox can still navigate
 * to neighbours via its arrow controls.
 */
export function FeaturedGalleryStrip({
  featuredItems,
  allItems,
  onOpenLightbox,
}: Props) {
  if (featuredItems.length === 0) return null;

  // Pre-compute id → index map once; O(featured) lookups instead of
  // O(featured × allItems) per click.
  const indexById = new Map<string, number>();
  allItems.forEach((item, idx) => indexById.set(item.id, idx));

  const handleClick = (item: PublicGalleryItem, featuredIdx: number) => {
    const idx = indexById.get(item.id);
    if (idx !== undefined) {
      onOpenLightbox(idx);
      return;
    }
    // Featured item isn't in the loaded items page yet (could happen if
    // the cap is later raised past the first page). Open at the first
    // featured index — at minimum the lightbox surfaces a featured
    // photo; the user can navigate from there.
    onOpenLightbox(featuredIdx);
  };

  return (
    <section
      aria-label="Featured photos"
      className="-mx-4 mb-10 overflow-x-auto px-4 pb-2 md:mb-12"
    >
      <ul
        role="list"
        className="flex snap-x snap-mandatory gap-3 md:gap-4"
      >
        {featuredItems.map((item, idx) => (
          <li
            key={item.id}
            className="shrink-0 snap-start"
          >
            <button
              type="button"
              onClick={() => handleClick(item, idx)}
              aria-label={item.alt || `Open featured photo ${idx + 1}`}
              className="relative block aspect-[4/5] w-44 overflow-hidden rounded-lg bg-muted shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 md:w-56"
            >
              <Image
                src={item.thumbnailSrc}
                alt={item.alt}
                fill
                sizes="(max-width: 768px) 176px, 224px"
                className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                placeholder={item.blurDataUrl ? "blur" : "empty"}
                blurDataURL={item.blurDataUrl ?? undefined}
                unoptimized={!isAllowedImageHost(item.thumbnailSrc)}
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
