-- AlterTable
ALTER TABLE "invitation_configs" ADD COLUMN     "family_invite_text" TEXT,
ADD COLUMN     "header_mode" TEXT NOT NULL DEFAULT 'modern',
ADD COLUMN     "person1_family_name" TEXT,
ADD COLUMN     "person2_family_name" TEXT;
