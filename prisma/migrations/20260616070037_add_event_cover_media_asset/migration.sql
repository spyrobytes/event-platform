-- AlterTable
ALTER TABLE "events" ADD COLUMN     "cover_media_asset_id" TEXT;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cover_media_asset_id_fkey" FOREIGN KEY ("cover_media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
