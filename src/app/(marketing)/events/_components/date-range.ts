import { endOfDay, endOfMonth, endOfWeek } from "date-fns";

export type DateRange = "today" | "week" | "month";

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export function isDateRange(value: string | undefined): value is DateRange {
  return value === "today" || value === "week" || value === "month";
}

export function getDateRangeBounds(
  range: DateRange,
  now: Date = new Date()
): { gte: Date; lt: Date } {
  switch (range) {
    case "today":
      return { gte: now, lt: endOfDay(now) };
    case "week":
      return { gte: now, lt: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { gte: now, lt: endOfMonth(now) };
  }
}
