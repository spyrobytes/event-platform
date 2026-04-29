-- Drop existing total unique indexes on (event_id, email) and (event_id, phone)
DROP INDEX "invites_event_id_email_key";
DROP INDEX "invites_event_id_phone_key";

-- Replace with regular indexes for query performance on revoked rows
CREATE INDEX "invites_event_id_email_idx" ON "invites"("event_id", "email");

-- Partial unique indexes: enforce uniqueness only for non-revoked rows so
-- revoked invites can be re-created (a new active row for the same address)
-- without losing the audit trail of the prior revoked row(s).
CREATE UNIQUE INDEX "invites_event_id_email_active_key"
  ON "invites"("event_id", "email")
  WHERE "status" <> 'REVOKED' AND "email" IS NOT NULL;

CREATE UNIQUE INDEX "invites_event_id_phone_active_key"
  ON "invites"("event_id", "phone")
  WHERE "status" <> 'REVOKED' AND "phone" IS NOT NULL;
