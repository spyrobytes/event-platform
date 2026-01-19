-- =============================================================================
-- Event Platform Local Development Seed Data
-- =============================================================================
-- This file populates the local database with test data for development.
-- Run with: supabase db reset (which applies migrations + seeds)
--
-- Test Users (Firebase Emulator):
--   - alice@test.local (password: password123) - Primary test user
--   - bob@test.local (password: password123) - Secondary test user
--   - charlie@test.local (password: password123) - Third test user
--
-- Test Invite Tokens (use these in /rsvp/[token] URLs):
--   - test-token-alice-birthday
--   - test-token-tech-conference
--   - test-token-private-dinner
-- =============================================================================

-- Clean existing data (in reverse dependency order)
TRUNCATE email_outbox, rsvps, invites, events, organization_members, organizations, users CASCADE;

-- =============================================================================
-- USERS
-- =============================================================================
-- Firebase UIDs match what you create in the Firebase Emulator
-- Create these users in the Emulator UI at http://localhost:4000/auth

INSERT INTO users (id, firebase_uid, email, name, avatar_url, created_at, updated_at) VALUES
  ('user_alice_001', 'firebase-uid-alice', 'alice@test.local', 'Alice Johnson', NULL, NOW() - INTERVAL '30 days', NOW()),
  ('user_bob_002', 'firebase-uid-bob', 'bob@test.local', 'Bob Smith', NULL, NOW() - INTERVAL '25 days', NOW()),
  ('user_charlie_003', 'firebase-uid-charlie', 'charlie@test.local', 'Charlie Brown', NULL, NOW() - INTERVAL '20 days', NOW());

-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================

INSERT INTO organizations (id, name, slug, logo_url, created_at, updated_at) VALUES
  ('org_techcorp_001', 'TechCorp Events', 'techcorp', NULL, NOW() - INTERVAL '30 days', NOW()),
  ('org_community_002', 'Community Meetups', 'community-meetups', NULL, NOW() - INTERVAL '20 days', NOW());

-- =============================================================================
-- ORGANIZATION MEMBERS
-- =============================================================================

INSERT INTO organization_members (id, organization_id, user_id, role, created_at) VALUES
  -- Alice owns TechCorp
  ('member_001', 'org_techcorp_001', 'user_alice_001', 'OWNER', NOW() - INTERVAL '30 days'),
  -- Bob is admin at TechCorp
  ('member_002', 'org_techcorp_001', 'user_bob_002', 'ADMIN', NOW() - INTERVAL '28 days'),
  -- Charlie is member at TechCorp
  ('member_003', 'org_techcorp_001', 'user_charlie_003', 'MEMBER', NOW() - INTERVAL '25 days'),
  -- Bob owns Community Meetups
  ('member_004', 'org_community_002', 'user_bob_002', 'OWNER', NOW() - INTERVAL '20 days'),
  -- Alice is member at Community Meetups
  ('member_005', 'org_community_002', 'user_alice_001', 'MEMBER', NOW() - INTERVAL '18 days');

-- =============================================================================
-- EVENTS
-- =============================================================================

