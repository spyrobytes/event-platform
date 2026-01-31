# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Event Platform is an SEO-first event platform for creating, discovering, and managing events with invitations, RSVPs, and transactional email. Target domains: eventsfixer.com, eventsfixer.ca.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Production build
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix lint issues
npm run typecheck        # Check TypeScript types

# Database (once Prisma is set up)
npm run db:migrate       # Create and apply migrations
npm run db:generate      # Regenerate Prisma client
npm run db:studio        # Open Prisma Studio

# Testing (once configured)
npm test                 # Run Vitest unit tests
npm run test:coverage    # Run with coverage
npm run test:e2e         # Run Playwright E2E tests
```

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + CSS Modules (hybrid approach)
- **Database**: Supabase Postgres with Prisma ORM
- **Auth**: Firebase Authentication
- **Email**: Mailgun for transactional delivery
- **Async Jobs**: Google Cloud Tasks + Cloud Scheduler

## Architecture

### Route Structure

The app uses Next.js App Router with route groups:
- `src/app/(auth)/` - Protected routes (dashboard, event management) with auth guard layout
- `src/app/(public)/` - Public routes (discovery, event pages) for SEO
- `src/app/api/` - API endpoints (events, invites, rsvp, webhooks)
- `src/app/rsvp/[token]/` - Token-based RSVP pages (public)

### Key Directories

```
src/
├── components/
│   ├── ui/           # Primitive components (Button, Input, Card)
│   ├── forms/        # Form components (EventForm, RSVPForm)
│   └── features/     # Feature-specific (EventCard, InviteManager)
├── lib/              # Utilities (db.ts, auth.ts, email.ts, tokens.ts)
├── schemas/          # Zod validation schemas (shared client/server)
├── hooks/            # React hooks (useAuth, useEventFilters)
└── emails/           # React Email templates
```

### Server vs Client Components

**Default to Server Components.** Use Client Components only when needed:
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`window`, `localStorage`)
- React hooks (`useState`, `useEffect`)
- Real-time interactivity

Client Components must include `"use client";` at the top.

### Data Flow

1. User authenticates via Firebase Auth → gets ID token
2. Frontend calls API with `Authorization: Bearer <token>`
3. API verifies token (Firebase Admin SDK) → performs DB operations
4. Email sending is async: API writes to `email_outbox` + enqueues Cloud Task
5. Mailgun webhooks update delivery status

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files/folders | kebab-case | `user-profile.tsx`, `auth-service.ts` |
| Components | PascalCase | `UserProfileCard` |
| Functions/variables | camelCase | `fetchUserProfile` |
| Constants | UPPER_SNAKE_CASE | `MAX_LOGIN_ATTEMPTS` |
| DB columns | snake_case (via `@map`) | `created_at`, `event_id` |
| Prisma models | PascalCase | `User`, `Event`, `EmailOutbox` |

## TypeScript Standards

- `strict: true` is enabled
- No `any` unless explicitly justified with a comment
- Prefer `type` over `interface` (unless extending)
- Use Zod for runtime validation and type inference

## Styling Strategy

Tailwind is the default for structure and tokens. CSS Modules are used as an escape hatch for:
- Keyframe animations
- Pseudo-elements (`::before`, `::after`)
- Complex hover/active interactions
- Visual flourishes (glows, gradients)

Use the `cn()` utility for conditional classes:
```tsx
import { cn } from "@/lib/utils";

<div className={cn("base-class", isActive && "active-class")} />
```

Component pattern:
```
ComponentName/
├── ComponentName.tsx
├── ComponentName.module.css
└── index.ts
```

Theme uses CSS variables in `globals.css` mapped to Tailwind. Change the palette by editing `:root` variables only.

## API Route Handler Pattern

Follow the 4-step pattern for all route handlers:

```ts
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Validate input (Zod)
  const body = await request.json();
  const data = schema.parse(body);

  // 3. Execute business logic
  const result = await db.event.create({ data });

  // 4. Return response
  return NextResponse.json(result, { status: 201 });
}
```

**Error handling**: Never leak internal errors. Use structured responses:
```ts
interface APIError {
  error: string;
  code?: string;
  details?: unknown;
}
```

## Database Best Practices

- **Always specify fields** - avoid `findMany()` without `select`
- **Use transactions** for multi-step operations
- **Authorization in API layer** - check ownership before mutations
- Invite tokens are **hashed** in DB (never store raw tokens)
- Use `slug` fields for public URLs
- Store UTC timestamps with separate `timezone` field

## Database Migrations

### Daily Workflow

```bash
# After pulling new code, always run migrations
git pull origin main
npx prisma migrate dev

