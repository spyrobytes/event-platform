# Database Migration Runbook

Executable playbook for applying Prisma migrations to the **production** Supabase database. Covers the first deploy and every subsequent schema change until the process is automated in CI (see Appendix).

If you're just verifying deploy readiness, start with [`PRE_DEPLOYMENT_CHECKLIST.md`](./PRE_DEPLOYMENT_CHECKLIST.md) — come back here when you reach Section 5.

---

## When to use this runbook

- First production deploy (empty DB, applying the full migration history).
- Any PR that merges a schema change (adds a file under `prisma/migrations/`) and needs to be applied to prod before or shortly after the Vercel deploy goes live.
- Recovering from migration drift detected by `prisma migrate status` in CI or manual checks.

Do **not** use this for local development — use `npx prisma migrate dev` there. This runbook is specifically for `prisma migrate deploy` against the production DB.

---

## Timing convention

**Apply migrations *before* merging the PR that depends on them — not after.**

Vercel auto-deploys on every push to `main` and that deploy doesn't wait on anything. If you merge first and then migrate, you create a window where the new code is live but the schema it expects doesn't exist yet. Running the migration first — against the live prod DB, from your laptop — means by the time Vercel picks up the merged PR, the schema is already in place. The race simply can't happen.

Concrete sequence for any schema-change PR:

