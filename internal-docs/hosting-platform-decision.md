# Hosting Platform Decision — Vercel (not Firebase / GCP)

**Status:** Accepted
**Decision date:** pre-launch (codified 2026-04-20)
**Supersedes:** earlier assumption of Firebase Hosting + Cloud Functions + Cloud Tasks + Cloud Scheduler

---

## Why this doc exists

The codebase was originally scoped against a Firebase/GCP deployment target. We kept Firebase **Authentication** (it's a solid standalone auth provider) but moved hosting and async infrastructure to Vercel + Supabase before first deploy. Earlier `CLAUDE.md` revisions still mentioned "Google Cloud Tasks + Cloud Scheduler" as the async-jobs layer — that was pre-pivot drift, not current reality.

This doc records what changed and why so nobody adds a `@google-cloud/tasks` dependency, tries to deploy Cloud Functions, or misreads the `email_outbox` pattern as expecting an external queue.

## What changed

| Layer | Original plan | Current reality | Kept? |
|---|---|---|---|
| Hosting | Firebase Hosting | **Vercel** | ❌ |
| Server functions | Cloud Functions (Gen 2) | **Vercel Functions** (Node runtime, built-in with Next.js) | ❌ |
| Cron | Cloud Scheduler | **Vercel Cron** (declared in `vercel.json`) | ❌ |
| Task queue | Cloud Tasks | **`email_outbox` table** polled by Vercel Cron | ❌ |
| Database | Supabase Postgres | Supabase Postgres | ✓ |
| File storage | Supabase Storage | Supabase Storage | ✓ |
| Auth | Firebase Authentication | Firebase Authentication | ✓ |
| Email | Mailgun | Mailgun | ✓ |

## Why we moved

- **Tight Next.js integration.** Vercel deploys, preview URLs, image optimization, edge functions, and cron are all first-class for Next.js. Firebase Hosting required a shim (`firebase-frameworks`) to run App Router correctly, and the shim was consistently a release or two behind Next.js.
- **Simpler async model.** Cloud Tasks + Cloud Scheduler is the "right" architecture for high-volume async work, but it's two services plus IAM plus a dedicated HTTP trigger. For transactional email at our scale (hundreds to low thousands/day), a `status=QUEUED` row polled every 5 minutes is enough and eliminates the cross-service auth surface.
- **One fewer cloud account to operate.** Keeping Firebase as an auth-only dependency (no hosting, no functions, no Firestore) leaves a smaller blast radius if the account is ever compromised or billing-suspended.
- **Preview deploys are load-bearing.** Vercel gives every PR a preview URL with its own environment; Firebase Hosting channels are comparable but clunkier with App Router.

## What this implies for contributors

- **Don't reintroduce `@google-cloud/*` SDKs** unless there's an explicit decision to change the async model. Adding Cloud Tasks "because it's more robust" is a significant architectural change, not a drop-in.
- **Async jobs go through `email_outbox` (or a similarly structured table).** If you need a new recurring job, add a row to `vercel.json` `crons` and a route under `src/app/api/cron/<name>/route.ts`. Authenticate with `CRON_SECRET`.
- **Environment variables live in Vercel**, not `.env.vault`, not Firebase `functions:config:set`. Local dev uses `.env.local`; production uses Vercel → Project → Environment Variables.
- **Firebase Admin SDK stays Node-only.** It does not run on the Edge runtime. If you add middleware or edge routes, keep Admin SDK calls out of them.

## Rolling back this decision

If volume or reliability requirements outgrow the polled `email_outbox` model, the natural upgrade is a dedicated queue (Upstash QStash, AWS SQS, or — yes — Cloud Tasks). The migration is bounded:

1. Replace `processQueuedEmails()` in `/api/cron/process-emails` with a queue consumer.
2. Replace the `INSERT EmailOutbox ... QUEUED` pattern with an enqueue call.
3. Keep `EmailOutbox` as the audit/state table even after moving off polling.

No schema migration is forced by the move; the `email_outbox` row just stops being the source-of-truth for "what's next to run."

## References

- `src/lib/email.ts` — email queue logic
- `src/app/api/cron/process-emails/route.ts` — cron handler
- `vercel.json` — cron schedule
- `internal-docs/PRE_DEPLOYMENT_CHECKLIST.md` §6–7 — Vercel cron + Mailgun setup
- `CLAUDE.md` — current tech-stack summary