# When making schema changes, create a migration
npx prisma migrate dev --name descriptive_name
```

### Golden Rules

| Do | Don't |
|----|-------|
| Use `prisma migrate dev` for schema changes | Use `prisma db push` on shared databases |
| Treat applied migrations as immutable | Edit migration files after they're committed |
| Run migrations after every pull | Skip migration step when switching branches |
| Use `prisma migrate deploy` in CI/CD | Use `prisma migrate dev` in production |

### Avoiding Schema Drift

Schema drift occurs when the database state doesn't match the migration history. Common causes:

1. **Using `db push`** - Syncs schema without creating migration files
2. **Manual SQL changes** - Running DDL directly on the database
3. **Editing applied migrations** - Changing files after they've been applied
4. **Skipping migrations** - Not running `migrate dev` after pulling code

### Fixing Drift (Development)

```bash
# Option 1: Reset (loses all data - dev only)
npx prisma migrate reset

# Option 2: Mark migration as applied (if DB already has changes)
npx prisma migrate resolve --applied <migration_name>
```

### Fixing Drift (Production) - NEVER RESET

```bash
# 1. Investigate the drift
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma

# 2. Generate corrective SQL if needed
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datasource ./prisma/schema.prisma \
  --script > drift_fix.sql

# 3. Review carefully, then either:
#    - Apply the SQL manually
#    - Create a new migration
#    - Mark existing migration as applied
npx prisma migrate resolve --applied <migration_name>
```

### CI/CD Pipeline

```yaml
# Always use migrate deploy in CI (fails on drift)
- run: npx prisma migrate deploy
```

This ensures deployments fail fast if there's schema drift, preventing broken releases.

## Form Handling

Use React Hook Form with Zod. Schemas in `src/schemas/` are shared between client validation and API validation.

## State Management

- URL state for shareable/bookmarkable data (filters, sorting via search params)
- React Context sparingly for auth and theme only
- No client-side state library

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json)

## Git Conventions

Branch naming:
- `feature/` - New features (`feature/event-creation`)
- `fix/` - Bug fixes (`fix/rsvp-email-template`)
- `chore/` - Maintenance (`chore/update-dependencies`)
- `docs/` - Documentation only

PR title format: `feat: Add event creation form`, `fix: Resolve RSVP issue`

## Git Commit Messages
- Do not add `Claude` as a co-author or mention in commit messages.
- Do not add `Claude` in PR descriptions or titles.

## Testing Guidelines

**Always test**: Input validation (Zod schemas), token generation/hashing, authorization logic, business logic functions, critical user flows (E2E)

**Don't test**: Third-party library internals, simple getters/setters, type definitions alone

## Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Initial JS | < 100 KB gzipped |

## Security Considerations

- All inputs validated with Zod at API boundary
- Token generation uses `crypto.randomBytes(32)`
- Rate limiting via Upstash Redis (optional)
- RSVP links use hashed tokens to prevent enumeration
- Never commit secrets - use `.env.local` (gitignored)

## Adding New Invitation Templates

When adding a new invitation template, update **all** of the following:

### 1. Schema Layer
- [ ] `src/schemas/invitation.ts` — Add to `INVITATION_TEMPLATES` array
- [ ] `prisma/schema.prisma` — Add to `InvitationTemplate` enum
- [ ] Run `npx prisma migrate dev --name add_<template>_template` — **Critical: regenerating client is not enough**
- [ ] Run `npm run db:generate` — Regenerate Prisma client

### 2. Theme Layer (if template has custom styling)
- [ ] `src/lib/invitation-themes.ts` — Add template-specific theme tokens

### 3. Component Layer
- [ ] Create `src/components/features/Invitation/templates/<TemplateName>/`
  - `types.ts` — Props interface using `InvitationData`
  - `<TemplateName>.tsx` — Main component
  - `<TemplateName>.module.css` — CSS animations/styles
  - `index.ts` — Barrel export
- [ ] `src/components/features/Invitation/templates/index.ts`:
  - Add export
  - Add to `TemplateId` type
  - Add to `templateRegistry`
  - Add to `templateMetadata`
- [ ] `src/components/features/Invitation/index.ts` — Add to barrel export

### 4. Rendering Layer (update ALL pages that render templates)
- [ ] `src/app/invite/[token]/page.tsx` — Add import + switch case
- [ ] `src/app/(auth)/invite/preview/[eventId]/page.tsx` — Add import + switch case

### 5. UI Layer
- [ ] `src/app/(auth)/dashboard/events/[id]/invitation/page.tsx`:
  - Add to `TEMPLATE_OPTIONS` array
  - Add to wording fields condition if template supports custom wording

### Common Mistakes
| Mistake | Symptom |
|---------|---------|
| Forgot `prisma migrate dev` | API returns "invalid input value for enum" |
| Forgot preview page | Template saves but preview shows wrong template |
| Forgot `templateMetadata` | Template falls through to default in switch |
