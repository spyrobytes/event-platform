import { describe, it, expect } from "vitest";
import { parseSchedule, findScheduleEntry } from "@/lib/schedule-read";

const entries = [
  {
    id: "e1",
    label: "Ceremony",
    role: "ceremony",
    startAt: "2026-09-19T15:00:00.000Z",
    isAccessPassGated: false,
  },
  {
    id: "e2",
    label: "Reception",
    role: "reception",
    startAt: "2026-09-19T20:00:00.000Z",
    isAccessPassGated: false,
  },
];

describe("parseSchedule", () => {
  it("parses a valid column value", () => {
    const parsed = parseSchedule(entries);
    expect(parsed).toHaveLength(2);
    expect(parsed![0].role).toBe("ceremony");
  });

  it("returns null for absent, empty, and malformed values", () => {
    expect(parseSchedule(null)).toBeNull();
    expect(parseSchedule(undefined)).toBeNull();
    expect(parseSchedule([])).toBeNull();
    expect(parseSchedule("not a schedule")).toBeNull();
    expect(parseSchedule([{ id: "x" }])).toBeNull();
    expect(parseSchedule({ entries })).toBeNull();
  });
});

describe("findScheduleEntry", () => {
  it("finds by role, not label", () => {
    const parsed = parseSchedule(entries)!;
    expect(findScheduleEntry(parsed, "reception")?.id).toBe("e2");
    expect(findScheduleEntry(parsed, "afterparty")).toBeNull();
  });

  it("returns the first match in organizer order", () => {
    const parsed = parseSchedule([
      { ...entries[1], id: "first" },
      { ...entries[1], id: "second" },
    ])!;
    expect(findScheduleEntry(parsed, "reception")?.id).toBe("first");
  });
});
