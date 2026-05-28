"use client";

import Image from "next/image";
import { isAllowedImageHost } from "@/lib/images/host";
import type { PublicGalleryItem } from "@/schemas/gallery";

type Props = {
  featuredItems: PublicGalleryItem[];
  /** Click handler — receives the clicked featured item. The
   *  orchestrator resolves the item to an index in the main grid
   *  (prepending it if it hasn't been paginated in yet) before opening
   *  the shared lightbox. Passing the item rather than an index keeps
   *  the strip ignorant of the main array's shape and makes the
   *  "featured item not in first page" case correct — the strip used
   *  to fall back to `onOpenLightbox(featuredIdx)`, which silently
   *  opened an unrelated photo from the main grid. */
  onOpen: (item: PublicGalleryItem) => void;
};

/**
 * Horizontal scroll-snap row of curated featured photos, shown above
 * the main gallery grid. Acts as an editorial preview — guide §2.3.
 *
 * Featured items overlap the main grid by design (the PublicGallery
 * type's overlap contract). Clicking a featured tile hands the item
 * up to the orchestrator, which opens the shared lightbox at its
 * position — so the strip and grid feel like one experience, not two
 * separate viewers.
 */
export function FeaturedGalleryStrip({ featuredItems, onOpen }: Props) {
  if (featuredItems.length === 0) return null;

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
              onClick={() => onOpen(item)}
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
