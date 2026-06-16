-- Enable Row Level Security (deny-all, no policies) on every table in the
-- public schema. Supabase exposes the public schema through its Data API
-- (PostgREST) reachable with the public anon/authenticated keys; with RLS
-- disabled, those keys can read/write every row. This app does NOT use the
-- Data API at all:
--   * all DB access goes through Prisma over DATABASE_URL/DIRECT_URL as the
--     table-owner role, which BYPASSES RLS, and
--   * Supabase Storage uses the service_role key, which also BYPASSES RLS.
-- So enabling RLS with NO policies denies the unused Data API while leaving
-- Prisma and Storage completely unaffected.
--
-- IMPORTANT: do NOT add FORCE ROW LEVEL SECURITY here -- the owner role must
-- keep bypassing RLS or Prisma loses all access. Adding policies is also
-- wrong: auth is Firebase, so there is no Supabase auth.uid() context to
-- write policies against. Deny-all is the correct posture.
--
-- Fixes Supabase Advisor: rls_disabled_in_public (all tables) and
-- sensitive_columns_exposed (analytics_events.session_id).

-- User & organization
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_members" ENABLE ROW LEVEL SECURITY;

-- Events & page config
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_slug_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_page_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation_configs" ENABLE ROW LEVEL SECURITY;

-- Invites & RSVPs
ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rsvps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rsvp_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registry_claims" ENABLE ROW LEVEL SECURITY;

-- Email pipeline
ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_events" ENABLE ROW LEVEL SECURITY;

-- Analytics
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;

-- Media & galleries
ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_galleries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_gallery_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gallery_import_jobs" ENABLE ROW LEVEL SECURITY;

-- Integrations
ALTER TABLE "provider_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "geocode_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "geocode_usage" ENABLE ROW LEVEL SECURITY;

-- Launch / waitlist
ALTER TABLE "waitlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "launch_invites" ENABLE ROW LEVEL SECURITY;

-- Prisma's own migration history table (also flagged by the advisor).
-- IF EXISTS because Prisma's shadow database (used by `migrate dev`) does not
-- contain `_prisma_migrations`, so a bare ALTER would fail shadow validation.
-- The real dev DB and production both have it, so RLS is enabled there.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
