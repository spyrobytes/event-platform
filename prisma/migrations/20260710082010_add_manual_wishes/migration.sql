-- CreateTable
CREATE TABLE "manual_wishes" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_wishes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manual_wishes_event_id_idx" ON "manual_wishes"("event_id");

-- AddForeignKey
ALTER TABLE "manual_wishes" ADD CONSTRAINT "manual_wishes_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