1. PR is reviewed and approved, but **not merged yet**.
2. Check out the PR branch locally.
3. Follow [The happy path](#the-happy-path) below to apply `prisma migrate deploy` to production.
4. `npx prisma migrate status` confirms "up to date."
5. **Then** merge the PR. Vercel deploys the new code against the already-migrated schema.

Same rule for a stack of PRs: migrate at the top of every branch that adds a migration, before merging that specific branch.

---

## Prerequisites

| Tool | Why | Install check |
|---|---|---|
| `psql` (PostgreSQL client) | Auth sanity check before running Prisma | `psql --version` |
| Vercel CLI, authenticated | Pull prod env vars safely | `vercel whoami` |
| Supabase project access | Retrieve/reset DB password, copy connection strings | Log in to Supabase dashboard |
| Node 22 + repo deps installed | `prisma migrate` commands | `node --version && ls node_modules/@prisma/client` |

You also need the **production database password**. It's not your Supabase account password — it's a per-project password set under *Project Settings → Database → Database Password*. If you don't know it, reset it (see [Pitfall 3](#pitfall-3-password-problems-p1000-authentication-failed)).

---

## The happy path

Do these in order. Each step is independently safe — you can stop and resume at any boundary.

### 1. Pull prod connection strings *without* clobbering `.env.local`

`vercel env pull` always writes to a file (default: `.env.local`). There is **no `--stdout` flag** — pass a temp path so your local-dev env isn't overwritten:

```bash
tmp=$(mktemp) && trap 'rm -f "$tmp"' EXIT
vercel env pull --environment=production "$tmp"
```

Spot-check that both vars came through (redacted view):

```bash
grep -E '^(DATABASE_URL|DIRECT_URL)=' "$tmp" \
  | sed -E 's|(://[^:]+):[^@]+@|\1:[redacted]@|'
```

Expected shape:
```
DATABASE_URL=postgresql://postgres.<project-ref>:[redacted]@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:[redacted]@aws-1-<region>.pooler.supabase.com:5432/postgres
```

If the username is just `postgres` (no `.<project-ref>` suffix), see [Pitfall 2](#pitfall-2-supavisor-pooler-username-format).

### 2. Export into the shell — **single-quoted**

```bash
export DATABASE_URL='<paste the DATABASE_URL value>'
export DIRECT_URL='<paste the DIRECT_URL value>'
```

**Critical:** single quotes, not double. Passwords often contain `$`, `!`, `` ` ``, `\` which bash expands under double quotes and silently corrupts the URL. See [Pitfall 4](#pitfall-4-bash-special-chars-in-passwords).

You can now delete the temp file:
```bash
rm -f "$tmp" && trap - EXIT
```

### 3. Sanity-check auth with `psql`

```bash
psql "$DIRECT_URL" -c 'select 1;'
```

Expected output:
```
 ?column?
----------
        1
(1 row)
```

`?column?` is just Postgres's default header for an unaliased expression — the `1` below confirms a full auth + query round-trip.

If this fails, fix auth before touching Prisma. See [Pitfall 3](#pitfall-3-password-problems-p1000-authentication-failed).

### 4. Dry-run with `prisma migrate status`

```bash
npx prisma migrate status
```

Possible outputs:

| Output | Meaning | Action |
|---|---|---|
| *"Database schema is up to date!"* | No pending migrations | Nothing to do; skip to cleanup (step 7). |
| *"N migrations have not yet been applied"* + list | Prod is behind repo | Review the list — are they all expected? Proceed to step 5. |
| *"Following migration is currently in failed state"* | A prior run died mid-apply | **Do not rerun `migrate deploy` blind.** See Prisma's [resolve docs](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-resolve) — typically `prisma migrate resolve --rolled-back <name>` then rerun, or `--applied <name>` if the DB actually has the changes. |
| *"Drift detected"* | DB schema differs from the migration history | **Stop.** See [PRE_DEPLOYMENT_CHECKLIST.md §5](./PRE_DEPLOYMENT_CHECKLIST.md) and Prisma's [drift docs](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prototyping-your-schema). Never run `migrate reset` against prod. |

### 5. Apply migrations

```bash
npx prisma migrate deploy
```

`migrate deploy` is transactional per migration — if one fails partway through a batch, earlier migrations stay applied and recorded. Rerun after fixing the offending migration and it resumes from where it stopped.

Expected tail:
```
All migrations have been successfully applied.
```

### 6. Verify

```bash
npx prisma migrate status
# expect: "Database schema is up to date!"
```

Optional — detect any drift introduced during apply:
```bash
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --exit-code
# expect: exit code 0 (no drift). Exit 2 = drift detected; exit 1 = error.
# If you want to see the drift as SQL, re-run with --script added.
```

### 7. Clean up

```bash
# Remove prod creds from this shell
unset DATABASE_URL DIRECT_URL

# Review history for lines with the password inline
history | grep -E 'export.*(DATABASE|DIRECT)_URL='

# Delete those specific lines:
history -d <line-number>   # repeat per line
# OR nuke this session's history:
history -c
```

If an earlier `vercel env pull` overwrote `.env.local`, restore it to your local-dev values. Local should point at local Supabase (typically `127.0.0.1:54322`) — **never** leave prod URLs in `.env.local`.

---

## Ordering vs. Vercel deploy

The [Timing convention](#timing-convention) — migrate before merging — eliminates any ordering race for additive migrations: by the time Vercel sees the merged PR, the schema is already in place, and the only transient state is "new schema + old code," which old code tolerates (it ignores columns it doesn't know about).

**Destructive changes (drop column, rename, type change, constraint tightening) are different.** A single migration that drops a column the currently-running code still reads will crash every request that touches it, regardless of ordering — the dangerous window exists between "migration applied" and "new code live" no matter who goes first.

The discipline that eliminates this is **expand-contract**: decompose the destructive change into a sequence of individually-additive steps, each safe in either deploy order. This isn't an alternative to strict ordering — it's the engineering discipline that *removes the need* for strict ordering.

Example — renaming `user_name` to `username`, as a sequence of separate PRs each shipped through this runbook's timing convention:

| PR | Migration (applied before merge) | Code in that PR | Why it's safe |
|---|---|---|---|
| 1 | Add `username` column (nullable), backfill from `user_name` | Write to **both**; read from `user_name` | Additive; old code ignores new column |
| 2 | — | Write to both; read from `username` | Both columns populated; either read works |
| 3 | — | Write only to `username` | `user_name` frozen but still present |
| 4 | Drop `user_name` | — | Nothing reads or writes `user_name` anymore |

Every PR on its own looks like an additive change at the deploy boundary. The race has nowhere to happen.

Migrations run **manually** via this runbook — see [Why migrations stay manual](#why-migrations-stay-manual-for-now) for the threat model and the criteria for revisiting automation.

---

## Pitfalls

Each is something we actually hit during the first prod deploy.

### Pitfall 1 — `vercel env pull --stdout` does not exist

Command reference for `vercel env pull` accepts a file path, not a stdout flag. Calling it without a path (or with `--stdout`) writes to `.env.local` by default, **silently clobbering your local-dev config**.

**Fix:** always pass an explicit temp path (step 1). If it happens anyway, restore `.env.local` from git or a teammate's copy — `.env.local` is gitignored, so you may not have a backup.

### Pitfall 2 — Supavisor pooler username format

Supabase's modern connection strings use Supavisor (not the legacy direct host). Pooler hostnames (`aws-*.pooler.supabase.com`) require a **different username**:

| Hostname | Username |
|---|---|
| `db.<ref>.supabase.co` (legacy direct, IPv6-only) | `postgres` |
| `aws-*.pooler.supabase.com:6543` (Supavisor transaction) | **`postgres.<project-ref>`** |
| `aws-*.pooler.supabase.com:5432` (Supavisor session) | **`postgres.<project-ref>`** |

Symptom: `P1000: Authentication failed against database server, the provided database credentials for postgres are not valid.` (note the username in the error is just `postgres`).

**Fix:** copy the URI from Supabase dashboard → *Project Settings → Database → Connection string → Session pooler / Transaction pooler*. The correct username is baked into the displayed string; you only need to fill `[YOUR-PASSWORD]`.

### Pitfall 3 — Password problems (`P1000: authentication failed`)

Three sub-causes, ranked by likelihood:

1. **Stale password in Vercel** — the DB password was rotated in Supabase but the Vercel secret was never updated. Reset in *Supabase → Database → Database Password*, then update both `DATABASE_URL` and `DIRECT_URL` in Vercel Production env vars.
2. **Placeholder pasted verbatim** — the literal string `[YOUR-PASSWORD]` was left in when someone copied the connection string. Length check: the password inside your URL should be long (Supabase-generated passwords are typically 16+ chars).
3. **URL-reserved chars not percent-encoded** — passwords containing `@ : / ? # % [ ]` must be URL-encoded when embedded in a connection string. Use `python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=""))' 'thepassword'` to encode, then paste the encoded form into the URL.

Use `psql "$DIRECT_URL" -c 'select 1;'` to isolate: if `psql` fails, the URL is bad (skip Prisma entirely until fixed). If only Prisma fails, the URL is fine and the issue is downstream.

### Pitfall 4 — Bash special chars in passwords

Passwords often contain `$ ! \` `` ` ``. Under **double quotes**, bash expands them before setting the variable, so the URL you end up with is not the URL you pasted.

```bash
# WRONG — $abc gets expanded to empty string
export DIRECT_URL="postgresql://postgres.xxx:pw$abc!stuff@host:5432/postgres"

# RIGHT — single quotes preserve literal chars
export DIRECT_URL='postgresql://postgres.xxx:pw$abc!stuff@host:5432/postgres'
```

**Fix:** always single-quote connection strings in shell exports. If you must use double quotes (e.g., the URL contains a literal single quote), escape every `$`, `!`, `\`, `` ` `` with backslashes — but single-quoting is safer.

### Pitfall 5 — `env()` helper in `prisma.config.ts` breaks CI

In Prisma 7, the `env()` helper exported from `prisma/config` is **strict** — it throws `PrismaConfigEnvError: Cannot resolve environment variable: X` when the variable is unset. CI jobs that run `prisma generate` or `prisma validate` (neither connects to a DB) don't have `DIRECT_URL` set as a secret, so using `env()` causes the postinstall hook to fail before lint / tests / build even start.

**Fix:** use `process.env["DIRECT_URL"]` — it returns `undefined` silently, which Prisma tolerates for non-connection commands. For `migrate` commands that need the URL, it must be exported in the shell as the runbook instructs.

Current config — the correct pattern:
```ts
// prisma.config.ts
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env["DIRECT_URL"], // NOT env("DIRECT_URL")
  },
});
```

---

## How Prisma 7 wires the two URLs

Worth internalizing so you understand why `DATABASE_URL` and `DIRECT_URL` exist at all:

| Who uses it? | Where configured | Should point at |
|---|---|---|
| **Runtime PrismaClient** (every API route, server component) | Adapter passed to `new PrismaClient({ adapter })` in `src/lib/db.ts` — it reads `process.env.DATABASE_URL` via `new Pool({ connectionString })` | **Pooled** URL, port 6543, with `?pgbouncer=true`. Survives Vercel's serverless connection churn. |
| **Prisma CLI** (`migrate`, `db push`, `db pull`) | `datasource.url` in `prisma.config.ts` | **Direct/session** URL, port 5432. DDL needs session-scoped state (advisory locks) which transaction-mode pooling breaks. |

The two are completely independent. The `datasource.url` field **no longer exists in `schema.prisma` under Prisma 7** — that's why `schema.prisma` only declares `provider`.

---

## Why migrations stay manual (for now)

A natural next step after this runbook would be to automate `prisma migrate deploy` in CI so humans don't need prod credentials on their laptops. We've chosen **not** to take that step. This section captures the reasoning so future contributors can re-evaluate rather than rediscover it.

### Why automation is attractive

- Eliminates per-developer credential copies.
- Audit trail in GitHub Actions logs.
- Consistent process regardless of who's on call.
- Unblocks a higher migration cadence.

### Why we defer

Automation with **static DB credentials stored as GitHub Actions secrets** *expands* the attack surface rather than shrinking it:

- **Workflow injection.** Any future workflow edit that interpolates untrusted input (PR title, commit message, issue body) into a `run:` step can exfiltrate secrets. GitHub's own security guidance has a whole page on this.
- **Action supply chain.** Every pinned action (`actions/checkout`, `actions/setup-node`, anything added later) runs with access to the job's secrets. Compromise of any of them compromises the DB.
- **Static credential rot.** Rotating requires coordinating Vercel, GitHub secrets, and any dev laptops that have a copy. In practice rotation slips and a single leak persists indefinitely.
- **Blast radius.** The `postgres` role Supabase issues by default has full DML and DDL on every table. A leak is catastrophic.

For a nascent platform with low migration frequency, **manual runs via this runbook carry less persistent exposure** than a CI workflow with stored DB credentials: one person, one shell session, one `unset` at the end, no long-lived secret sitting in a settings page.

### When to revisit

Automate once **both** are true:

1. Migration frequency exceeds comfort with manual runs (weekly+).
2. A secrets manager is in place — Doppler, 1Password Connect, Infisical, or HashiCorp Vault — fronted by GitHub Actions OIDC. The workflow fetches a short-lived DB credential at run time rather than reading a stored secret.

Until both hold, stay manual.

### Defense in depth to adopt sooner

Regardless of whether migrations are ever automated, narrow the blast radius of the credentials you do have by running migrations as a **dedicated, DDL-only Postgres role** instead of the default `postgres` superuser:

```sql
-- Run once against prod as a superuser
CREATE ROLE app_migrator LOGIN PASSWORD '<strong-password>';
GRANT USAGE ON SCHEMA public TO app_migrator;
GRANT CREATE ON SCHEMA public TO app_migrator;
-- Plus ALTER/DROP rights on existing tables as needed by future migrations.
-- Critically, do NOT grant data-level rights the app already has via its own role.
```

Then point `DIRECT_URL` at this role (same hostname/port, different user/password). A leak of `DIRECT_URL` now reveals DDL-only creds; it can't be used to read or exfiltrate user data. The runtime `DATABASE_URL` keeps its own (separately scoped) role for the application.

This is cheap to adopt and pays off whether you stay manual or move to automation later. Not done today — flagged as follow-up hardening.

---

## Appendix: GitHub Actions migration workflow (DRAFT — NOT RECOMMENDED AS-IS)

This workflow is **retained as reference, not a recommended configuration**. It stores DB credentials as GitHub Actions secrets, which we've deliberately chosen not to do — see [Why migrations stay manual](#why-migrations-stay-manual-for-now) above for the threat model.

If the team later adopts a secrets manager with OIDC, the *structure* below stays correct — but the `env: DATABASE_URL: ${{ secrets.DATABASE_URL }}` lines get replaced by a "fetch from vault over OIDC" step that returns short-lived credentials. Don't enable the workflow as written.

Place at `.github/workflows/migrate-production.yml` when the team is ready to enable:

```yaml
name: Migrate production DB

# Triggers: push to main (after a PR merges), or manual run.
# Required repo secrets:
#   - DATABASE_URL   Supabase pooled connection (port 6543, ?pgbouncer=true)
#   - DIRECT_URL     Supabase session/direct connection (port 5432)
# Required environment: "production" (configure at Settings → Environments)

on:
  push:
    branches: [main]
  workflow_dispatch:

# Serialize — never cancel a running migration mid-DDL.
concurrency:
  group: migrate-production
  cancel-in-progress: false

jobs:
  migrate:
    name: prisma migrate deploy
    runs-on: ubuntu-latest
    environment: production  # Required-reviewer gate via GitHub Environment

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Show migration status (dry run)
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
        run: npx prisma migrate status

      - name: Apply migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
        run: npx prisma migrate deploy

      - name: Verify no drift after apply
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
        # --exit-code returns:
        #   0 = no drift        (step passes)
        #   1 = error            (step fails)
        #   2 = drift detected   (step fails)
        # Any non-zero exit fails the Actions step automatically, so no bash
        # wrapper is needed. Do NOT use `--script` here without --exit-code:
        # --script always emits output (even "-- This is an empty migration."
        # when there is no drift), which makes a `-n "$DIFF"` check unusable.
        run: |
          npx prisma migrate diff \
            --from-migrations ./prisma/migrations \
            --to-schema-datamodel ./prisma/schema.prisma \
            --exit-code
```

### Design notes for the reviewer

- **`environment: production`** forces a manual-approval click on the first run; configure required reviewers under *Settings → Environments → production*. Remove the line for fully-automatic migrations.
- **`concurrency.cancel-in-progress: false`** — a running migration must finish (or fail on its own) before the next one starts. Prisma's advisory lock catches concurrent runs at the DB level, but this avoids the contention entirely.
- **Ordering vs. Vercel** — the workflow runs in parallel with Vercel's git auto-deploy. See the [Ordering section](#ordering-vs-vercel-deploy) above. If you need strict "migrate before deploy," turn off Vercel's git auto-deploy for `main` and append a `vercel deploy --prod` step to this workflow (using a `VERCEL_TOKEN` secret).
- **Not gated on `ci.yml`** — `workflow_run` chaining is awkward (triggering event is lost, timing unpredictable). The `environment: production` approval gate serves as the human check.
- **No notifications** — failures surface in the Actions tab only. Add a Slack / email step if your team wants pings.

### Enabling checklist (do not start until prerequisites are met)

**Do not enable this workflow with static `secrets.*` references.** Static credentials in GitHub Actions give you no security benefit over manual runs — they just move the secret to a more-exposed location. Meet all prerequisites first.

**Prerequisites:**

1. A secrets manager is deployed and integrated with GitHub Actions via OIDC (Doppler, 1Password Connect, Infisical, HashiCorp Vault, or equivalent). No stored secret; the workflow fetches a short-lived credential at run time.
2. A dedicated migrator Postgres role with DDL-only privileges (see [Defense in depth](#defense-in-depth-to-adopt-sooner) above). The runtime keeps its own separately-scoped role.
3. The YAML below is **reworked** to replace each `${{ secrets.* }}` reference with a secrets-manager fetch step producing a temporary credential for that job only.

**Only then:**

1. Create the `production` GitHub Environment under *Settings → Environments → New environment*:
   - Required reviewer(s) for human approval.
   - Restrict to the `main` branch.
2. Drop the reworked YAML into `.github/workflows/migrate-production.yml`, commit, push.
3. First run after merge → Actions tab → approve → watch it apply.
4. If it works, update the [Why migrations stay manual](#why-migrations-stay-manual-for-now) section to note the date and rationale, and reframe this runbook's happy path as "recovery / drift-repair only."
