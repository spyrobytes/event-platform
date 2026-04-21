# Pre-Deployment Checklist

**Target:** Vercel production deployment
**Generated:** 2026-04-20
**Audit basis:** Full codebase scan — env vars, auth, DB, Vercel config, async jobs

Work top-to-bottom. **BLOCKER** items will fail the build or break core flows; **ACTION** items are polish/hardening that should ship before public launch. Check boxes as you go.

---

## 0. TL;DR for the operator

1. Set every `BLOCKER` env var in Vercel → Settings → Environment Variables → Production (§3).
2. Apply pending Prisma migrations against the production DB before the first deploy (§5).
3. Confirm Firebase Admin credentials match the project that issues the client ID tokens (§4).
4. Verify the three Vercel cron routes after first deploy (§6).
5. Send one real invite end-to-end (invite → email open → RSVP → confirmation) (§10).

---

## 1. Tech stack confirmation

Already in place — no action unless versions drift.

| Layer | Version | Notes |
|---|---|---|
| Node.js | `.nvmrc` → **22** | Matches CI (`.github/workflows/ci.yml`) and local dev. Vercel reads `.nvmrc` automatically. |
| Next.js | 16.1.1 | App Router, no Turbopack prod flag, no middleware.ts |
| React | 19.2.3 | |
| TypeScript | ^5 (strict) | |
| Tailwind | v4 + @tailwindcss/postcss | |
| Prisma | ^7.2.0 | `@prisma/adapter-pg` + `pg` pool |
| Firebase | admin ^13.6.0 / client ^12.7.0 | |
| Supabase | @supabase/supabase-js ^2.90.1 | Storage + Postgres |
| Email | nodemailer ^7 + custom Mailgun wrapper | |
| Package manager | npm (package-lock.json) | Don't mix in yarn/pnpm lockfiles |

**Pre-build commands** (run locally from a clean checkout of `main`):

