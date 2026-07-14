/**
 * Backfill Event.schedule from InvitationConfig timing fields
 * (canonical-schedule plan §4.2, PR 2 of the chain).
 *
 * WHY THIS EXISTS
 * Event.schedule (typed sub-event list, PR #286) is the single source of
 * truth for the day's timing, but existing wedding events carry their
 * ceremony/reception instants on InvitationConfig.{ceremony,reception}StartAt.
 * This one-off, operator-run script copies that typed timing into `schedule`
 * so the consumer PRs (Pass card, emails, invitation card, page schedule,
 * temporal segments) find entries on existing events. Free-text `*Date`/
 * `*Time` fields are deliberately NOT parsed (end-of-life per plan §4.3).
 *
 * WHAT IT DOES
 * For each event whose `schedule` is NULL and whose InvitationConfig has a
 * ceremony or reception start instant, it derives up to two entries via the
 * shared `deriveScheduleFromInvitationConfig` (src/lib/schedule-backfill.ts —
 * the same Zod schema the API enforces validates every write), then sets
 * `schedule` + `scheduleAutoPopulatedAt`. The timestamp drives the dashboard
 * "auto-populated, please verify" banner; the organizer's acknowledgement
 * clears it.
 *
 * SAFE TO RE-RUN
 * Idempotent by construction: eligibility is `schedule IS NULL`, so populated
 * events (by this script OR by an organizer) fall out of the query. A re-run
 * after a partial failure resumes exactly where it stopped. The script never
 * touches InvitationConfig — source fields stay as display-only overrides
 * until PR 6 removes them.
 *
 * RUN SEQUENCE (safe destructive-op order — do not skip steps)
 *   1. npx tsx scripts/backfill-event-schedules.ts --dry-run     # report only
 *   2. npx tsx scripts/backfill-event-schedules.ts --event-id=X  # one canary; verify its dashboard
 *   3. npx tsx scripts/backfill-event-schedules.ts               # full run (asks confirmation)
 *   4. npx tsx scripts/backfill-event-schedules.ts --dry-run     # must report 0 remaining
 *
 * The target banner prints the DB host before anything runs; the apply modes
 * require typing "yes" (or --yes for a deliberate non-interactive run).
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import readline from "readline";

import { deriveScheduleFromInvitationConfig } from "@/lib/schedule-backfill";
import { nullableJsonInput } from "@/lib/nullable-json";

config({ path: ".env.local" });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run") || args.has("-n");
const ASSUME_YES = args.has("--yes");
const EVENT_ID = (() => {
  const raw = process.argv.find((a) => a.startsWith("--event-id="));
  return raw ? raw.split("=")[1] : undefined;
})();

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing DATABASE_URL. Set it in .env.local, or inline for a one-off prod run:\n" +
      "  DATABASE_URL='…' npx tsx scripts/backfill-event-schedules.ts --dry-run"
  );
  process.exit(1);
}

// Target banner — the operator must see WHICH database this run touches.
const dbUrl = new URL(process.env.DATABASE_URL);
console.log("=".repeat(72));
console.log(`TARGET DATABASE: ${dbUrl.hostname}:${dbUrl.port || "5432"}${dbUrl.pathname}`);
console.log(`MODE: ${DRY_RUN ? "DRY RUN (no writes)" : EVENT_ID ? `CANARY (event ${EVENT_ID})` : "FULL RUN"}`);
console.log("=".repeat(72));

async function confirmOrAbort(): Promise<void> {
  if (DRY_RUN || ASSUME_YES) return;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) =>
    rl.question("Apply writes to the database above? Type 'yes' to continue: ", resolve)
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  await confirmOrAbort();

  // Eligibility: schedule not yet populated (SQL NULL — nothing ever writes
  // JSON-literal null to this column) + typed timing exists to derive from.
  const candidates = await prisma.event.findMany({
    where: {
      id: EVENT_ID,
      // SQL NULL — nothing writes JSON-literal null to this column, and the
      // AnyNull sentinel would hide a bug that did.
      schedule: { equals: Prisma.DbNull },
      invitationConfig: {
        OR: [
          { ceremonyStartAt: { not: null } },
          { receptionStartAt: { not: null } },
        ],
      },
    },
    select: {
      id: true,
      title: true,
      invitationConfig: {
        select: {
          ceremonyStartAt: true,
          ceremonyVenue: true,
          ceremonyAddress: true,
          receptionStartAt: true,
          receptionVenue: true,
          receptionAddress: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (EVENT_ID && candidates.length === 0) {
    console.log(
      `Event ${EVENT_ID} is not eligible (missing, schedule already set, or no typed timing).`
    );
    return;
  }

  let populated = 0;
  const roleCounts = { ceremony: 0, reception: 0 };
  const allWarnings: string[] = [];

  for (const event of candidates) {
    const { entries, warnings } = deriveScheduleFromInvitationConfig(
      event.invitationConfig! // non-null by the where clause
    );
    if (entries.length === 0) continue; // defensive; where clause should prevent

    for (const w of warnings) {
      allWarnings.push(`${event.id} (${event.title}): ${w}`);
    }
    for (const e of entries) {
      if (e.role === "ceremony") roleCounts.ceremony++;
      if (e.role === "reception") roleCounts.reception++;
    }

    if (DRY_RUN) {
      console.log(
        `[dry-run] ${event.id} (${event.title}): would write ${entries.length} ` +
          `entr${entries.length === 1 ? "y" : "ies"} (${entries.map((e) => e.role).join(", ")})`
      );
    } else {
      // Conditional write: the DbNull guard re-checks eligibility atomically,
      // so a schedule set between the findMany and this write (organizer
      // edit, concurrent run) is never clobbered — the row is skipped.
      const result = await prisma.event.updateMany({
        where: { id: event.id, schedule: { equals: Prisma.DbNull } },
        data: {
          schedule: nullableJsonInput(entries),
          scheduleAutoPopulatedAt: new Date(),
        },
      });
      if (result.count === 0) {
        console.log(
          `skipped ${event.id} (${event.title}): schedule was set by someone else since the scan`
        );
        continue;
      }
      console.log(
        `populated ${event.id} (${event.title}): ${entries.length} entr${entries.length === 1 ? "y" : "ies"}`
      );
    }
    populated++;
  }

  console.log("-".repeat(72));
  console.log(
    `${DRY_RUN ? "Would populate" : "Populated"}: ${populated} event(s) ` +
      `(ceremony entries: ${roleCounts.ceremony}, reception entries: ${roleCounts.reception})`
  );
  if (allWarnings.length > 0) {
    console.log(`\nWARNINGS (review these events by hand):`);
    for (const w of allWarnings) console.log(`  - ${w}`);
  }
  if (DRY_RUN && populated === 0) {
    console.log("Nothing remaining to backfill.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
