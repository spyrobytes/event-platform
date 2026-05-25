/**
 * Cover-image resolver for post-event galleries.
 *
 * Resolution order (decision §8.2):
 *   1. coverGalleryItemId → that item's thumbnail/public URL
 *   2. coverMediaAssetId  → that MediaAsset's publicUrl
 *   3. First READY non-hidden item (lowest sortOrder)
 *   4. Event hero asset (MediaAsset where kind = HERO)
 *   5. null — consumer renders a themed placeholder
 *
 * The dangling-reference case (item deleted but coverGalleryItemId still
 * pointing at it) is handled by silently falling through to the next step.
 * The item-delete handler in PR #7 will null the column, but old galleries
 * created before that handler shipped may still carry stale references.
 */

type CoverInput = {
  coverGalleryItemId: string | null;
  coverMediaAssetId: string | null;
  items: ReadonlyArray<{
    id: string;
    status: string;
    isHidden: boolean;
    sortOrder: number;
    thumbnailUrl: string | null;
    publicUrl: string | null;
  }>;
  coverAsset: { publicUrl: string | null } | null;
  heroAsset: { publicUrl: string | null } | null;
};

export function resolveGalleryCoverUrl(input: CoverInput): string | null {
  if (input.coverGalleryItemId) {
    const match = input.items.find((i) => i.id === input.coverGalleryItemId);
    const url = match?.thumbnailUrl ?? match?.publicUrl ?? null;
    if (url) return url;
  }

  if (input.coverMediaAssetId && input.coverAsset?.publicUrl) {
    return input.coverAsset.publicUrl;
  }

  const firstReady = input.items
    .filter((i) => i.status === "READY" && !i.isHidden)
    .sort((a, b) => a.sortOrder - b.sortOrder)[0];
  if (firstReady) {
    return firstReady.thumbnailUrl ?? firstReady.publicUrl ?? null;
  }

  if (input.heroAsset?.publicUrl) {
    return input.heroAsset.publicUrl;
  }

  return null;
}
