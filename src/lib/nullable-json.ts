import { Prisma } from "@prisma/client";

/**
 * Map a validated nullable-JSON value to Prisma's `Json?` update input:
 * `undefined` → `undefined` (Prisma leaves the column untouched),
 * `null` → `Prisma.DbNull` (SQL NULL — plain `null` is rejected by Prisma
 * as ambiguous between SQL NULL and JSON-literal null),
 * anything else → the value.
 *
 * Use this for every nullable `Json?` column update instead of re-inlining
 * the triage: existing inline copies have already drifted (gallery
 * `presentation` writes DbNull, invitation-config `timelineJson` writes
 * JsonNull — i.e. JSON-literal null, a different stored representation).
 * Migrating those call sites onto this helper is a follow-up; changing
 * timelineJson's stored form needs its readers checked first.
 */
export function nullableJsonInput(
  value: unknown
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}
