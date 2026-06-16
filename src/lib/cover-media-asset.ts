import { db } from "@/lib/db";

/**
 * Resolves the `MediaAsset` behind an event's cover URL.
 *
 * `Event.coverImageUrl` is a denormalized string that may be an uploaded
 * asset's `publicUrl` or a pasted external URL. When it matches an uploaded
 * asset we store its id in `Event.coverMediaAssetId`, so render sites can read
 * the cover's responsive `renditionWidths` via a join (issue #211, Tier 2).
 *
 * Matches on `publicUrl` alone (globally unique — the storage path embeds the
 * event id + upload timestamp), so a duplicated event whose cover URL points at
 * the original's asset links to that asset and reuses its renditions. Returns
 * null for empty covers and pasted external URLs (no query when falsy).
 */
export async function resolveCoverMediaAssetId(
  coverImageUrl: string | null | undefined
): Promise<string | null> {
  if (!coverImageUrl) return null;
  const asset = await db.mediaAsset.findFirst({
    where: { publicUrl: coverImageUrl },
    select: { id: true },
  });
  return asset?.id ?? null;
}
