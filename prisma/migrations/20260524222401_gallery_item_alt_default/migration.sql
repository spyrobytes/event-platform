/*
  Warnings:

  - Made the column `alt` on table `event_gallery_items` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "event_gallery_items" ALTER COLUMN "alt" SET NOT NULL,
ALTER COLUMN "alt" SET DEFAULT '';
