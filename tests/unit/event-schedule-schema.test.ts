import { describe, it, expect } from "vitest";
import {
  scheduleSchema,
  scheduleEntrySchema,
  SCHEDULE_ENTRY_ROLES,
  updateEventSchema,
} from "@/schemas/event";

const ceremony = {
  id: "entry-1",
  label: "Ceremony",
  role: "ceremony",
  startAt: "2026-09-19T15:00:00.000Z",
  endAt: "2026-09-19T17:00:00.000Z",
  venue: "St. Mary's Chapel",
  address: "12 Chapel Lane, Dublin",
};

const reception = {
  id: "entry-2",
  label: "Reception",
  role: "reception",
  startAt: "2026-09-19T20:00:00.000Z",
  endAt: "2026-09-20T03:00:00.000Z",
  venue: "The Grand Hall",
  address: null,
  isAccessPassGated: true,
};

describe("scheduleEntrySchema", () => {
  it("accepts a full entry and defaults isAccessPassGated to false", () => {
    const parsed = scheduleEntrySchema.parse(ceremony);
    expect(parsed.isAccessPassGated).toBe(false);
    expect(parsed.role).toBe("ceremony");
  });

  it("accepts a minimal entry (id, label, startAt only)", () => {
    const parsed = scheduleEntrySchema.parse({
      id: "x",
      label: "Welcome Drinks",
      startAt: "2026-09-18T18:00:00.000Z",
    });
    expect(parsed.endAt).toBeUndefined();
    expect(parsed.role).toBeUndefined();
  });

  it("rejects non-ISO datetimes and non-UTC offsets", () => {
    expect(
      scheduleEntrySchema.safeParse({ ...ceremony, startAt: "4:00 PM" }).success
    ).toBe(false);
    expect(
      scheduleEntrySchema.safeParse({
        ...ceremony,
        startAt: "2026-09-19T15:00:00+02:00",
      }).success
    ).toBe(false);
  });

  it("rejects endAt before startAt", () => {
    const result = scheduleEntrySchema.safeParse({
      ...ceremony,
      endAt: "2026-09-19T14:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown roles (the enum is the semantic contract)", () => {
    expect(
      scheduleEntrySchema.safeParse({ ...ceremony, role: "flashmob" }).success
    ).toBe(false);
    // Every documented role parses
    for (const role of SCHEDULE_ENTRY_ROLES) {
      expect(scheduleEntrySchema.safeParse({ ...ceremony, role }).success).toBe(
        true
      );
    }
  });
});

describe("scheduleSchema", () => {
  it("accepts a multi-entry day", () => {
    expect(scheduleSchema.safeParse([ceremony, reception]).success).toBe(true);
  });

  it("rejects duplicate entry ids", () => {
    const result = scheduleSchema.safeParse([
      ceremony,
      { ...reception, id: ceremony.id },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 entries", () => {
    const entries = Array.from({ length: 21 }, (_, i) => ({
      ...ceremony,
      id: `entry-${i}`,
    }));
    expect(scheduleSchema.safeParse(entries).success).toBe(false);
  });
});

describe("updateEventSchema.schedule", () => {
  it("accepts a schedule array, null (clear), and absence", () => {
    expect(
      updateEventSchema.safeParse({ schedule: [ceremony] }).success
    ).toBe(true);
    expect(updateEventSchema.safeParse({ schedule: null }).success).toBe(true);
    expect(updateEventSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a malformed schedule", () => {
    expect(
      updateEventSchema.safeParse({ schedule: [{ label: "No id or start" }] })
        .success
    ).toBe(false);
  });
});
