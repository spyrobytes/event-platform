import { db } from "@/lib/db";

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
