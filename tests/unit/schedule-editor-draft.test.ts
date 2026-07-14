import { describe, it, expect } from "vitest";
import {
  toDraft,
  fromDraft,
} from "@/components/features/Schedule/ScheduleEditorPanel";
import { scheduleEntrySchema, type ScheduleEntry } from "@/schemas/event";

const TZ = "America/Edmonton";

const entry: ScheduleEntry = {
  id: "e1",
  label: "Ceremony",
  role: "ceremony",
  startAt: "2026-08-22T16:00:00.000Z", // 10:00 wall clock in Edmonton (MDT)
  endAt: "2026-08-22T18:00:00.000Z",
  venue: "Celebration Church",
  address: "7544 Argyll Road",
  description: "Doors at 9:30.",
  isAccessPassGated: false,
};

describe("schedule editor draft round-trip", () => {
  it("entry -> draft renders venue wall-clock, draft -> entry restores the instant", () => {
    const draft = toDraft(entry, TZ);
    expect(draft.startLocal).toBe("2026-08-22T10:00"); // venue wall clock
    expect(draft.endLocal).toBe("2026-08-22T12:00");

    const restored = fromDraft(draft, TZ);
    expect(restored).toEqual(entry);
    expect(scheduleEntrySchema.safeParse(restored).success).toBe(true);
  });

  it("optional fields survive the round-trip as absent/null", () => {
    const minimal: ScheduleEntry = {
      id: "e2",
      label: "Afterparty",
      startAt: "2026-08-23T05:00:00.000Z",
      venue: null,
      address: null,
      isAccessPassGated: true,
    };
    const restored = fromDraft(toDraft(minimal, TZ), TZ);
    expect(restored).toEqual(minimal);
    expect(restored.endAt).toBeUndefined();
    expect(restored.role).toBeUndefined();
    expect(restored.description).toBeUndefined();
  });

  it("whitespace-only venue/address normalize to null", () => {
    const draft = toDraft(entry, TZ);
    const restored = fromDraft(
      { ...draft, venue: "   ", address: "" },
      TZ
    );
    expect(restored.venue).toBeNull();
    expect(restored.address).toBeNull();
  });
});
