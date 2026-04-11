-- Phase 1 of Media Library consolidation: introduce tag-based classification
-- for MediaAsset, decoupled from the existing `kind` (HERO | GALLERY) column.
--
-- `kind` stays as-is for storage-path routing and backward compatibility.
-- `tags` is an additive text array; existing rows are backfilled from `kind`
-- so editor filters that switch to tag-based lookups find existing assets.

-- AlterTable: add the tags column
ALTER TABLE "media_assets" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill existing rows from their kind so editor tag filters still match them
UPDATE "media_assets" SET "tags" = ARRAY['hero']    WHERE "kind" = 'HERO'    AND cardinality("tags") = 0;
UPDATE "media_assets" SET "tags" = ARRAY['gallery'] WHERE "kind" = 'GALLERY' AND cardinality("tags") = 0;

-- GIN index for fast array containment / overlap queries on tags
CREATE INDEX "media_assets_tags_idx" ON "media_assets" USING GIN ("tags");