- [ ] `npm ci` — install from lockfile, not `package.json`
- [ ] `npm run lint` — 0 errors (warnings in legacy `<img>` tags and one unused test var are pre-existing)
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run build` — completes end-to-end (this also regenerates the Prisma client)

---

## 2. Repo hygiene

- [ ] Working tree clean on `main` (`git status`)
- [ ] `main` is up to date with `origin/main`
- [ ] No `.env`, `.env.local`, `service-account*.json`, `*.pem`, or `*.key` tracked by git (verified in audit — all are gitignored)
- [ ] No `@ts-ignore` / `eslint-disable` added in the deploy candidate (audit found only justified suppressions)

---

## 3. Environment variables

> Source of truth: `src/env.ts` — Zod validation fails the build if any `REQUIRED` var is missing.

### BLOCKER — required in Vercel before first build

| Var | Used by | How to obtain |
|---|---|---|
| `DATABASE_URL` | Prisma runtime (pooled) | Supabase → Settings → Database → Connection pooling URI. Append `?pgbouncer=true` if not present. |
| `DIRECT_URL` | `prisma migrate deploy` | Supabase → Settings → Database → Direct connection URI. |
| `FIREBASE_PROJECT_ID` | `src/lib/auth.ts` Admin init | Firebase console → Project settings |
| `FIREBASE_CLIENT_EMAIL` | Admin SDK | From service-account JSON (`client_email` field) |
| `FIREBASE_PRIVATE_KEY` | Admin SDK | From service-account JSON (`private_key` field). Paste the multi-line PEM as-is; Vercel preserves newlines, and `auth.ts` also handles `\n`-escaped form. **Do not quote.** |
| `CRON_SECRET` | All `/api/cron/*` routes | Generate: `openssl rand -base64 32`. Must be ≥32 chars. |
| `NEXT_PUBLIC_BASE_URL` | Email links, canonical URLs | e.g. `https://eventfxr.com` (no trailing slash) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client SDK | Firebase console → Web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client SDK | Firebase console |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client SDK | Same project ID, **must match** `FIREBASE_PROJECT_ID` |
| `NEXT_PUBLIC_SUPABASE_URL` | Image loader (`src/lib/supabase-loader.ts`), `next.config.ts` `remotePatterns` | Supabase dashboard |

### BLOCKER — required for runtime (build will pass without them but first request fails)

| Var | Feature |
|---|---|
| `MAILGUN_API_KEY` | Transactional email |
| `MAILGUN_DOMAIN` | Transactional email |
| `MAILGUN_REGION_BASE_URL` | `https://api.mailgun.net` (US) or `https://api.eu.mailgun.net` (EU) |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | `/api/webhooks/mailgun` signature verification |
| `MAIL_FROM` | e.g. `Events <noreply@eventfxr.com>` — sender domain must be verified in Mailgun |

### OPTIONAL — enable features

| Var | Feature | Default when absent |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Disabled (no limits) |
| `SENTRY_DSN` | Error tracking | Disabled |

### DO NOT SET in production

These are development-only; leaving them set in prod will silently break auth/email:

- `FIREBASE_AUTH_EMULATOR_HOST`
- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (Mailpit only)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (local Supabase)

### Verification

- [ ] `vercel env ls production` shows every BLOCKER var
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID` === `FIREBASE_PROJECT_ID` (mismatch → token verification fails silently)
- [ ] `MAIL_FROM` domain is verified in Mailgun (Mailgun → Sending → Domains)
- [ ] `NEXT_PUBLIC_BASE_URL` matches the production domain exactly (affects email link validity)

---

## 4. Firebase

- [ ] Production Firebase project exists and differs from any dev/emulator project
- [ ] Authentication → Sign-in method includes all providers the app exposes (Email/Password, others)
- [ ] Authentication → Authorized domains includes the production domain
- [ ] Service account key generated from **the production project** (Firebase → Project settings → Service accounts → Generate new private key)
- [ ] Service account JSON stored in a password manager; NOT committed, NOT pushed to any remote
- [ ] `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` in Vercel match that JSON
- [ ] Rotate the old service-account key in Firebase after migration to prod credentials is complete

**No edge-runtime Firebase Admin calls** (audit verified). The Admin SDK uses Node-only APIs and would fail on Edge.

---

## 5. Database & Prisma

- [ ] Production Supabase project created and connection strings captured
- [ ] `DATABASE_URL` uses pooled connection (port **6543**, `?pgbouncer=true`)
- [ ] `DIRECT_URL` uses direct connection (port **5432**)
- [ ] `npx prisma migrate deploy` runs cleanly against the production DB (dry-run locally first: `DATABASE_URL=<prod> DIRECT_URL=<prod> npx prisma migrate status`)
- [ ] No schema drift (`npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma` is empty)
- [ ] `prisma/migrations/migration_lock.toml` committed (it is)
- [ ] Supabase storage buckets created: any bucket referenced by `src/lib/supabase-storage.ts` — check media upload paths

**Critical:** `npm run build` regenerates the Prisma client from `DATABASE_URL`. If that env var isn't set in the Vercel build environment, the build fails at the `prisma generate` step.

---

## 6. Vercel configuration

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/process-emails",              "schedule": "*/5 * * * *" },
    { "path": "/api/cron/cleanup-unverified",          "schedule": "0 3 * * *"   },
    { "path": "/api/cron/send-reminders",              "schedule": "0 9 * * *"   },
    { "path": "/api/cron/send-no-response-reminders",  "schedule": "0 10 * * *"  },
    { "path": "/api/cron/send-verification-reminders", "schedule": "0 11 * * *"  }
  ]
}
```

Vercel cron is only active on **Production** deployments, not Preview.

- [ ] `CRON_SECRET` set in Vercel Production environment
- [ ] After first Production deploy, Vercel → Settings → Cron Jobs lists all five
- [ ] 10 min after first deploy, check `/api/cron/process-emails` in Vercel logs — should see a structured log line, not 401
- [ ] Next-day check: all four daily jobs fired at their scheduled UTC hours (03:00, 09:00, 10:00, 11:00)
- [ ] `send-verification-reminders` logs `sent` count on day 2+ after launch (users who signed up >22h earlier without verifying)
- [ ] `cleanup-unverified` logs `candidates: 0` until ~30 days post-launch; after that, spot-check that skipped/deleted counts look sane

**Note:** crons run on UTC. If "9 AM in your region" matters, adjust the cron expression.

`next.config.ts` — already configured, no action needed:
- Security headers (HSTS, nosniff, DENY framing, no-referrer on `/e/:slug` to prevent token leakage)
- Custom Supabase image loader (`src/lib/supabase-loader.ts`) for on-the-fly transforms
- `serverActions.bodySizeLimit: 2mb`

---

## 7. Email (Mailgun)

- [ ] Sending domain verified in Mailgun (DNS: SPF, DKIM, MX)
- [ ] Webhook endpoint set in Mailgun → Webhooks to `https://<prod-domain>/api/webhooks/mailgun`
- [ ] Webhook signing key in Mailgun matches `MAILGUN_WEBHOOK_SIGNING_KEY` in Vercel
- [ ] All transactional events subscribed (delivered, opened, bounced, failed, complained, unsubscribed)
- [ ] Send one test invite from a staging event; watch `EmailOutbox` row transition `QUEUED → SENDING → SENT → DELIVERED`

