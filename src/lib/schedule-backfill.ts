import { randomUUID } from "crypto";
import { scheduleSchema, type ScheduleEntry } from "@/schemas/event";

/**
 * Derivation core for the schedule backfill (canonical-schedule plan §4.2):
 * builds typed Event.schedule entries from InvitationConfig's wedding-shaped
 * timing fields. Pure — the operator script owns all I/O — so the mapping
 * rules are unit-testable.
 */

export type InvitationTimingFields = {
  ceremonyStartAt: Date | null;
  ceremonyVenue: string | null;
  ceremonyAddress: string | null;
  receptionStartAt: Date | null;
  receptionVenue: string | null;
  receptionAddress: string | null;
};

export type DerivedSchedule = {
  entries: ScheduleEntry[];
  /** Data-quality notes for the operator report (entry order oddities,
   *  truncated strings). Warnings never block the derivation. */
  warnings: string[];
};

/** Schema caps (scheduleEntrySchema) — DB strings may exceed them. */
const VENUE_MAX = 120;
const ADDRESS_MAX = 200;

function truncate(
  value: string | null,
  max: number,
  what: string,
  warnings: string[]
): string | null {
  if (value === null) return null;
  if (value.length <= max) return value;
  warnings.push(`${what} truncated from ${value.length} to ${max} chars`);
  return value.slice(0, max);
}

/**
 * Derive up to two entries (ceremony, reception) from an InvitationConfig's
 * typed timing fields. Free-text `*Date`/`*Time` fields are deliberately
 * ignored — they are unparseable display strings (end-of-life per §4.3).
 *
 * @param makeId injectable for deterministic tests (defaults to randomUUID)
 */
export function deriveScheduleFromInvitationConfig(
  cfg: InvitationTimingFields,
  makeId: () => string = randomUUID
): DerivedSchedule {
  const warnings: string[] = [];
  const entries: ScheduleEntry[] = [];

  if (cfg.ceremonyStartAt) {
    entries.push({
      id: makeId(),
      label: "Ceremony",
      role: "ceremony",
      startAt: cfg.ceremonyStartAt.toISOString(),
      venue: truncate(cfg.ceremonyVenue, VENUE_MAX, "ceremonyVenue", warnings),
      address: truncate(cfg.ceremonyAddress, ADDRESS_MAX, "ceremonyAddress", warnings),
      isAccessPassGated: false,
    });
  }

  if (cfg.receptionStartAt) {
    entries.push({
      id: makeId(),
      label: "Reception",
      role: "reception",
      startAt: cfg.receptionStartAt.toISOString(),
      venue: truncate(cfg.receptionVenue, VENUE_MAX, "receptionVenue", warnings),
      address: truncate(cfg.receptionAddress, ADDRESS_MAX, "receptionAddress", warnings),
      isAccessPassGated: false,
    });
  }

  if (
    cfg.ceremonyStartAt &&
    cfg.receptionStartAt &&
    cfg.receptionStartAt.getTime() < cfg.ceremonyStartAt.getTime()
  ) {
    warnings.push(
      "reception starts before ceremony — config may be inconsistent, review before trusting"
    );
  }

  if (entries.length > 0) {
    // The backfill must never write rows the API would reject — a mapping
    // bug here should crash the script, not poison the column.
    scheduleSchema.parse(entries);
  }

  return { entries, warnings };
}