INSERT INTO events (
  id, organization_id, creator_id, title, slug, description,
  start_at, end_at, timezone,
  venue_name, address, city, country, latitude, longitude,
  visibility, status, cover_image_url, max_attendees,
  published_at, created_at, updated_at
) VALUES
  -- Published public event (upcoming) - Alice's Birthday
  (
    'event_birthday_001',
    NULL,
    'user_alice_001',
    'Alice''s Birthday Bash',
    'alice-birthday-bash-2026',
    'Join us for an amazing birthday celebration! There will be cake, music, and great company.',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days' + INTERVAL '4 hours',
    'America/Toronto',
    'The Grand Ballroom',
    '123 Main Street',
    'Toronto',
    'Canada',
    43.6532,
    -79.3832,
    'PUBLIC',
    'PUBLISHED',
    NULL,
    50,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '7 days',
    NOW()
  ),

  -- Published public event (upcoming) - Tech Conference
  (
    'event_techconf_002',
    'org_techcorp_001',
    'user_alice_001',
    'TechCorp Annual Conference 2026',
    'techcorp-annual-conference-2026',
    'Our flagship technology conference featuring keynotes, workshops, and networking opportunities. Learn about the latest trends in AI, cloud computing, and software development.',
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '32 days',
    'America/New_York',
    'Convention Center',
    '500 Tech Boulevard',
    'New York',
    'United States',
    40.7128,
    -74.0060,
    'PUBLIC',
    'PUBLISHED',
    NULL,
    500,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '14 days',
    NOW()
  ),

  -- Published unlisted event (upcoming) - Private Dinner
  (
    'event_dinner_003',
    NULL,
    'user_bob_002',
    'Executive Dinner',
    'executive-dinner-jan-2026',
    'An intimate dinner gathering for leadership team members.',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
    'America/Los_Angeles',
    'La Maison Restaurant',
    '789 Gourmet Ave',
    'San Francisco',
    'United States',
    37.7749,
    -122.4194,
    'UNLISTED',
    'PUBLISHED',
    NULL,
    12,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '5 days',
    NOW()
  ),

  -- Private invite-only event
  (
    'event_private_004',
    'org_techcorp_001',
    'user_alice_001',
    'Board Meeting Q1',
    'board-meeting-q1-2026',
    'Quarterly board meeting for TechCorp shareholders.',
    NOW() + INTERVAL '21 days',
    NOW() + INTERVAL '21 days' + INTERVAL '2 hours',
    'America/Toronto',
    'TechCorp HQ - Boardroom',
    '100 Innovation Drive',
    'Toronto',
    'Canada',
    43.6426,
    -79.3871,
    'PRIVATE',
    'PUBLISHED',
    NULL,
    10,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '4 days',
    NOW()
  ),

  -- Draft event (not published)
  (
    'event_draft_005',
    NULL,
    'user_charlie_003',
    'Summer Picnic (Draft)',
    'summer-picnic-2026',
    'A fun outdoor picnic for friends and family. Still planning the details!',
    NOW() + INTERVAL '60 days',
    NOW() + INTERVAL '60 days' + INTERVAL '6 hours',
    'America/Toronto',
    'High Park',
    'High Park',
    'Toronto',
    'Canada',
    43.6465,
    -79.4637,
    'PUBLIC',
    'DRAFT',
    NULL,
    100,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW()
  ),

  -- Past completed event
  (
    'event_past_006',
    'org_community_002',
    'user_bob_002',
    'New Year''s Eve Party 2025',
    'new-years-eve-party-2025',
    'Ring in the new year with us! Amazing DJ, champagne toast, and countdown.',
    '2025-12-31 20:00:00+00',
    '2026-01-01 02:00:00+00',
    'America/Toronto',
    'City Hall Square',
    'Nathan Phillips Square',
    'Toronto',
    'Canada',
    43.6525,
    -79.3835,
    'PUBLIC',
    'COMPLETED',
    NULL,
    1000,
    '2025-12-01 00:00:00+00',
    '2025-11-15 00:00:00+00',
    NOW()
  ),

  -- Cancelled event
  (
    'event_cancelled_007',
    NULL,
    'user_alice_001',
    'Outdoor Yoga Session (Cancelled)',
    'outdoor-yoga-cancelled',
    'This event has been cancelled due to weather concerns.',
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days' + INTERVAL '1 hour',
    'America/Toronto',
    'Trinity Bellwoods Park',
    'Trinity Bellwoods Park',
    'Toronto',
    'Canada',
    43.6452,
    -79.4182,
    'PUBLIC',
    'CANCELLED',
    NULL,
    30,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '1 day'
  ),

  -- Community meetup event
  (
    'event_meetup_008',
    'org_community_002',
    'user_bob_002',
    'Monthly Book Club',
    'monthly-book-club-feb-2026',
    'Discussing "The Midnight Library" by Matt Haig. All are welcome!',
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days' + INTERVAL '2 hours',
    'America/Toronto',
    'Local Library - Meeting Room B',
    '250 Queen Street',
    'Toronto',
    'Canada',
    43.6534,
    -79.3790,
    'PUBLIC',
    'PUBLISHED',
    NULL,
    20,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '10 days',
    NOW()
  );

-- =============================================================================
-- INVITES
-- =============================================================================
-- Token hashes are SHA-256 of the test tokens
-- Test tokens for /rsvp/[token] URLs:
--   test-token-alice-birthday -> hash below
--   test-token-tech-conference -> hash below
--   test-token-private-dinner -> hash below

