import { describe, it, expect } from "vitest";
import {
  deriveScheduleSectionData,
  applyTypedScheduleToSections,
} from "@/lib/schedule-section-data";
import type { Section } from "@/schemas/event-page";

const TZ = "America/Edmonton"; // UTC-6 in summer

const singleDay = [
  {
    id: "e2",
    label: "Reception",
    role: "reception",
    startAt: "2026-08-22T19:00:00.000Z", // 1:00 PM local
    endAt: "2026-08-23T00:00:00.000Z", // 6:00 PM local
    venue: "Convention Centre",
    isAccessPassGated: false,
  },
  {
    id: "e1",
    label: "Ceremony",
    role: "ceremony",
    startAt: "2026-08-22T16:00:00.000Z", // 10:00 AM local
    venue: "Celebration Church",
    address: "7544 Argyll Road",
    description: "Doors open half an hour early.",
    isAccessPassGated: false,
  },
];

const multiDay = [
  ...singleDay,
  {
    id: "e3",
    label: "Farewell Brunch",
    startAt: "2026-08-23T17:00:00.000Z", // Sunday 11:00 AM local
    isAccessPassGated: false,
  },
];

describe("deriveScheduleSectionData", () => {
  it("returns null for absent, empty, or malformed schedules", () => {
    expect(deriveScheduleSectionData(null, TZ)).toBeNull();
    expect(deriveScheduleSectionData([], TZ)).toBeNull();
    expect(deriveScheduleSectionData([{ nonsense: true }], TZ)).toBeNull();
  });

  it("single day: flat items sorted by instant, venue-tz times, end ranges", () => {
    const result = deriveScheduleSectionData(singleDay, TZ);
    expect(result).toEqual({
      items: [
        {
          time: "10:00 AM",
          title: "Ceremony",
          // venue + address join into the page item's single location field
          location: "Celebration Church, 7544 Argyll Road",
          description: "Doors open half an hour early.",
        },
        {
          time: "1:00 PM – 6:00 PM",
          title: "Reception",
          location: "Convention Centre",
        },
      ],
    });
  });

  it("location handles venue-only, address-only, and neither", () => {
    const entries = [
      { id: "a", label: "Venue Only", startAt: "2026-08-22T16:00:00Z", venue: "The Hall", isAccessPassGated: false },
      { id: "b", label: "Address Only", startAt: "2026-08-22T17:00:00Z", address: "12 Side St", isAccessPassGated: false },
      { id: "c", label: "Neither", startAt: "2026-08-22T18:00:00Z", isAccessPassGated: false },
    ];
    const result = deriveScheduleSectionData(entries, TZ);
    expect(result?.items.map((i) => i.location)).toEqual([
      "The Hall",
      "12 Side St",
      undefined,
    ]);
  });

  it("sorts as instants, not ISO strings (mixed precision)", () => {
    const entries = [
      { id: "a", label: "Later", startAt: "2026-08-22T16:00:00.500Z", isAccessPassGated: false },
      { id: "b", label: "Earlier", startAt: "2026-08-22T16:00:00Z", isAccessPassGated: false },
    ];
    const result = deriveScheduleSectionData(entries, TZ);
    expect(result?.items.map((i) => i.title)).toEqual(["Earlier", "Later"]);
  });

  it("multi-day: weekday/date groups plus day-prefixed flat items", () => {
    const result = deriveScheduleSectionData(multiDay, TZ);
    expect(result?.groups).toEqual([
      {
        label: "Saturday",
        date: "August 22, 2026",
        items: [
          expect.objectContaining({ time: "10:00 AM", title: "Ceremony" }),
          expect.objectContaining({ time: "1:00 PM – 6:00 PM", title: "Reception" }),
        ],
      },
      {
        label: "Sunday",
        date: "August 23, 2026",
        items: [expect.objectContaining({ time: "11:00 AM", title: "Farewell Brunch" })],
      },
    ]);
    // Flat list carries the day (and drops end times) for flat-only
    // renderers — "MMM d" not weekday, so twice-occurring weekdays stay
    // unambiguous.
    expect(result?.items.map((i) => i.time)).toEqual([
      "Aug 22 · 10:00 AM",
      "Aug 22 · 1:00 PM",
      "Aug 23 · 11:00 AM",
    ]);
  });

  it("falls back to flat-only when derivation would exceed the group caps", () => {
    // 7 venue days — one past the schema's 6-group cap the group-aware
    // renderers were built under.
    const week = Array.from({ length: 7 }, (_, i) => ({
      id: `d${i}`,
      label: `Day ${i + 1} Event`,
      startAt: `2026-08-${String(17 + i).padStart(2, "0")}T16:00:00.000Z`,
      isAccessPassGated: false,
    }));
    const result = deriveScheduleSectionData(week, TZ);
    expect(result?.groups).toBeUndefined();
    expect(result?.items).toHaveLength(7);
    expect(result?.items[0].time).toBe("Aug 17 · 10:00 AM");

    // 2 days with 11 entries on one of them — over the 10-items-per-group cap.
    const crowded = [
      ...Array.from({ length: 11 }, (_, i) => ({
        id: `c${i}`,
        label: `Session ${i + 1}`,
        startAt: `2026-08-22T${String(10 + i).padStart(2, "0")}:00:00.000Z`,
        isAccessPassGated: false,
      })),
      {
        id: "next-day",
        label: "Wrap-up",
        startAt: "2026-08-23T17:00:00.000Z",
        isAccessPassGated: false,
      },
    ];
    const crowdedResult = deriveScheduleSectionData(crowded, TZ);
    expect(crowdedResult?.groups).toBeUndefined();
    expect(crowdedResult?.items).toHaveLength(12);
  });

  it("splits days on the venue's midnight, not UTC", () => {
    const entries = [
      { id: "a", label: "Late Night", startAt: "2026-08-23T03:00:00Z", isAccessPassGated: false }, // Aug 22, 9 PM local
      { id: "b", label: "After Midnight", startAt: "2026-08-23T07:00:00Z", isAccessPassGated: false }, // Aug 23, 1 AM local
    ];
    const result = deriveScheduleSectionData(entries, TZ);
    expect(result?.groups?.map((g) => g.date)).toEqual([
      "August 22, 2026",
      "August 23, 2026",
    ]);
  });
});

