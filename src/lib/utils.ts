import { clsx, type ClassValue } from "clsx";
import { formatInTimeZone } from "date-fns-tz";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names using clsx and tailwind-merge.
 * Use for conditional Tailwind classes without conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats an event date for display.
 */
export function formatEventDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

/**
 * Long event-date format: "Saturday, June 21, 2026".
 * Use for emails, invitation pages, and other formal display contexts.
 * Always pass `event.timezone` so the date represents the venue's wall clock,
 * not the server's UTC clock.
 */
export function formatEventDateLong(
  date: Date | string | number,
  timezone: string
): string {
  return formatInTimeZone(date, timezone, "EEEE, MMMM d, yyyy");
}

/**
 * Event time format: "7:00 PM".
 * Always pass `event.timezone`.
 */
export function formatEventTime(
  date: Date | string | number,
  timezone: string
): string {
  return formatInTimeZone(date, timezone, "h:mm a");
}

/**
 * Medium event-date format: "June 21, 2026".
 * Use for compact contexts — meta descriptions, secondary copy where the
 * weekday isn't useful. Always pass `event.timezone`.
 */
export function formatEventDateMedium(
  date: Date | string | number,
  timezone: string
): string {
  return formatInTimeZone(date, timezone, "MMMM d, yyyy");
}

/**
 * Combined long date + time: "Saturday, June 21, 2026 at 7:00 PM".
 * Used in dashboards and event detail pages.
 * Always pass `event.timezone`.
 */
export function formatEventDateTimeLong(
  date: Date | string | number,
  timezone: string
): string {
  return formatInTimeZone(date, timezone, "EEEE, MMMM d, yyyy 'at' h:mm a");
}

/**
 * Compact combined date + time: "Sat, Jun 21, 2026 at 7:00 PM".
 * Use in space-constrained surfaces (event cards, list rows) where the
 * long form is too verbose. Always pass `event.timezone`.
 */
export function formatEventDateTimeMedium(
  date: Date | string | number,
  timezone: string
): string {
  return formatInTimeZone(date, timezone, "EEE, MMM d, yyyy 'at' h:mm a");
}

/**
 * Formats a date range for display.
 */
export function formatDateRange(
  start: Date,
  end: Date | null,
  timezone: string
): string {
  const startStr = formatEventDate(start, timezone);
  if (!end) return startStr;

  const endStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(end);

  return `${startStr} - ${endStr}`;
}

/**
 * Generates a URL-friendly slug from a string.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug by appending a suffix if needed.
 */
export async function generateUniqueSlug(
  text: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = generateSlug(text);
  let slug = baseSlug;
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Truncates text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Extracts initials from a name (max 2 characters).
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
