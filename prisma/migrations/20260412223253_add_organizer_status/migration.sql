-- CreateEnum
CREATE TYPE "OrganizerStatus" AS ENUM ('ACTIVE', 'UNDER_REVIEW', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "status" "OrganizerStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "status_changed_at" TIMESTAMP(3),
ADD COLUMN     "status_reason" TEXT;
