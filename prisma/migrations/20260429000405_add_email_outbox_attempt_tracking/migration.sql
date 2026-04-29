-- AlterTable
ALTER TABLE "email_outbox" ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_attempt_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "email_outbox_status_updated_at_idx" ON "email_outbox"("status", "updated_at");
