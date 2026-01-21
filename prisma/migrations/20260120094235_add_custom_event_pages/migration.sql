-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('UPLOAD', 'GALLERY');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "config_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "page_config" JSONB,
ADD COLUMN     "template_id" TEXT,
ADD COLUMN     "theme_preset" TEXT;

-- CreateTable
CREATE TABLE "page_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "preview_url" TEXT,
    "defaults" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "public_url" TEXT,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_page_versions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "page_config" JSONB NOT NULL,
    "config_version" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_templates_category_idx" ON "page_templates"("category");

-- CreateIndex
CREATE INDEX "page_templates_is_active_idx" ON "page_templates"("is_active");

-- CreateIndex
CREATE INDEX "media_assets_event_id_kind_idx" ON "media_assets"("event_id", "kind");

-- CreateIndex
CREATE INDEX "media_assets_owner_user_id_idx" ON "media_assets"("owner_user_id");

-- CreateIndex
CREATE INDEX "event_page_versions_event_id_created_at_idx" ON "event_page_versions"("event_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_template_id_idx" ON "events"("template_id");

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_page_versions" ADD CONSTRAINT "event_page_versions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
