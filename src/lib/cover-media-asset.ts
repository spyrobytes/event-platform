import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Prisma select fragment for an event's cover responsive data. Spread into the
 * select/include of ANY query whose result feeds a cover render site (a
 * component using EventImage), so the join can't be forgotten (the cities page
 * once was). Pairs with the `EventCoverAsset` type. See issue #211 (Tier 2).
 */
export const COVER_ASSET_SELECT = {
  coverMediaAsset: { select: { renditionWidths: true } },
} as const;

/**
 * Resolves the `MediaAsset` behind an event's cover URL, scoped to that event.
 *
 * `Event.coverImageUrl` is a denormalized string that may be an uploaded
 * asset's `publicUrl` or a pasted external URL. When it matches one of THIS
 * event's uploaded assets we store its id in `Event.coverMediaAssetId`, so
 * render sites can read the cover's responsive `renditionWidths` via a join
 * (issue #211, Tier 2).
 *
 * Scoping by `eventId` keeps the match a 1:1 identity (within an event, a
 * `publicUrl` maps to a single upload), uses the `@@index([eventId, kind])`
 * index instead of scanning the whole table, and prevents cross-event links
 * from a pasted URL that happens to equal another event's asset. `orderBy`
 * makes the pick deterministic in the (effectively impossible) duplicate case.
 * Returns null for empty covers and pasted external URLs (no query when falsy).
 */
export async function resolveCoverMediaAssetId(
  eventId: string,
  coverImageUrl: string | null | undefined
): Promise<string | null> {
  if (!coverImageUrl) return null;
  const asset = await db.mediaAsset.findFirst({
    where: { eventId, publicUrl: coverImageUrl },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  return asset?.id ?? null;
}

/**
 * Cover-FK patch for an event update. `coverImageUrl === undefined` means the
 * cover is not part of this update, so the FK is left untouched (`{}`).
 * Otherwise (a URL, `""`, or `null`) the FK is re-resolved — `""` / a pasted
 * external URL resolve to `null`, clearing it. Spread into the update `data`.
 */
export async function coverMediaAssetUpdate(
  eventId: string,
  coverImageUrl: string | null | undefined
): Promise<{ coverMediaAssetId?: string | null }> {
  if (coverImageUrl === undefined) return {};
  return { coverMediaAssetId: await resolveCoverMediaAssetId(eventId, coverImageUrl) };
}

/**
 * Clears the cover pair (`coverImageUrl` + `coverMediaAssetId`) on every event
 * whose cover is one of the given assets. Call this BEFORE those assets are
 * deleted — directly (media DELETE route) or via cascade when their event is
 * deleted — so a referencing event's `coverImageUrl` doesn't drift to a deleted
 * storage object (the FK alone would SetNull but leave the URL stale). Runs in
 * the caller's transaction. See issue #211 (Tier 2).
 */
export async function clearEventCoversForAssets(
  tx: Prisma.TransactionClient,
  assetIds: string[]
): Promise<void> {
  if (assetIds.length === 0) return;
  await tx.event.updateMany({
    where: { coverMediaAssetId: { in: assetIds } },
    data: { coverImageUrl: null, coverMediaAssetId: null },
  });
}
