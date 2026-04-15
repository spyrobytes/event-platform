-- Registry guest-claim support (Phase 2 of gift registry). See
-- prisma/schema.prisma model `RegistryClaim` and src/lib/registry-claims.ts.

-- Source enum: tells a consumer whether a row came from a guest's claim
-- endpoint or from an organizer toggling `purchased` on an item.
CREATE TYPE "RegistryClaimSource" AS ENUM ('GUEST', 'ORGANIZER');

-- Claim row. itemId is the uuid stored on the registry item in page_config
-- JSON, not a FK — items live inside event_page_versions.page_config so we
-- can't enforce referential integrity at the row level. Validity is
-- enforced in the claim API by walking the event's current page config.
CREATE TABLE "registry_claims" (
    "id"                 TEXT                  NOT NULL,
    "event_id"           TEXT                  NOT NULL,
    "item_id"            TEXT                  NOT NULL,
    "invite_id"          TEXT,
    "source"             "RegistryClaimSource" NOT NULL DEFAULT 'GUEST',
    "quantity"           INTEGER               NOT NULL DEFAULT 1,
    "claimed_at"         TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thank_you_sent_at"  TIMESTAMP(3),
    "updated_at"         TIMESTAMP(3)          NOT NULL,

    CONSTRAINT "registry_claims_pkey" PRIMARY KEY ("id")
);

-- Foreign keys. Event deletion cascades; invite deletion nulls the column so
-- the claim survives an organizer revoking an invite after a purchase.
ALTER TABLE "registry_claims"
    ADD CONSTRAINT "registry_claims_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "registry_claims"
    ADD CONSTRAINT "registry_claims_invite_id_fkey"
    FOREIGN KEY ("invite_id") REFERENCES "invites"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Aggregate lookup: "how many units of item X on event Y have been claimed?"
CREATE INDEX "registry_claims_event_id_item_id_idx"
    ON "registry_claims" ("event_id", "item_id");

-- Reverse lookup: "what has guest Z claimed?" — used when the public page
-- renders and needs to mark that guest's own claims as unclaimable-by-others.
CREATE INDEX "registry_claims_invite_id_idx"
    ON "registry_claims" ("invite_id");

-- One claim row per (item, guest). Postgres treats NULL as distinct for
-- unique constraints, so this constraint does NOT cover organizer rows.
CREATE UNIQUE INDEX "registry_claims_event_id_item_id_invite_id_key"
    ON "registry_claims" ("event_id", "item_id", "invite_id");

-- Partial unique index collapsing organizer claims to at most one per item.
-- Keeps the `purchased` toggle idempotent regardless of how many times the
-- organizer flips it.
CREATE UNIQUE INDEX "registry_claims_organizer_unique"
    ON "registry_claims" ("event_id", "item_id")
    WHERE "invite_id" IS NULL;
