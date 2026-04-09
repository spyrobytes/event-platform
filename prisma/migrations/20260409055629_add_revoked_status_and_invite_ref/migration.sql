-- AlterEnum
ALTER TYPE "InviteStatus" ADD VALUE 'REVOKED';

-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "invite_ref" TEXT;

-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "revoked_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "analytics_events_invite_ref_idx" ON "analytics_events"("invite_ref");
