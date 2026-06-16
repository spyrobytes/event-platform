-- Backfill Event.cover_media_asset_id for existing events (Tier 2 / issue #211).
-- Links each event's denormalized cover URL to its uploaded MediaAsset by
-- matching public_url, so render sites can read the cover's renditionWidths.
--
-- Idempotent: only fills rows that are still NULL. Pasted external cover URLs
-- have no matching asset and correctly stay NULL.
UPDATE "events" e
SET "cover_media_asset_id" = ma."id"
FROM "media_assets" ma
WHERE e."cover_image_url" IS NOT NULL
  AND e."cover_media_asset_id" IS NULL
  AND ma."public_url" = e."cover_image_url";
