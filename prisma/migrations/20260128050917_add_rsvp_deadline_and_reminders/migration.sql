-- AlterEnum
ALTER TYPE "EmailTemplate" ADD VALUE 'NO_RESPONSE_REMINDER';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "reminder_days" INTEGER,
ADD COLUMN     "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rsvp_deadline" TIMESTAMP(3);
