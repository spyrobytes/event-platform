import { scheduleSchema, type ScheduleEntry } from "@/schemas/event";

/**
 * Read-side helpers for the canonical Event.schedule column. Every consumer
 * surface (Pass card, emails, invitation card, page schedule, temporal
 * segments) reads through these so "typed first, legacy fallback" behaves
 * identically everywhere.
 */

export type ScheduleEntryRole = NonNullable<ScheduleEntry["role"]>;

/**
 * Lenient parse of the raw Json column value. Returns null for absent,
 * empty, or malformed data — render paths must fall back to their legacy
 * source, never throw. (The API validates writes, so malformed here means
 * hand-edited data or a schema change; degrading beats a 500 on a guest
 * page.)
 */
export function parseSchedule(value: unknown): ScheduleEntry[] | null {
  if (value == null) return null;
  const result = scheduleSchema.safeParse(value);
  if (!result.success || result.data.length === 0) return null;
  return result.data;
}

/**
 * First entry with the given semantic role, in organizer order. Roles are
 * the lookup contract — labels are organizer-editable display text.
 */
export function findScheduleEntry(
  entries: ScheduleEntry[],
  role: ScheduleEntryRole
): ScheduleEntry | null {
  return entries.find((e) => e.role === role) ?? null;
}
