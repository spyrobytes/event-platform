import { describe, it, expect } from "vitest";
import { deriveScheduleFromInvitationConfig } from "@/lib/schedule-backfill";
import { scheduleSchema } from "@/schemas/event";

const seqId = () => {
  let n = 0;
  return () => `id-${++n}`;
};

const fullConfig = {
  ceremonyStartAt: new Date("2026-09-19T15:00:00Z"),
  ceremonyVenue: "St. Mary's Chapel",
  ceremonyAddress: "12 Chapel Lane",
  receptionStartAt: new Date("2026-09-19T20:00:00Z"),
  receptionVenue: "The Grand Hall",
  receptionAddress: null,
};

describe("deriveScheduleFromInvitationConfig", () => {
  it("derives ceremony + reception with roles, instants, and venues", () => {
    const { entries, warnings } = deriveScheduleFromInvitationConfig(
      fullConfig,
      seqId()
    );
    expect(entries).toEqual([
      {
        id: "id-1",
        label: "Ceremony",
        role: "ceremony",
        startAt: "2026-09-19T15:00:00.000Z",
        venue: "St. Mary's Chapel",
        address: "12 Chapel Lane",
        isAccessPassGated: false,
      },
      {
        id: "id-2",
        label: "Reception",
        role: "reception",
        startAt: "2026-09-19T20:00:00.000Z",
        venue: "The Grand Hall",
        address: null,
        isAccessPassGated: false,
      },
    ]);
    expect(warnings).toEqual([]);
    // The backfill promise: everything it writes passes the API schema
    expect(scheduleSchema.safeParse(entries).success).toBe(true);
  });

  it("derives a single entry when only one timing exists", () => {
    const ceremonyOnly = deriveScheduleFromInvitationConfig(
      { ...fullConfig, receptionStartAt: null },
      seqId()
    );
    expect(ceremonyOnly.entries).toHaveLength(1);
    expect(ceremonyOnly.entries[0].role).toBe("ceremony");

    const receptionOnly = deriveScheduleFromInvitationConfig(
      { ...fullConfig, ceremonyStartAt: null },
      seqId()
    );
    expect(receptionOnly.entries).toHaveLength(1);
    expect(receptionOnly.entries[0].role).toBe("reception");
  });

  it("derives nothing when no typed timing exists", () => {
    const { entries, warnings } = deriveScheduleFromInvitationConfig(
      {
        ceremonyStartAt: null,
        ceremonyVenue: "Venue without a time",
        ceremonyAddress: null,
        receptionStartAt: null,
        receptionVenue: null,
        receptionAddress: null,
      },
      seqId()
    );
    expect(entries).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("warns (but still derives) when reception starts before ceremony", () => {
    const { entries, warnings } = deriveScheduleFromInvitationConfig(
      {
        ...fullConfig,
        receptionStartAt: new Date("2026-09-19T10:00:00Z"),
      },
      seqId()
    );
    expect(entries).toHaveLength(2);
    expect(warnings.some((w) => w.includes("reception starts before ceremony"))).toBe(
      true
    );
  });

  it("truncates over-cap venue/address to schema limits with a warning", () => {
    const { entries, warnings } = deriveScheduleFromInvitationConfig(
      {
        ...fullConfig,
        ceremonyVenue: "V".repeat(200),
        ceremonyAddress: "A".repeat(300),
      },
      seqId()
    );
    expect(entries[0].venue).toHaveLength(120);
    expect(entries[0].address).toHaveLength(200);
    expect(warnings.some((w) => w.includes("ceremonyVenue truncated"))).toBe(true);
    expect(warnings.some((w) => w.includes("ceremonyAddress truncated"))).toBe(true);
    expect(scheduleSchema.safeParse(entries).success).toBe(true);
  });

  it("generates unique ids by default (no injected maker)", () => {
    const { entries } = deriveScheduleFromInvitationConfig(fullConfig);
    expect(entries[0].id).not.toBe(entries[1].id);
    expect(entries[0].id.length).toBeGreaterThan(0);
  });
});
