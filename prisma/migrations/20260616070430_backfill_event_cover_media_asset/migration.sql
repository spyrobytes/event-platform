-- Backfill Event.cover_media_asset_id for existing events (Tier 2 / issue #211).
-- Links each event's denormalized cover URL to ITS OWN uploaded MediaAsset by
-- matching public_url, so render sites can read the cover's renditionWidths.
--
-- Scoped by ma.event_id = e.id: keeps the match a 1:1 identity (no cross-event
-- link), and uses the media_assets (event_id, ...) index instead of an
-- unindexed public_url full scan. Idempotent: only fills rows still NULL.
-- Pasted external cover URLs have no matching asset and correctly stay NULL.
UPDATE "events" e
SET "cover_media_asset_id" = ma."id"
FROM "media_assets" ma
WHERE e."cover_image_url" IS NOT NULL
  AND e."cover_media_asset_id" IS NULL
  AND ma."event_id" = e."id"
  AND ma."public_url" = e."cover_image_url";
