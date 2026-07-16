/*
  Warnings:

  - You are about to drop the column `ceremony_address` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `ceremony_date` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `ceremony_start_at` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `ceremony_time` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `ceremony_venue` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `reception_address` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `reception_date` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `reception_start_at` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `reception_time` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `reception_venue` on the `invitation_configs` table. All the data in the column will be lost.
  - You are about to drop the column `rsvp_deadline` on the `invitation_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invitation_configs" DROP COLUMN "ceremony_address",
DROP COLUMN "ceremony_date",
DROP COLUMN "ceremony_start_at",
DROP COLUMN "ceremony_time",
DROP COLUMN "ceremony_venue",
DROP COLUMN "reception_address",
DROP COLUMN "reception_date",
DROP COLUMN "reception_start_at",
DROP COLUMN "reception_time",
DROP COLUMN "reception_venue",
DROP COLUMN "rsvp_deadline";
