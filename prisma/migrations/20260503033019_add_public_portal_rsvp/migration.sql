/*
  Warnings:

  - A unique constraint covering the columns `[rsvp_code_hash]` on the table `invites` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RsvpSource" AS ENUM ('EMAIL_INVITE', 'PUBLIC_PORTAL_CODE', 'PUBLIC_PORTAL_SELF_SERVE');

-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "rsvp_code_hash" TEXT,
ADD COLUMN     "rsvp_code_issued_at" TIMESTAMP(3),
ADD COLUMN     "rsvp_code_regenerate_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rsvp_code_used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rsvps" ADD COLUMN     "source" "RsvpSource" DEFAULT 'EMAIL_INVITE';

-- CreateTable
CREATE TABLE "rsvp_sessions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "invite_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rsvp_sessions_token_hash_key" ON "rsvp_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "rsvp_sessions_event_id_idx" ON "rsvp_sessions"("event_id");

-- CreateIndex
CREATE INDEX "rsvp_sessions_expires_at_idx" ON "rsvp_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "invites_rsvp_code_hash_key" ON "invites"("rsvp_code_hash");

-- AddForeignKey
ALTER TABLE "rsvp_sessions" ADD CONSTRAINT "rsvp_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvp_sessions" ADD CONSTRAINT "rsvp_sessions_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "invites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
