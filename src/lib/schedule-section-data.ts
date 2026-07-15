import { formatInTimeZone } from "date-fns-tz";
import { parseSchedule } from "@/lib/schedule-read";
import { formatEventTime, formatEventDateMedium } from "@/lib/utils";
import type { ScheduleEntry } from "@/schemas/event";
import type { Section, ScheduleSection, ScheduleGroup } from "@/schemas/event-page";

/**
 * Derives the page schedule section's display data from the canonical
 * Event.schedule (canonical-schedule plan §3, PR 3d). Produces the EXISTING
 * page-config shape (items + optional multi-day groups), so every schedule
 * renderer — the three flat-only templates, ScheduleV2, the six V3
 * renderers, and the V3 hero chips — picks up typed data with no component
 * changes.
 *
 * Precedence (per plan §5 PR 3d row): typed entries render first; the
 * free-text scheduleSection.items/groups are a legacy-only fallback for
 * events with no typed schedule, until PR 6 removes them.
 */

type ScheduleItem = ScheduleSection["data"]["items"][number];

/** Venue-calendar-day key — groups split on the venue's midnight, not UTC. */
function dayKey(iso: string, tz: string): string {
  return formatInTimeZone(iso, tz, "yyyy-MM-dd");
}

function toItem(
  entry: ScheduleEntry,
  tz: string,
  opts: { dayPrefix: boolean }
): ScheduleItem {
  const start = formatEventTime(entry.startAt, tz);
  // Flat lists on multi-day schedules carry the day in the time string
  // (the flat-only renderers have nowhere else to show it) — as "Aug 22",
  // not a weekday, so schedules spanning the same weekday twice stay
  // unambiguous. The end time is dropped there to stay within the shape's
  // 20-char display budget.
  const time = opts.dayPrefix
    ? `${formatInTimeZone(entry.startAt, tz, "MMM d")} · ${start}`
    : entry.endAt
      ? `${start} – ${formatEventTime(entry.endAt, tz)}`
      : start;
  return {
    time,
    title: entry.label,
    ...(entry.venue ? { location: entry.venue } : {}),
    ...(entry.description ? { description: entry.description } : {}),
  };
}

/**
 * Returns typed-derived `{ items, groups? }`, or null when the event has no
 * usable typed schedule (absent, empty, or malformed) — callers keep the
 * legacy free-text data in that case.
 */
export function deriveScheduleSectionData(
  schedule: unknown,
  timezone: string
): { items: ScheduleItem[]; groups?: ScheduleGroup[] } | null {
  const entries = parseSchedule(schedule);
  if (!entries) return null;

  // Compare as instants, never as ISO strings (mixed precision misorders).
  const sorted = [...entries].sort(
    (a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)
  );

  const days = new Map<string, ScheduleEntry[]>();
  for (const entry of sorted) {
    const key = dayKey(entry.startAt, timezone);
    const bucket = days.get(key);
    if (bucket) bucket.push(entry);
    else days.set(key, [entry]);
  }

  if (days.size <= 1) {
    return {
      items: sorted.map((e) => toItem(e, timezone, { dayPrefix: false })),
    };
  }

  // Renderer contract: the page-config schema caps groups at 6 and items
  // per group at 10, and the group-aware renderers (tab bars, stacked day
  // headers) were built under those caps — but derivation runs after
  // validation, and a 20-entry typed schedule can exceed both. When it
  // would, emit the day-prefixed flat list only (every renderer handles
  // flat data) instead of silently truncating entries.
  const withinGroupCaps =
    days.size <= 6 &&
    [...days.values()].every((dayEntries) => dayEntries.length <= 10);
  const dayPrefixedItems = sorted.map((e) =>
    toItem(e, timezone, { dayPrefix: true })
  );
  if (!withinGroupCaps) {
    return { items: dayPrefixedItems };
  }

  // Multi-day: groups labelled by venue weekday + date for the groups-aware
  // renderers, plus a day-prefixed flat list for the flat-only ones.
  const groups: ScheduleGroup[] = [...days.values()].map((dayEntries) => ({
    label: formatInTimeZone(dayEntries[0].startAt, timezone, "EEEE"),
    date: formatEventDateMedium(dayEntries[0].startAt, timezone),
    items: dayEntries.map((e) => toItem(e, timezone, { dayPrefix: false })),
  }));

  return {
    items: dayPrefixedItems,
    groups,
  };
}

/**
 * Substitutes typed-derived schedule data into a page config's sections.
 * Organizer display copy (heading/description) is preserved; only
 * items/groups are replaced. No typed schedule → sections are returned
 * unchanged (free-text fallback keeps rendering).
 */
export function applyTypedScheduleToSections(
  sections: Section[],
  schedule: unknown,
  timezone: string
): Section[] {
  const derived = deriveScheduleSectionData(schedule, timezone);
  if (!derived) return sections;

  return sections.map((section) => {
    if (section.type !== "schedule") return section;
    const { groups: _dropped, ...restData } = section.data;
    return {
      ...section,
      data: {
        ...restData,
        items: derived.items,
        ...(derived.groups ? { groups: derived.groups } : {}),
      },
    };
  });
}
