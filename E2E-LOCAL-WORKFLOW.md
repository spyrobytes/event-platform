# Local E2E Testing Workflow

End-to-end testing setup for the Event Platform using local services.

## Prerequisites

- Docker (for Mailpit and Supabase)
- Node.js 22+
- Firebase CLI (`npm install -g firebase-tools`)

## Quick Start

```bash
# Terminal 1: Database
npm run supabase:start

# Terminal 2: Auth
npm run emulators

# Terminal 3: Email
npm run mailpit

# Terminal 4: App
npm run dev:local
```

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| App | http://localhost:3000 | Next.js application |
| Supabase Studio | http://localhost:54323 | Database UI |
| Firebase Emulator | http://localhost:4000 | Auth management |
| Mailpit | http://localhost:8025 | Email inbox |
| Inbucket | http://localhost:54324 | Supabase auth emails |

## Test Users (Seed Data)

| Email | Firebase UID | Role |
|-------|--------------|------|
| alice@test.local | firebase-uid-alice | TechCorp owner |
| bob@test.local | firebase-uid-bob | Community owner |
| charlie@test.local | firebase-uid-charlie | Member |

Create these in Firebase Emulator UI with password: `password123`

## Running Tests

```bash
# Run all E2E tests (starts dev server automatically)
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test file
npx playwright test auth.spec.ts

# Run in single browser
npx playwright test --project=chromium
```

## Reset Database

```bash
npm run db:seed  # Resets DB and applies seed.sql
```

## Environment Variables

`npm run dev:local` automatically sets:
- `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
- `SMTP_HOST=127.0.0.1`
- `SMTP_PORT=1025`

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js App     │────▶│  Supabase   │
│  (Playwright)│     │  localhost:3000  │     │  (Postgres) │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │  Firebase   │ │   Mailpit   │ │  Inbucket   │
      │  Emulator   │ │   (SMTP)    │ │ (Supabase)  │
      │  :9099      │ │   :1025     │ │   :54324    │
      └─────────────┘ └─────────────┘ └─────────────┘
```

## Troubleshooting

**Firebase Emulator not connecting**
- Ensure emulator is running: `npm run emulators`
- Check http://localhost:4000 is accessible

**Emails not appearing in Mailpit**
- Ensure Mailpit is running: `npm run mailpit`
- Verify SMTP_HOST is set (use `npm run dev:local`)

**Database connection errors**
- Ensure Supabase is running: `npm run supabase:status`
- Check DATABASE_URL points to localhost:54322

**Tests timing out**
- Increase timeout in playwright.config.ts
- Ensure all services are running before tests
