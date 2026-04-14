-- Backfill the new "couple" media tag.
--
-- Previously the Couple Photo picker filtered on `hero` OR `portrait`, so any
-- asset tagged `portrait` showed up under both the Couple Photo picker and the
-- Party Members picker. We've introduced a dedicated `couple` tag; the picker
-- now filters on `couple` only.
--
-- To preserve existing selections, tag every asset currently referenced by
-- `hero.couplePhotoAssetId` in the latest page config per event with `couple`.
-- Assets that were candidates but never selected are left as-is — users can
-- re-tag them from the media library if they want them back in the picker.

WITH latest_versions AS (
  SELECT DISTINCT ON (event_id) event_id, page_config
  FROM event_page_versions
  ORDER BY event_id, created_at DESC
),
selected_ids AS (
  SELECT DISTINCT page_config->'hero'->>'couplePhotoAssetId' AS asset_id
  FROM latest_versions
  WHERE page_config->'hero'->>'couplePhotoAssetId' IS NOT NULL
)
UPDATE media_assets
SET tags = array_append(tags, 'couple')
WHERE id IN (SELECT asset_id FROM selected_ids)
  AND NOT ('couple' = ANY(tags));
