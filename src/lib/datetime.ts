import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";

/**
 * UTC instant → wall-clock string for `<input type="datetime-local">` in the
 * given event timezone. Returns `""` for null/undefined so the empty default
 * falls through cleanly into the input.
 *
 * Inverse of `fromDatetimeLocalInTz`. Wall-clock is the source of truth: the
 * organizer entered "ceremony at 22:00" in the event's locale, and the input
 * should always show "22:00" regardless of the viewer's machine timezone.
 */
export function toDatetimeLocalInTz(
  utc: Date | string | null | undefined,
  timezone: string
): string {
  if (!utc) return "";
  return formatInTimeZone(utc, timezone, DATETIME_LOCAL_FORMAT);
}

/**
 * Wall-clock string from `<input type="datetime-local">` → UTC `Date`,
 * interpreting the value in the given event timezone (NOT the browser's).
 *
 * Returns `null` for empty input. Throws if the wall-clock string can't be
 * parsed (callers should validate non-empty before calling, or guard the
 * thrown error if user input is the source).
 */
export function fromDatetimeLocalInTz(
  value: string | null | undefined,
  timezone: string
): Date | null {
  if (!value) return null;
  return fromZonedTime(value, timezone);
}
