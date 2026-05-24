-- CreateEnum
CREATE TYPE "GallerySourceType" AS ENUM ('EXTERNAL_LINK', 'GOOGLE_DRIVE', 'DROPBOX', 'ONEDRIVE', 'GOOGLE_PHOTOS', 'MANUAL_UPLOAD');

-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('DRAFT', 'SYNCING', 'READY', 'PUBLISHED', 'ERROR', 'HIDDEN');

-- CreateEnum
CREATE TYPE "MediaImportStatus" AS ENUM ('PENDING', 'IMPORTING', 'READY', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "GalleryImportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED');

-- CreateTable
CREATE TABLE "event_galleries" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "cover_media_asset_id" TEXT,
    "cover_gallery_item_id" TEXT,
    "source_type" "GallerySourceType" NOT NULL,
    "source_ref" JSONB,
    "status" "GalleryStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "event_galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_gallery_items" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "source_provider" "GallerySourceType",
    "source_file_id" TEXT,
    "source_url" TEXT,
    "original_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "storage_bucket" TEXT,
    "storage_key" TEXT,
    "thumbnail_key" TEXT,
    "public_url" TEXT,
    "thumbnail_url" TEXT,
    "blur_data_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "alt" TEXT,
    "caption" TEXT,
    "status" "MediaImportStatus" NOT NULL DEFAULT 'PENDING',
    "error_code" TEXT,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_gallery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_import_jobs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "provider" "GallerySourceType" NOT NULL,
    "status" "GalleryImportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "skipped_items" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "gallery_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "GallerySourceType" NOT NULL,
    "access_token_envelope" BYTEA NOT NULL,
    "refresh_token_envelope" BYTEA,
    "scope" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_galleries_event_id_idx" ON "event_galleries"("event_id");

-- CreateIndex
CREATE INDEX "event_galleries_status_idx" ON "event_galleries"("status");

-- CreateIndex
CREATE INDEX "event_gallery_items_gallery_id_idx" ON "event_gallery_items"("gallery_id");

-- CreateIndex
CREATE INDEX "event_gallery_items_status_idx" ON "event_gallery_items"("status");

-- CreateIndex
CREATE INDEX "event_gallery_items_status_locked_at_idx" ON "event_gallery_items"("status", "locked_at");

-- CreateIndex
CREATE INDEX "event_gallery_items_gallery_id_sort_order_idx" ON "event_gallery_items"("gallery_id", "sort_order");

-- CreateIndex
CREATE INDEX "gallery_import_jobs_event_id_idx" ON "gallery_import_jobs"("event_id");

-- CreateIndex
CREATE INDEX "gallery_import_jobs_gallery_id_idx" ON "gallery_import_jobs"("gallery_id");

-- CreateIndex
CREATE INDEX "gallery_import_jobs_status_idx" ON "gallery_import_jobs"("status");

-- CreateIndex
CREATE INDEX "provider_tokens_user_id_idx" ON "provider_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "provider_tokens_user_id_provider_key" ON "provider_tokens"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "event_galleries" ADD CONSTRAINT "event_galleries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_galleries" ADD CONSTRAINT "event_galleries_cover_media_asset_id_fkey" FOREIGN KEY ("cover_media_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_gallery_items" ADD CONSTRAINT "event_gallery_items_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "event_galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_import_jobs" ADD CONSTRAINT "gallery_import_jobs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_import_jobs" ADD CONSTRAINT "gallery_import_jobs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "event_galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_tokens" ADD CONSTRAINT "provider_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
