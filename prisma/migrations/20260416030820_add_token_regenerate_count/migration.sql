-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "token_regenerate_count" INTEGER NOT NULL DEFAULT 0;
