-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');

-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "message_approved_at" TIMESTAMP(3),
ADD COLUMN     "message_status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "message_to_host" TEXT;

-- CreateIndex
CREATE INDEX "rsvps_event_id_message_status_idx" ON "rsvps"("event_id", "message_status");
