-- AlterTable
ALTER TABLE "events" ADD COLUMN     "slug_locked_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "event_slug_history" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_slug_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_slug_history_slug_key" ON "event_slug_history"("slug");

-- CreateIndex
CREATE INDEX "event_slug_history_event_id_idx" ON "event_slug_history"("event_id");

-- AddForeignKey
ALTER TABLE "event_slug_history" ADD CONSTRAINT "event_slug_history_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
