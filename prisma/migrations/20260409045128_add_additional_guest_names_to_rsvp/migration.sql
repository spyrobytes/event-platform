-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "additional_guest_names" TEXT[] DEFAULT ARRAY[]::TEXT[];
