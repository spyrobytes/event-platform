# Contributing to Event Platform

This guide covers development workflows and best practices for contributing to the project.

## Getting Started

```bash
# Clone the repo
git clone git@github.com:spyrobytes/event-platform.git
cd event-platform

# Install dependencies
npm install

# Start local Supabase
npm run supabase:start

# Run database migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

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

## Git Workflow

### Branch Naming

- `feature/` - New features (`feature/event-creation`)
- `fix/` - Bug fixes (`fix/rsvp-email-template`)
- `chore/` - Maintenance (`chore/update-dependencies`)
- `docs/` - Documentation only

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add event duplication feature
fix: resolve RSVP email template issue
docs: update API documentation
chore: upgrade dependencies
test: add E2E tests for preview sharing
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commits
3. Ensure all checks pass (`npm run lint && npm run typecheck && npm test`)
4. Open a PR with a descriptive title and summary
5. Request review from a team member
6. Squash and merge after approval

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires local Supabase + Firebase Emulator)
npm run supabase:start
npm run emulators
npx playwright test
```

### What to Test

- Input validation (Zod schemas)
- Token generation/hashing
- Authorization logic
- Business logic functions
- Critical user flows (E2E)

### What Not to Test

- Third-party library internals
- Simple getters/setters
- Type definitions alone

## Code Style

### TypeScript

- `strict: true` is enabled
- No `any` unless explicitly justified with a comment
- Prefer `type` over `interface` (unless extending)
- Use Zod for runtime validation

### API Routes

Follow the 4-step pattern:

```ts
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const user = await verifyAuth(request);
  if (!user) return errorResponse("Unauthorized", 401);

  // 2. Validate input
  const body = await request.json();
  const data = schema.parse(body);

  // 3. Execute business logic
  const result = await db.event.create({ data });

  // 4. Return response
  return successResponse(result, 201);
}
```

### Components

- Default to Server Components
- Use Client Components only when needed (event handlers, hooks, browser APIs)
- Client Components must include `"use client";` directive

## Local Development

### Required Services

| Service | Command | Port |
|---------|---------|------|
| Next.js | `npm run dev` | 3000 |
| Supabase | `npm run supabase:start` | 54322 |
| Firebase Emulator | `npm run emulators` | 9099 |

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values. Never commit secrets.

## Questions?

Open an issue or reach out to the team.
