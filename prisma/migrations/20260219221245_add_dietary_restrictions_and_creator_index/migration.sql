-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "dietary_restrictions" TEXT;

-- CreateIndex
CREATE INDEX "events_creator_id_idx" ON "events"("creator_id");
