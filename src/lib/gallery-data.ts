import { db } from "@/lib/db";
import { resolveGalleryCoverUrl } from "@/lib/gallery-cover";
import { getTrustedHostName } from "@/lib/gallery-trusted-hosts";
import {
  externalLinkSourceRefSchema,
  type PublicGallery,
  type PublicGalleryItem,
} from "@/schemas/gallery";

/**
 * Data-access helpers for post-event galleries.
 *
 * These functions own the published / visible filtering and the public
 * payload shaping. Routes and pages should call them rather than touching
 * `db.eventGallery` directly so the "no provider internals in public
 * payloads" contract stays in one place.
 */

const DEFAULT_EXTERNAL_CTA_LABEL = "View Photos";

/**
 * First-page size for the native gallery render. Tuned for a 4×6 / 3×8
 * grid that fills above-the-fold on common laptops. The lightbox + grid
 * client component fetches subsequent pages via `getPublicGalleryItems`.
 */
export const GALLERY_PAGE_SIZE = 24;

type PublicItemSelect = {
  id: string;
  publicUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
  alt: string;
  caption: string | null;
  sortOrder: number;
};

function toPublicItem(row: PublicItemSelect): PublicGalleryItem | null {
  // The worker writes publicUrl + thumbnailUrl as a pair when an item
  // reaches READY. Defensive null check guards against a corrupt row
  // (e.g. the row was promoted to READY before storage URLs landed —
  // shouldn't happen but we shouldn't render a broken <img> if it does).
  if (!row.publicUrl || !row.thumbnailUrl) return null;
  return {
    id: row.id,
    src: row.publicUrl,
    thumbnailSrc: row.thumbnailUrl,
    width: row.width,
    height: row.height,
    blurDataUrl: row.blurDataUrl,
    alt: row.alt,
    caption: row.caption,
  };
}

/**
 * Fetches a page of READY, non-hidden items for a gallery. Used both by
 * `getPublishedGalleryForEvent` (first page during SSR) and by the
 * public pagination endpoint (subsequent pages on scroll).
 *
 * Cursor is the previous page's last item's id; ordering is by
 * (sortOrder ASC, id ASC) so duplicate sortOrder values stay stable.
 */
