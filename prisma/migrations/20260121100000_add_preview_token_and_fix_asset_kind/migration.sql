-- AlterEnum: Change UPLOAD to HERO in AssetKind
BEGIN;
CREATE TYPE "AssetKind_new" AS ENUM ('HERO', 'GALLERY');
ALTER TABLE "media_assets" ALTER COLUMN "kind" TYPE "AssetKind_new" USING ("kind"::text::"AssetKind_new");
ALTER TYPE "AssetKind" RENAME TO "AssetKind_old";
ALTER TYPE "AssetKind_new" RENAME TO "AssetKind";
DROP TYPE "public"."AssetKind_old";
COMMIT;

-- AlterTable: Add preview token columns to events
ALTER TABLE "events" ADD COLUMN "preview_token" TEXT;
ALTER TABLE "events" ADD COLUMN "preview_token_expires_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "events_preview_token_key" ON "events"("preview_token");
