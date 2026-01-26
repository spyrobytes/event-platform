-- AlterEnum
ALTER TYPE "EmailTemplate" ADD VALUE 'VERIFICATION';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "verification_expires_at" TIMESTAMP(3),
ADD COLUMN     "verification_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_verification_token_hash_key" ON "users"("verification_token_hash");
