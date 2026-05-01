# Database audits

Read-only scripts that surface data anomalies. Each audit is self-contained, takes no arguments, and prints to stdout.

These are **not migrations** — nothing here mutates data. The output of an audit is the *input* to a decision: do nothing, fix by hand, or design a migration.

## When to run an audit

- **Triggered by a known bug fix.** When you fix a bug whose previous behavior may have written corrupt data, run the matching audit *before* deciding on a backfill strategy.
- **Periodically as scale grows.** A handful of rows can be eyeballed; a few hundred can't. Audits scale where manual review doesn't.
- **Before risky migrations.** Run the relevant audit, save the output, run the migration, run the audit again. Compare.

If your prod database has fewer than ~10 rows of the type being audited, you probably don't need the script — just inspect by hand. The audit's value compounds with row count.

## Running

Audits read whichever database `DATABASE_URL` points at. The convention:

```bash
# Local Supabase (default — uses .env.local)
npx tsx prisma/audits/<name>.ts

# Staging / preview / prod — point at the right DB
DATABASE_URL="<env-specific-pooler-url>" npx tsx prisma/audits/<name>.ts
```

Save the output. The decision flow afterwards usually wants the raw text:

```bash
npx tsx prisma/audits/<name>.ts > /tmp/audit-$(date +%Y%m%d).log
```

Audits never write to the DB. Safe to run against prod from any developer machine that already has DB credentials in env.

---

## `event-timezones.ts`

### What it audits

`startAt` values that may have been corrupted by the form-side timezone bug — `<input type="datetime-local">` interprets input in the **browser's** local timezone, ignoring the venue-tz dropdown. So a NY organizer creating a 7 PM Pacific wedding stores the wedding as 7 PM Eastern.

The script renders every event's `startAt` in `event.timezone` and flags wall-clock anomalies:

| Band | Wall-clock hour | Interpretation |
|---|---|---|
| **HIGH suspicion** | 02:00–05:59 | Almost always corrupted — legitimate events rarely start here |
| **LOW suspicion** | 00:00–01:59 or 06:00–07:59 | Possible (midnight events, sunrise ceremonies) — manual review |
| Normal | 08:00–23:59 | No flag |

### What it cannot detect

A small tz drift. NY organizer creates a Central event for 7 PM → stored as 7 PM Eastern = 6 PM Central. 6 PM still looks normal in the histogram, so the bug hides. Detecting that requires knowing the organizer's browser tz at create time, which we don't store. For high-stakes events, the only certainty is asking the organizer.

### Decision matrix

Use the **HIGH suspicion** count to choose:

| HIGH count | What to do |
|---|---|
| **0** | No action. Skip backfill. Form-side fix going forward will prevent recurrence. |
| **1–5** | Contact each organizer to confirm intended time. Fix correct rows with one-off `db.event.update` calls. |
| **6+** | Design a backfill migration. Likely needs per-event organizer confirmation since we can't infer intent from data alone. |

For **LOW suspicion** rows, default to "leave alone" — too many false positives. Investigate only if the row is also high-stakes (PUBLISHED + has invites/RSVPs).

### Sample output

```
Audit run: 2026-05-01T23:16:15.765Z
Total events: 23

Wall-clock hour distribution (in event.timezone):
 ? 00:00     1  █
 ⚠ 03:00     5  █████
 ⚠ 04:00     1  █
   09:00     1  █
   ...

HIGH SUSPICION — wall-clock 02:00–05:59 in event tz (n=6)
  [PUBLISHED] | event_techconf_002 | tz=America/New_York | venue=2026-02-20 03:06 | UTC=2026-02-20T08:06:04.111Z | creator=alice@test.local | "TechCorp Annual Conference 2026"
  ...

Summary:
  Total events:                      23
  Events with timezone='UTC':        1 (undetectable here)
  Checkable (non-UTC) events:        22
  HIGH suspicion:                    6
  LOW suspicion:                     1
  HIGH suspicion rate:               27.3% of checkable
```

The 27.3% rate above is a *seed-data artifact* (seed script writes everything at `08:06:04 UTC`, which lands in the early-morning band across most North American tz). Real production data should be near zero.

### Related fixes

- **Display side**: PR #37 (cross-codebase formatter sweep), PR #39 (EventCard / DiscoveryEventCard catch-up).
- **Form side**: not yet shipped. Plan: replace the implicit `new Date(string)` parse with `fromZonedTime(string, event.timezone)` on submit, and `toZonedTime(date, event.timezone)` on edit-render. Add a "Time interpreted as [tz]" hint under the input.

### History

| Date | Run by | Env | HIGH | LOW | Action taken |
|---|---|---|---|---|---|
| _record runs here_ | | | | | |

---

## Adding a new audit

Mirror the structure of `event-timezones.ts`:

1. **One file, one audit.** Filename describes what's being audited (e.g. `orphan-rsvps.ts`, `expired-invites-with-claims.ts`).
2. **Self-contained DB connection** via `PrismaPg` adapter + `Pool`, reading `DATABASE_URL` from `.env.local`. Match the existing `db.$disconnect()` + `pool.end()` cleanup.
3. **Header docstring** explaining: the bug or invariant being audited, what the script can detect, what it can't.
4. **Output to stdout** in a form that diffs cleanly across runs.
5. **Update this README** with a section for the new audit, including its decision matrix.
