/**
 * audit-event-timezones.ts
 *
 * Read-only audit for the form-side timezone bug.
 *
 * Background: `<input type="datetime-local">` produces a timezone-naive
 * string. `z.coerce.date()` interprets that string in the BROWSER's local
 * timezone, ignoring the venue timezone the organizer picked from the
 * dropdown. Result: a NY organizer creating a 7 PM Pacific wedding gets
 * the wedding's `startAt` stored as 7 PM Eastern (UTC 23:00), which renders
 * as 4 PM Pacific on every public surface.
 *
 * What this script DOES detect:
 *   Events whose stored `startAt`, when rendered in the event's own
 *   timezone, lands in a wall-clock band that's almost-certainly wrong:
 *     HIGH SUSPICION (02:00–05:59):   3 AM weddings basically don't exist
 *     LOW SUSPICION (00:00–01:59,
 *                    06:00–07:59):    rare but possible — manual review
 *
 * What this script CANNOT detect:
 *   "Small" tz drift. If a NY organizer creates a Central event for 7 PM
 *   meaning to type 7 PM Central, it ends up stored as 7 PM Eastern = 6 PM
 *   Central. 6 PM still looks normal in the histogram, so the bug hides.
 *   Detecting that requires knowing the organizer's browser tz at create
 *   time — which we don't store.
 *
 * Usage:
 *   npx tsx prisma/audits/event-timezones.ts
 *
 * Run against whichever DATABASE_URL .env.local points at. Make a copy
 * of the output before deciding on a backfill strategy.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { config } from "dotenv";
import { formatInTimeZone } from "date-fns-tz";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// Hour bands (24h, in event.timezone wall clock):
// - HIGH: 02:00–05:59 — extremely rare for legitimate events
// - LOW:  00:00–01:59 and 06:00–07:59 — possible but worth a look
const HIGH_BAND = { start: 2, endExclusive: 6 };
const LOW_BANDS: { start: number; endExclusive: number }[] = [
  { start: 0, endExclusive: 2 },
  { start: 6, endExclusive: 8 },
];

type EventRow = {
  id: string;
  title: string;
  slug: string;
  startAt: Date;
  timezone: string;
  status: string;
  createdAt: Date;
  creator: { email: string; name: string | null };
};

function inBand(hour: number, band: { start: number; endExclusive: number }) {
  return hour >= band.start && hour < band.endExclusive;
}

function formatRow(e: EventRow): string {
  const wallClock = formatInTimeZone(e.startAt, e.timezone, "yyyy-MM-dd HH:mm");
  return [
    `[${e.status.padEnd(9)}]`,
    e.id,
    `tz=${e.timezone.padEnd(20)}`,
    `venue=${wallClock}`,
    `UTC=${e.startAt.toISOString()}`,
    `creator=${e.creator.email}`,
    `"${e.title}"`,
  ].join(" | ");
}

async function main() {
  const events = (await db.event.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      startAt: true,
      timezone: true,
      status: true,
      createdAt: true,
      creator: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  })) as EventRow[];

  console.log(`Audit run: ${new Date().toISOString()}`);
  console.log(`Total events: ${events.length}`);
  console.log("");

  const hourCounts = Array.from({ length: 24 }, () => 0);
  const highSuspicion: EventRow[] = [];
  const lowSuspicion: EventRow[] = [];
  const utcTzCount = events.filter((e) => e.timezone === "UTC").length;

  for (const e of events) {
    let hour: number;
    try {
      hour = parseInt(formatInTimeZone(e.startAt, e.timezone, "H"), 10);
    } catch (err) {
      console.warn(
        `  ! Failed to format ${e.id} (timezone=${e.timezone}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      continue;
    }
    if (Number.isNaN(hour)) continue;
    hourCounts[hour]++;

    // UTC events can't be checked: we have no separate "intended" tz to
    // compare against, so we can't tell whether stored time matches intent.
    if (e.timezone === "UTC") continue;

    if (inBand(hour, HIGH_BAND)) {
      highSuspicion.push(e);
    } else if (LOW_BANDS.some((b) => inBand(hour, b))) {
      lowSuspicion.push(e);
    }
  }

  console.log("Wall-clock hour distribution (in event.timezone):");
  for (let h = 0; h < 24; h++) {
    const count = hourCounts[h];
    const inHigh = inBand(h, HIGH_BAND);
    const inLow = LOW_BANDS.some((b) => inBand(h, b));
    const marker = inHigh ? " ⚠ " : inLow ? " ? " : "   ";
    const bar = "█".repeat(Math.min(count, 60));
    console.log(
      `${marker}${String(h).padStart(2, "0")}:00  ${String(count).padStart(4)}  ${bar}`
    );
  }
  console.log("");

  console.log(
    `HIGH SUSPICION — wall-clock 02:00–05:59 in event tz (n=${highSuspicion.length})`
  );
  console.log(
    "Almost certainly corrupted by the form-side tz bug. Verify with organizer before backfill."
  );
  if (highSuspicion.length === 0) {
    console.log("  (none)");
  } else {
    for (const e of highSuspicion) console.log(`  ${formatRow(e)}`);
  }
  console.log("");

  console.log(
    `LOW SUSPICION — wall-clock 00:00–01:59 or 06:00–07:59 in event tz (n=${lowSuspicion.length})`
  );
  console.log(
    "Possibly intentional (midnight events, sunrise ceremonies). Manual review recommended."
  );
  if (lowSuspicion.length === 0) {
    console.log("  (none)");
  } else {
    for (const e of lowSuspicion) console.log(`  ${formatRow(e)}`);
  }
  console.log("");

  const checkable = events.length - utcTzCount;
  const highRate =
    checkable === 0 ? 0 : (highSuspicion.length / checkable) * 100;

  console.log("Summary:");
  console.log(`  Total events:                      ${events.length}`);
  console.log(`  Events with timezone='UTC':        ${utcTzCount} (undetectable here)`);
  console.log(`  Checkable (non-UTC) events:        ${checkable}`);
  console.log(`  HIGH suspicion:                    ${highSuspicion.length}`);
  console.log(`  LOW suspicion:                     ${lowSuspicion.length}`);
  console.log(`  HIGH suspicion rate:               ${highRate.toFixed(1)}% of checkable`);
  console.log("");
  console.log(
    "Reminder: this audit detects WALL-CLOCK ANOMALIES only. It cannot detect"
  );
  console.log(
    "smaller tz drift (e.g. NY organizer creating a Central event ends up 1 hour"
  );
  console.log(
    "off but 6 PM still looks normal). For high-stakes events, the only certain"
  );
  console.log("way to confirm correctness is to ask the organizer.");

  await db.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