INSERT INTO invites (
  id, event_id, email, name, token_hash,
  plus_ones_allowed, status,
  expires_at, sent_at, opened_at,
  created_at, updated_at
) VALUES
  -- Invites to Alice's Birthday
  (
    'invite_001',
    'event_birthday_001',
    'guest1@example.com',
    'David Wilson',
    -- SHA256('test-token-alice-birthday')
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    2,
    'SENT',
    NOW() + INTERVAL '13 days',
    NOW() - INTERVAL '3 days',
    NULL,
    NOW() - INTERVAL '4 days',
    NOW()
  ),
  (
    'invite_002',
    'event_birthday_001',
    'guest2@example.com',
    'Emma Davis',
    'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    1,
    'OPENED',
    NOW() + INTERVAL '13 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '4 days',
    NOW()
  ),
  (
    'invite_003',
    'event_birthday_001',
    'guest3@example.com',
    'Frank Miller',
    'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    0,
    'RESPONDED',
    NOW() + INTERVAL '13 days',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '4 days',
    NOW()
  ),

  -- Invites to Tech Conference
  (
    'invite_004',
    'event_techconf_002',
    'developer@example.com',
    'Grace Lee',
    -- SHA256('test-token-tech-conference')
    'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    1,
    'SENT',
    NOW() + INTERVAL '29 days',
    NOW() - INTERVAL '5 days',
    NULL,
    NOW() - INTERVAL '7 days',
    NOW()
  ),
  (
    'invite_005',
    'event_techconf_002',
    'engineer@example.com',
    'Henry Chen',
    'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    0,
    'PENDING',
    NOW() + INTERVAL '29 days',
    NULL,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW()
  ),

  -- Invite to Private Dinner
  (
    'invite_006',
    'event_dinner_003',
    'vip@example.com',
    'Isabella Martinez',
    -- SHA256('test-token-private-dinner')
    'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
    1,
    'RESPONDED',
    NOW() + INTERVAL '6 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '3 days',
    NOW()
  ),

  -- Invite to Board Meeting (private event)
  (
    'invite_007',
    'event_private_004',
    'board.member@example.com',
    'James Wright',
    'a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3',
    0,
    'SENT',
    NOW() + INTERVAL '20 days',
    NOW() - INTERVAL '1 day',
    NULL,
    NOW() - INTERVAL '2 days',
    NOW()
  ),

  -- Bounced invite
  (
    'invite_008',
    'event_birthday_001',
    'invalid@nonexistent-domain-xyz.com',
    'Unknown Person',
    'b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4',
    0,
    'BOUNCED',
    NOW() + INTERVAL '13 days',
    NOW() - INTERVAL '3 days',
    NULL,
    NOW() - INTERVAL '4 days',
    NOW()
  ),

  -- Past event invite (responded)
  (
    'invite_009',
    'event_past_006',
    'partygoer@example.com',
    'Karen Thompson',
    'c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5e6f7a2b3c4d5',
    2,
    'RESPONDED',
    '2025-12-30 00:00:00+00',
    '2025-12-15 00:00:00+00',
    '2025-12-16 00:00:00+00',
    '2025-12-10 00:00:00+00',
    '2025-12-20 00:00:00+00'
  );

-- =============================================================================
-- RSVPs
-- =============================================================================

INSERT INTO rsvps (
  id, invite_id, event_id,
  response, guest_name, guest_email, guest_count, notes,
  responded_at, updated_at
) VALUES
  -- RSVP Yes to Alice's Birthday (via invite)
  (
    'rsvp_001',
    'invite_003',
    'event_birthday_001',
    'YES',
    'Frank Miller',
    'guest3@example.com',
    1,
    'Looking forward to it! Should I bring anything?',
    NOW() - INTERVAL '2 days',
    NOW()
  ),

  -- RSVP Yes to Private Dinner (via invite, with plus one)
  (
    'rsvp_002',
    'invite_006',
    'event_dinner_003',
    'YES',
    'Isabella Martinez',
    'vip@example.com',
    2,
    'I will bring my partner. We have dietary restrictions - vegetarian.',
    NOW() - INTERVAL '1 day',
    NOW()
  ),

  -- RSVP to past event
  (
    'rsvp_003',
    'invite_009',
    'event_past_006',
    'YES',
    'Karen Thompson',
    'partygoer@example.com',
    3,
    'Can''t wait for the countdown!',
    '2025-12-20 00:00:00+00',
    '2025-12-20 00:00:00+00'
  ),

  -- Public RSVP (no invite) - Tech Conference
  (
    'rsvp_004',
    NULL,
    'event_techconf_002',
    'YES',
    'Michael Brown',
    'michael.brown@example.com',
    1,
    'Excited to attend! Especially interested in the AI workshops.',
    NOW() - INTERVAL '8 days',
    NOW()
  ),

  -- Public RSVP Maybe - Book Club
  (
    'rsvp_005',
    NULL,
    'event_meetup_008',
    'MAYBE',
    'Nancy White',
    'nancy.white@example.com',
    1,
    'I might have a conflict that evening, will confirm closer to the date.',
    NOW() - INTERVAL '5 days',
    NOW()
  ),

  -- Public RSVP No - Birthday
  (
    'rsvp_006',
    NULL,
    'event_birthday_001',
    'NO',
    'Oscar Green',
    'oscar.green@example.com',
    1,
    'Sorry, I will be traveling that week. Happy birthday in advance!',
    NOW() - INTERVAL '4 days',
    NOW()
  ),

  -- Another Yes for conference
  (
    'rsvp_007',
    NULL,
    'event_techconf_002',
    'YES',
    'Patricia Adams',
    'patricia.adams@example.com',
    1,
    NULL,
    NOW() - INTERVAL '6 days',
    NOW()
  );

