-- CreateEnum
CREATE TYPE "InvitationTemplate" AS ENUM ('ENVELOPE_REVEAL', 'LAYERED_UNFOLD', 'CINEMATIC_SCROLL', 'TIME_BASED_REVEAL');

-- CreateEnum
CREATE TYPE "TextDirection" AS ENUM ('LTR', 'RTL');

-- CreateTable
CREATE TABLE "invitation_configs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "template" "InvitationTemplate" NOT NULL DEFAULT 'ENVELOPE_REVEAL',
    "theme_id" TEXT NOT NULL DEFAULT 'ivory',
    "typography_pair" TEXT NOT NULL DEFAULT 'classic',
    "couple_display_name" TEXT,
    "custom_message" TEXT,
    "dress_code" TEXT,
    "hero_image_url" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "text_direction" "TextDirection" NOT NULL DEFAULT 'LTR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_configs_event_id_key" ON "invitation_configs"("event_id");

-- AddForeignKey
ALTER TABLE "invitation_configs" ADD CONSTRAINT "invitation_configs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
