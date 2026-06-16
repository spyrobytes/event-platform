-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "rendition_widths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
