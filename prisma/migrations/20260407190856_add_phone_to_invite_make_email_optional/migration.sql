-- AlterTable: make email optional on invites
ALTER TABLE "invites" ALTER COLUMN "email" DROP NOT NULL;

-- AddColumn: phone number in E.164 format
ALTER TABLE "invites" ADD COLUMN "phone" TEXT;

-- CreateIndex: unique constraint on (event_id, phone)
CREATE UNIQUE INDEX "invites_event_id_phone_key" ON "invites"("event_id", "phone");

-- CreateIndex: composite index for phone lookups within an event
CREATE INDEX "invites_event_id_phone_idx" ON "invites"("event_id", "phone");
