-- CreateEnum
CREATE TYPE "PassBackdropStyle" AS ENUM ('NONE', 'CARD', 'PAGE');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "pass_backdrop_style" "PassBackdropStyle" NOT NULL DEFAULT 'NONE';