**Architecture note:** The project uses **Vercel Cron + `email_outbox` table**, not Google Cloud Tasks. `CLAUDE.md` still mentions GCP Tasks — that's outdated. The actual flow:
1. API writes `EmailOutbox` row with `status=QUEUED`
2. Vercel cron hits `/api/cron/process-emails` every 5 min, batch size 50
3. `processEmail()` renders the React Email template, calls Mailgun, updates status
4. Mailgun webhooks advance the row to `DELIVERED` / `OPENED` / `BOUNCED`

Consider updating `CLAUDE.md` post-deploy.

---

## 8. Known issues / soft blockers

### Intentional — document only

- **Supabase demo JWT fallback** (`src/lib/supabase-storage.ts:26`) — a hard-coded demo token (expires 1984) is used as a fallback when `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` are unset. It only matters in local dev; in production the real keys override it. Safe, but add a comment if it's not already obvious from context.

### Action before launch

- [x] ~~Add `.nvmrc`~~ — done (pins Node 22)
- [x] ~~Update `CLAUDE.md` async-jobs section~~ — done (commit `7dd9166`)
- [ ] Rotate any development Firebase service-account keys that were ever committed or shared

### Monitoring (optional but recommended)

- [ ] Set `SENTRY_DSN` in Vercel to capture runtime errors
- [ ] Set Upstash Redis vars if rate-limiting is desired (login, RSVP flows)
- [ ] Vercel Analytics enabled (Project → Analytics)

---

## 9. Potential deploy-botching issues caught by the audit

| Risk | Severity | Mitigation |
|---|---|---|
| `DATABASE_URL` missing at build time | High | `prisma generate` runs during build; Prisma needs the URL. Set in Vercel **before** first build. |
| `FIREBASE_PRIVATE_KEY` newline handling | Medium | `src/lib/auth.ts` calls `.replace(/\\n/g, "\n")`; Vercel also preserves real newlines. Either form works — but **don't wrap in single or double quotes** when pasting into Vercel. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ≠ `FIREBASE_PROJECT_ID` | High | Tokens minted against project A can't be verified by project B. Double-check they match. |
| Supabase `remotePatterns` DNS | Medium | `next/image` will refuse to load images from unlisted hosts. `next.config.ts` reads the hostname from `NEXT_PUBLIC_SUPABASE_URL` — if unset or wrong at build time, images break in prod. |
| Cron fires before `CRON_SECRET` is set | Low | Routes return 401; emails queue up and back-fill on next successful run. Non-fatal. |
| Mailgun domain unverified | High | First email send fails. Verify DNS records before ticking §7. |
| Schema drift on prod DB | High | Run `prisma migrate status` against prod before deploy. Drift from ad-hoc SQL or forgotten migrations will break inserts. |
| `MAIL_FROM` not in verified domain | High | Mailgun rejects the send; no outbound email. |
| Edge-runtime contamination | Low | Audit confirmed no route exports `runtime = "edge"` and no middleware.ts exists. If either is added later, Firebase Admin will break there. |

---

## 10. Post-deploy smoke tests

Run these in order on the production URL. Stop and investigate at the first failure.

- [ ] Homepage loads, no console errors
- [ ] `/signup` → create a throwaway account; verification email arrives
- [ ] `/login` → sign in; session persists across refresh
- [ ] Dashboard loads, no 401/500 on authenticated API routes
- [ ] Create a test event with a fake guest
- [ ] Trigger an invite send → confirm `EmailOutbox` row is `QUEUED`
- [ ] Wait ≤5 min → row transitions to `SENT`; Mailgun webhook advances to `DELIVERED`
- [ ] Guest opens invite email → RSVP page loads at `/rsvp/:token`
- [ ] Submit RSVP → confirmation email queued → delivered
- [ ] Cron logs in Vercel show no 401s or 500s for any of the three jobs
- [ ] Image uploads: upload one media asset; verify it renders via the Supabase transform URL (not a 404)
- [ ] Visit `/e/:slug` for a public event → no referrer header on outbound links (check Network tab; `Referrer-Policy: no-referrer` in response)

---

## 11. Rollback plan

- **Revert deploy:** Vercel → Deployments → previous Production → Promote. Takes <30s.
- **Rollback schema change:** if a migration broke prod, generate a corrective migration (`prisma migrate diff`) rather than `migrate reset`. Never run `migrate reset` against prod.
- **Kill switch:** disable Vercel cron in `vercel.json` (comment the `crons` array) and redeploy to stop queued processing if something is in a loop.

---

## 12. Sign-off

- [ ] All BLOCKERs in §3, §4, §5, §6, §7 resolved
- [ ] All ACTIONs in §8 completed or consciously deferred (and tracked elsewhere)
- [ ] §10 smoke tests passing
- [ ] One human (not the deployer) spot-checked the live site on mobile + desktop

Signed: _____________________ Date: _____________
