import { db } from "@/lib/db";
import { resolveGalleryCoverUrl } from "@/lib/gallery-cover";
import { getTrustedHostName } from "@/lib/gallery-trusted-hosts";
import {
  externalLinkSourceRefSchema,
  type PublicGallery,
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
 * Returns the published gallery for the event in a public-safe shape, or
 * null if no published gallery exists. Excludes provider IDs, raw source
 * URLs (other than the external CTA target), storage keys, and any
 * worker/error metadata.
 *
 * Phase 1 (external-link only): items array is always empty. Phase 4 will
 * populate it with `READY`, non-hidden items.
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
      items: {
        where: { status: "READY", isHidden: false },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          status: true,
          isHidden: true,
          sortOrder: true,
          thumbnailUrl: true,
          publicUrl: true,
        },
      },
    },
  });

  if (!gallery) return null;

  // Hero is the last fallback in the cover resolver chain — only fetch it
  // when nothing earlier will resolve. Keeps the published-gallery render
  // path at one query in the common case (organizer set an explicit cover
  // or has at least one ready item).
  const explicitCoverResolves =
    (gallery.coverMediaAssetId !== null &&
      gallery.coverAsset?.publicUrl != null) ||
    (gallery.coverGalleryItemId !== null &&
      gallery.items.some(
        (i) =>
          i.id === gallery.coverGalleryItemId &&
          (i.thumbnailUrl !== null || i.publicUrl !== null),
      ));
  const itemFallbackResolves = gallery.items.some(
    (i) =>
      i.status === "READY" &&
      !i.isHidden &&
      (i.thumbnailUrl !== null || i.publicUrl !== null),
  );
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
    items: gallery.items,
    coverAsset: gallery.coverAsset,
    heroAsset,
  });

  if (gallery.sourceType === "EXTERNAL_LINK") {
    const parsed = externalLinkSourceRefSchema.safeParse(gallery.sourceRef);
    // If source_ref shape is somehow invalid (legacy row, manual edit),
    // treat the gallery as non-existent rather than rendering a broken card.
    if (!parsed.success) return null;
    return {
      id: gallery.id,
      sourceType: "EXTERNAL_LINK",
      title: gallery.title,
      description: gallery.description,
      coverUrl,
      externalLink: {
        url: parsed.data.url,
        ctaLabel: parsed.data.ctaLabel ?? DEFAULT_EXTERNAL_CTA_LABEL,
        trustedHostName: getTrustedHostName(parsed.data.url),
      },
    };
  }

  return {
    id: gallery.id,
    sourceType: "NATIVE",
    title: gallery.title,
    description: gallery.description,
    coverUrl,
    items: [],
    pageInfo: { nextCursor: null },
  };
}

/**
 * Returns the (single) gallery for the event from the organizer's perspective
 * — includes drafts and hidden galleries. Used by the dashboard and by API
 * routes that need to mutate gallery state. Returns null when no gallery row
 * exists for the event.
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
    },
  });
}
