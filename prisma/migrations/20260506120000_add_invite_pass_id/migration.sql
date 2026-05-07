-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "pass_id" UUID NOT NULL DEFAULT gen_random_uuid();

-- CreateIndex
CREATE UNIQUE INDEX "invites_pass_id_key" ON "invites"("pass_id");
