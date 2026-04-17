-- AlterTable
ALTER TABLE "invitation_configs" ADD COLUMN     "ceremony_start_at" TIMESTAMPTZ(6),
ADD COLUMN     "reception_start_at" TIMESTAMPTZ(6);