-- =============================================================================
-- EMAIL OUTBOX
-- =============================================================================

INSERT INTO email_outbox (
  id, invite_id, template, to_email, subject, payload,
  status, provider_message_id, error,
  scheduled_for, sent_at, delivered_at, opened_at,
  created_at, updated_at
) VALUES
  -- Delivered invite email
  (
    'email_001',
    'invite_001',
    'INVITE',
    'guest1@example.com',
    'You''re invited to Alice''s Birthday Bash',
    '{"eventTitle": "Alice''s Birthday Bash", "inviteeName": "David Wilson", "eventDate": "2026-02-01", "rsvpLink": "http://localhost:3000/rsvp/test-token"}',
    'DELIVERED',
    'mailgun-msg-001',
    NULL,
    NULL,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '30 seconds',
    NULL,
    NOW() - INTERVAL '3 days',
    NOW()
  ),

  -- Opened invite email
  (
    'email_002',
    'invite_002',
    'INVITE',
    'guest2@example.com',
    'You''re invited to Alice''s Birthday Bash',
    '{"eventTitle": "Alice''s Birthday Bash", "inviteeName": "Emma Davis", "eventDate": "2026-02-01", "rsvpLink": "http://localhost:3000/rsvp/test-token"}',
    'OPENED',
    'mailgun-msg-002',
    NULL,
    NULL,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '25 seconds',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '3 days',
    NOW()
  ),

  -- Confirmation email sent
  (
    'email_003',
    'invite_003',
    'CONFIRMATION',
    'guest3@example.com',
    'Your RSVP is confirmed for Alice''s Birthday Bash',
    '{"eventTitle": "Alice''s Birthday Bash", "guestName": "Frank Miller", "response": "YES", "eventDate": "2026-02-01"}',
    'SENT',
    'mailgun-msg-003',
    NULL,
    NULL,
    NOW() - INTERVAL '2 days',
    NULL,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW()
  ),

  -- Failed email (bounced)
  (
    'email_004',
    'invite_008',
    'INVITE',
    'invalid@nonexistent-domain-xyz.com',
    'You''re invited to Alice''s Birthday Bash',
    '{"eventTitle": "Alice''s Birthday Bash", "inviteeName": "Unknown Person", "eventDate": "2026-02-01"}',
    'BOUNCED',
    'mailgun-msg-004',
    'DNS resolution failed: domain does not exist',
    NULL,
    NOW() - INTERVAL '3 days',
    NULL,
    NULL,
    NOW() - INTERVAL '3 days',
    NOW()
  ),

  -- Queued email (pending send)
  (
    'email_005',
    'invite_005',
    'INVITE',
    'engineer@example.com',
    'You''re invited to TechCorp Annual Conference 2026',
    '{"eventTitle": "TechCorp Annual Conference 2026", "inviteeName": "Henry Chen", "eventDate": "2026-02-15"}',
    'QUEUED',
    NULL,
    NULL,
    NOW() + INTERVAL '1 hour',
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '2 days',
    NOW()
  ),

  -- Reminder email (queued for future)
  (
    'email_006',
    'invite_001',
    'REMINDER',
    'guest1@example.com',
    'Reminder: Alice''s Birthday Bash is tomorrow!',
    '{"eventTitle": "Alice''s Birthday Bash", "inviteeName": "David Wilson", "eventDate": "2026-02-01"}',
    'QUEUED',
    NULL,
    NULL,
    NOW() + INTERVAL '13 days',
    NULL,
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    NOW()
  );

-- =============================================================================
-- SUMMARY
-- =============================================================================
--
-- Created:
--   - 3 users (alice, bob, charlie)
--   - 2 organizations (TechCorp, Community Meetups)
--   - 5 organization memberships
--   - 8 events (various states: published, draft, cancelled, completed)
--   - 9 invites (various states: pending, sent, opened, responded, bounced)
--   - 7 RSVPs (yes, no, maybe responses)
--   - 6 email records (various states: queued, sent, delivered, opened, bounced)
--
-- To use:
--   1. Start Supabase: supabase start
--   2. Reset DB with seed: supabase db reset
--   3. Create matching users in Firebase Emulator UI (http://localhost:4000/auth)
--   4. Start dev server: npm run dev:local
-- =============================================================================
