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
 *
 * Visual chrome: a magazine-style section break — thin top + bottom
 * hairlines with an inline "★ FEATURED" eyebrow on the top rule. The
 * intent is to signal "these are curated highlights" without competing
 * with the heavy album hero above or clashing with the four main-grid
 * variants below (the band alternative was rejected because it stacked
 * a second heavy block under the gradient-overlay hero — see PR #143
 * design discussion). Hairlines live at content width; the scrolling
 * strip itself bleeds to the page edges for the mobile snap feel.
 */
export function FeaturedGalleryStrip({ featuredItems, onOpen }: Props) {
  if (featuredItems.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-strip-heading"
      className="mb-10 md:mb-12"
    >
      {/* Top hairline with inline eyebrow — non-scrolling chrome at
          content width. flex-1 on the rules lets the label sit centered
          and the hairlines fill the remaining horizontal space. */}
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <h2
          id="featured-strip-heading"
          className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          ★ Featured
        </h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      {/* Scrolling strip — bleeds to the page edges via -mx-4 px-4 so
          the leftmost tile snap-starts flush with the viewport edge on
          mobile (matching the prior behavior). */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
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
      </div>

      {/* Bottom hairline — closes the section break. */}
      <hr aria-hidden className="mt-4 border-t border-border" />
    </section>
  );
}
