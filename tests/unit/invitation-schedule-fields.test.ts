import { describe, it, expect } from "vitest";
import { buildInvitationScheduleFields } from "@/lib/invitation-schedule-fields";

const TZ = "America/Edmonton"; // UTC-6 in summer

const base = {
  tz: TZ,
  schedule: null as unknown,
};

const typedSchedule = [
  {
    id: "e1",
    label: "Ceremony",
    role: "ceremony",
    startAt: "2026-08-22T16:00:00.000Z", // 10:00 AM local
    venue: "Celebration Church",
    address: "7544 Argyll Road",
    isAccessPassGated: false,
  },
  {
    id: "e2",
    label: "Reception",
    role: "reception",
    startAt: "2026-08-22T19:00:00.000Z", // 1:00 PM local
    venue: "Convention Centre",
    isAccessPassGated: false,
  },
];

describe("buildInvitationScheduleFields", () => {
  it("returns all-undefined with no typed schedule (card keeps its generic block)", () => {
    const result = buildInvitationScheduleFields(base);
    expect(result.ceremonyDate).toBeUndefined();
    expect(result.ceremonyVenue).toBeUndefined();
    expect(result.receptionDate).toBeUndefined();
    expect(result.receptionVenue).toBeUndefined();
  });

  it("fields derive from schedule entries in venue timezone", () => {
    const result = buildInvitationScheduleFields({
      ...base,
      schedule: typedSchedule,
    });
    expect(result).toEqual({
      ceremonyDate: "Saturday, August 22, 2026",
      ceremonyTime: "10:00 AM",
      ceremonyVenue: "Celebration Church",
      ceremonyAddress: "7544 Argyll Road",
      receptionDate: "Saturday, August 22, 2026",
      receptionTime: "1:00 PM",
      receptionVenue: "Convention Centre",
      receptionAddress: undefined,
    });
  });

  it("formal wording style applies to typed-derived strings", () => {
    const result = buildInvitationScheduleFields({
      ...base,
      schedule: typedSchedule,
      wordingStyle: "formal",
    });
    expect(result.ceremonyDate).toBe("Saturday, the Twenty-Second of August");
    expect(result.ceremonyTime).toBe("Ten O'Clock in the Morning");
    expect(result.receptionTime).toBe("One O'Clock in the Afternoon");
    // venue text is unaffected by wording style
    expect(result.ceremonyVenue).toBe("Celebration Church");
  });

  it("a role without an entry yields undefined fields for that block only", () => {
    const result = buildInvitationScheduleFields({
      ...base,
      schedule: [typedSchedule[0]],
    });
    expect(result.ceremonyDate).toBe("Saturday, August 22, 2026");
    expect(result.receptionDate).toBeUndefined();
    expect(result.receptionVenue).toBeUndefined();
  });

  it("malformed schedule renders nothing (no free-text rung to fall back to)", () => {
    const result = buildInvitationScheduleFields({
      ...base,
      schedule: [{ nonsense: true }],
    });
    expect(result.ceremonyDate).toBeUndefined();
    expect(result.ceremonyVenue).toBeUndefined();
    expect(result.receptionDate).toBeUndefined();
  });
});
