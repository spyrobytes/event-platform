-- CreateEnum
CREATE TYPE "LaunchInviteStatus" AS ENUM ('PENDING', 'SENT', 'CLAIMED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "launch_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "status" "LaunchInviteStatus" NOT NULL DEFAULT 'PENDING',
    "uses_remaining" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3),
    "claimed_by_id" TEXT,
    "claimed_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "launch_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "launch_invites_code_key" ON "launch_invites"("code");

-- CreateIndex
CREATE INDEX "launch_invites_code_idx" ON "launch_invites"("code");

-- CreateIndex
CREATE INDEX "launch_invites_email_idx" ON "launch_invites"("email");

-- CreateIndex
CREATE INDEX "launch_invites_status_idx" ON "launch_invites"("status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_email_key" ON "waitlist"("email");

-- AddForeignKey
ALTER TABLE "launch_invites" ADD CONSTRAINT "launch_invites_claimed_by_id_fkey" FOREIGN KEY ("claimed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
