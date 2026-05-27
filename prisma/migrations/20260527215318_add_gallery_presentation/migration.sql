-- AlterTable
ALTER TABLE "event_galleries" ADD COLUMN     "presentation" JSONB;

-- AlterTable
ALTER TABLE "event_gallery_items" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;