describe("applyTypedScheduleToSections", () => {
  const scheduleSection: Section = {
    type: "schedule",
    enabled: true,
    nav: {},
    data: {
      heading: "Wedding Weekend",
      description: "Our plan",
      items: [{ time: "9:00 AM", title: "Hand-typed item" }],
      groups: [
        { label: "Old Day", date: "Friday, Dec 13", items: [{ time: "1 PM", title: "Old" }] },
      ],
    },
  };
  const otherSection = {
    type: "faq",
    enabled: true,
    nav: {},
    data: { items: [] },
  } as unknown as Section;

  it("replaces items/groups on the schedule section, preserving display copy", () => {
    const result = applyTypedScheduleToSections(
      [scheduleSection, otherSection],
      singleDay,
      TZ
    );
    const schedule = result[0] as typeof scheduleSection;
    expect(schedule.data.heading).toBe("Wedding Weekend");
    expect(schedule.data.description).toBe("Our plan");
    expect(schedule.data.items.map((i) => i.title)).toEqual([
      "Ceremony",
      "Reception",
    ]);
    // Single-day derivation removes stale legacy groups entirely
    expect(schedule.data.groups).toBeUndefined();
    expect(result[1]).toBe(otherSection);
  });

  it("empties the section when there is no typed schedule — stored free-text never resurrects", () => {
    for (const schedule of [null, [{ bad: 1 }], []]) {
      const result = applyTypedScheduleToSections(
        [scheduleSection, otherSection],
        schedule,
        TZ
      );
      const section = result[0] as typeof scheduleSection;
      // Display copy survives; hand-typed rows do not.
      expect(section.data.heading).toBe("Wedding Weekend");
      expect(section.data.items).toEqual([]);
      expect(section.data.groups).toBeUndefined();
      expect(result[1]).toBe(otherSection);
    }
  });
});