export async function getPublicGalleryItems(
  galleryId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<{ items: PublicGalleryItem[]; nextCursor: string | null }> {
  const limit = options.limit ?? GALLERY_PAGE_SIZE;
  // Take limit+1 so we can detect "is there a next page" without a
  // second count query.
  const rows = await db.eventGalleryItem.findMany({
    where: { galleryId, status: "READY", isHidden: false },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(options.cursor
      ? { cursor: { id: options.cursor }, skip: 1 }
      : {}),
    select: {
      id: true,
      publicUrl: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      blurDataUrl: true,
      alt: true,
      caption: true,
      sortOrder: true,
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page
    .map(toPublicItem)
    .filter((item): item is PublicGalleryItem => item !== null);

  return {
    items,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/**
 * Returns the published gallery for the event in a public-safe shape, or
 * null if no published gallery exists. Excludes provider IDs, raw source
 * URLs (other than the external CTA target), storage keys, and any
 * worker/error metadata.
 *
 * For NATIVE galleries, this returns only the FIRST page of items
 * (GALLERY_PAGE_SIZE). The client component fetches subsequent pages
 * via `getPublicGalleryItems` through the public pagination endpoint.
 */
export async function getPublishedGalleryForEvent(
  eventId: string,
): Promise<PublicGallery | null> {
  const gallery = await db.eventGallery.findFirst({
    where: { eventId, status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      description: true,
      sourceType: true,
      sourceRef: true,
      coverGalleryItemId: true,
      coverMediaAssetId: true,
      coverAsset: { select: { publicUrl: true } },
    },
  });

  if (!gallery) return null;

  // External-link galleries don't have items; skip the items query entirely.
  if (gallery.sourceType === "EXTERNAL_LINK") {
    const parsed = externalLinkSourceRefSchema.safeParse(gallery.sourceRef);
    if (!parsed.success) return null;

    // For the cover resolver: external-link galleries fall through to
    // hero asset if no explicit cover is set (no items to fall back on).
    const needsHero =
      !(gallery.coverMediaAssetId !== null && gallery.coverAsset?.publicUrl) &&
      !gallery.coverGalleryItemId;
    const heroAsset = needsHero
      ? await db.mediaAsset.findFirst({
          where: { eventId, kind: "HERO" },
          select: { publicUrl: true },
          orderBy: { createdAt: "desc" },
        })
      : null;

    return {
      id: gallery.id,
      sourceType: "EXTERNAL_LINK",
      title: gallery.title,
      description: gallery.description,
      coverUrl: resolveGalleryCoverUrl({
        coverGalleryItemId: gallery.coverGalleryItemId,
        coverMediaAssetId: gallery.coverMediaAssetId,
        items: [],
        coverAsset: gallery.coverAsset,
        heroAsset,
      }),
      externalLink: {
        url: parsed.data.url,
        ctaLabel: parsed.data.ctaLabel ?? DEFAULT_EXTERNAL_CTA_LABEL,
        trustedHostName: getTrustedHostName(parsed.data.url),
      },
    };
  }

  // NATIVE branch: fetch the first page of items, then resolve the cover
  // off what's loaded. Hero query only runs when nothing earlier resolves.
  const { items, nextCursor } = await getPublicGalleryItems(gallery.id);

  // The cover resolver uses richer item data than the public type carries
  // (status/isHidden/sortOrder). Re-fetch the cover candidate separately
  // when explicitly referenced, so we don't widen PublicGalleryItem.
  const coverCandidateItems = items.map((i) => ({
    id: i.id,
    status: "READY" as const,
    isHidden: false,
    sortOrder: 0,
    thumbnailUrl: i.thumbnailSrc,
    publicUrl: i.src,
  }));

  const explicitCoverResolves =
    (gallery.coverMediaAssetId !== null &&
      gallery.coverAsset?.publicUrl != null) ||
    (gallery.coverGalleryItemId !== null &&
      coverCandidateItems.some((i) => i.id === gallery.coverGalleryItemId));
  const itemFallbackResolves = coverCandidateItems.length > 0;

  const heroAsset =
    explicitCoverResolves || itemFallbackResolves
      ? null
      : await db.mediaAsset.findFirst({
          where: { eventId, kind: "HERO" },
          select: { publicUrl: true },
          orderBy: { createdAt: "desc" },
        });

  const coverUrl = resolveGalleryCoverUrl({
    coverGalleryItemId: gallery.coverGalleryItemId,
    coverMediaAssetId: gallery.coverMediaAssetId,
    items: coverCandidateItems,
    coverAsset: gallery.coverAsset,
    heroAsset,
  });

  return {
    id: gallery.id,
    sourceType: "NATIVE",
    title: gallery.title,
    description: gallery.description,
    coverUrl,
    items,
    pageInfo: { nextCursor },
  };
}

/**
 * Returns the (single) gallery for the event from the organizer's
 * perspective — includes drafts/hidden galleries and the full items
 * list with status + error metadata so the dashboard can curate
 * (hide, reorder, retry, delete). Returns null when no gallery row
 * exists.
 *
 * MVP cap is 50 items per gallery; the full items array fits in a
 * single response without pagination. Public-facing reads still go
 * through `getPublicGalleryItems` which paginates and strips
 * organizer-only fields.
 */
export async function getGalleryForOrganizer(eventId: string) {
  return db.eventGallery.findFirst({
    where: { eventId },
    select: {
      id: true,
      title: true,
      description: true,
      sourceType: true,
      sourceRef: true,
      status: true,
      coverMediaAssetId: true,
      coverGalleryItemId: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      items: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
          id: true,
          status: true,
          publicUrl: true,
          thumbnailUrl: true,
          width: true,
          height: true,
          blurDataUrl: true,
          alt: true,
          caption: true,
          sortOrder: true,
          isHidden: true,
          attempts: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
        },
      },
      _count: {
        select: { items: true },
      },
    },
  });
}
