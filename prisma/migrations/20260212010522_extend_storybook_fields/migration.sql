-- AlterTable
ALTER TABLE "invitation_configs" ADD COLUMN     "couple_photo_url" TEXT,
ADD COLUMN     "person1_quote" TEXT,
ADD COLUMN     "person1_quote_attr" TEXT,
ADD COLUMN     "person2_quote" TEXT,
ADD COLUMN     "person2_quote_attr" TEXT,
ADD COLUMN     "reception_address" TEXT,
ADD COLUMN     "reception_time" TEXT,
ADD COLUMN     "reception_venue" TEXT,
ADD COLUMN     "rsvp_deadline" TEXT,
ADD COLUMN     "story_heading" TEXT,
ADD COLUMN     "story_paragraphs" TEXT[],
ADD COLUMN     "timeline_json" JSONB,
ADD COLUMN     "venue_photo_url" TEXT;
