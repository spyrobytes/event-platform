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
 * Resolves an RSVP-deadline string for display (heroes, invitation card,
 * invite email) from the enforced `Event.rsvpDeadline` — the one value the
 * RSVP API actually closes on, so display can never contradict behavior
 * (canonical-schedule plan §4.3). Deadline wording is deliberately
 * date-only: the enforced timestamp's time component ("11:59 PM") reads as
 * noise on an invitation. `wordingStyle` mirrors the invitation card's
 * formal option ("the First of August").
 */
export function resolveRsvpDeadlineDisplay(
  eventRsvpDeadline: Date | string | null | undefined,
  timezone: string,
  wordingStyle?: "standard" | "formal"
): string | undefined {
  if (!eventRsvpDeadline) return undefined;
  const date = new Date(eventRsvpDeadline);
  if (wordingStyle === "formal") return formatEventDateFormal(date, timezone);
  return formatEventDateMedium(date, timezone);
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

const ORDINAL_WORDS = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
  "Eleventh",
  "Twelfth",
  "Thirteenth",
  "Fourteenth",
  "Fifteenth",
  "Sixteenth",
  "Seventeenth",
  "Eighteenth",
  "Nineteenth",
  "Twentieth",
  "Twenty-First",
  "Twenty-Second",
  "Twenty-Third",
  "Twenty-Fourth",
  "Twenty-Fifth",
  "Twenty-Sixth",
  "Twenty-Seventh",
  "Twenty-Eighth",
  "Twenty-Ninth",
  "Thirtieth",
  "Thirty-First",
] as const;

const HOUR_WORDS = [
  "Twelve",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
] as const;

/** Formal day period for a 24h venue-clock hour. Evening starts at 5 PM. */
function formalDayPeriod(hour24: number): string {
  if (hour24 < 12) return "in the Morning";
  if (hour24 < 17) return "in the Afternoon";
  return "in the Evening";
}

/**
 * The hour a formal time phrase anchors on: "Midnight", "Noon", or
 * "Four in the Afternoon". Shared by the o'clock and quarter-hour branches
 * so 11:45 PM reads "Quarter to Midnight", never "…Twelve in the Morning".
 */
function formalHourPhrase(hour24: number): string {
  if (hour24 === 0) return "Midnight";
  if (hour24 === 12) return "Noon";
  return `${HOUR_WORDS[hour24 % 12]} ${formalDayPeriod(hour24)}`;
}

/**
 * Formal invitation date wording: "Saturday, the Twenty-First of June".
 * Deterministic spelled-out counterpart to `formatEventDateLong`, used when
 * an invitation's date-wording style is "formal" (canonical-schedule plan
 * §3.3). Always pass `event.timezone`.
 */
export function formatEventDateFormal(
  date: Date | string | number,
  timezone: string
): string {
  const weekday = formatInTimeZone(date, timezone, "EEEE");
  const day = Number(formatInTimeZone(date, timezone, "d"));
  const month = formatInTimeZone(date, timezone, "MMMM");
  return `${weekday}, the ${ORDINAL_WORDS[day - 1]} of ${month}`;
}

/**
 * Formal invitation time wording: "Four O'Clock in the Afternoon",
 * "Half past Six in the Evening". Covers on-the-hour and quarter-hour
 * times (the invitation register); anything else degrades to the numeric
 * `formatEventTime` rather than invent wording like "Twenty-Three past
 * Four". Connector words stay lowercase, matching "in the Afternoon".
 * Always pass `event.timezone`.
 */
export function formatEventTimeFormal(
  date: Date | string | number,
  timezone: string
): string {
  const hour24 = Number(formatInTimeZone(date, timezone, "H"));
  const minute = Number(formatInTimeZone(date, timezone, "m"));

  if (minute === 0) {
    if (hour24 === 0) return "Midnight";
    if (hour24 === 12) return "Noon";
    return `${HOUR_WORDS[hour24 % 12]} O'Clock ${formalDayPeriod(hour24)}`;
  }
  if (minute === 15) {
    return `Quarter past ${formalHourPhrase(hour24)}`;
  }
  if (minute === 30) {
    return `Half past ${formalHourPhrase(hour24)}`;
  }
  if (minute === 45) {
    return `Quarter to ${formalHourPhrase((hour24 + 1) % 24)}`;
  }
  return formatEventTime(date, timezone);
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
