-- CreateEnum
CREATE TYPE "RsvpSide" AS ENUM ('GROOMS_SIDE', 'BRIDES_SIDE', 'BOTH');

-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "side" "RsvpSide";
