import { describe, it, expect } from "vitest";
import {
  buildInvitationScheduleFields,
  type InvitationScheduleConfig,
} from "@/lib/invitation-schedule-fields";

const TZ = "America/Edmonton"; // UTC-6 in summer

const base = {
  tz: TZ,
  schedule: null as unknown,
  config: null as InvitationScheduleConfig | null,
};

const emptyConfig: InvitationScheduleConfig = {
  ceremonyStartAt: null,
  ceremonyDate: null,
  ceremonyTime: null,
  ceremonyVenue: null,
  ceremonyAddress: null,
  receptionStartAt: null,
  receptionDate: null,
  receptionTime: null,
  receptionVenue: null,
  receptionAddress: null,
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
  it("returns all-undefined with no data anywhere (card keeps its generic block)", () => {
    expect(buildInvitationScheduleFields(base).ceremonyDate).toBeUndefined();
    expect(
      buildInvitationScheduleFields({ ...base, config: emptyConfig })
        .receptionDate
    ).toBeUndefined();
  });

  it("typed-only: fields derive from schedule entries in venue timezone", () => {
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

  it("free-text wording overrides typed even in formal mode (verbatim rule)", () => {
    const result = buildInvitationScheduleFields({
      ...base,
      schedule: typedSchedule,
      wordingStyle: "formal",
      config: {
        ...emptyConfig,
        ceremonyDate: "The Longest Day of Summer",
      },
    });
    expect(result.ceremonyDate).toBe("The Longest Day of Summer");
    // no time wording saved → typed entry, formal style
    expect(result.ceremonyTime).toBe("Ten O'Clock in the Morning");
  });

  it("typed beats a disagreeing legacy StartAt; typed venue beats legacy venue", () => {
    const result = buildInvitationScheduleFields({
      ...base,
      schedule: typedSchedule,
      config: {
        ...emptyConfig,
        ceremonyStartAt: new Date("2026-08-22T14:00:00Z"), // legacy says 8:00 AM
        receptionVenue: "Old Hall",
      },
    });
    expect(result.ceremonyTime).toBe("10:00 AM");
    expect(result.receptionVenue).toBe("Convention Centre");
  });

  it("legacy-only: StartAt reformats, and formal style applies to that rung too", () => {
    const config = {
      ...emptyConfig,
      receptionStartAt: new Date("2026-08-22T22:00:00Z"), // 4:00 PM local
      receptionVenue: "Old Hall",
    };
    const standard = buildInvitationScheduleFields({ ...base, config });
    expect(standard.receptionDate).toBe("Saturday, August 22, 2026");
    expect(standard.receptionTime).toBe("4:00 PM");
    expect(standard.receptionVenue).toBe("Old Hall");

    const formal = buildInvitationScheduleFields({
      ...base,
      config,
      wordingStyle: "formal",
    });
    expect(formal.receptionTime).toBe("Four O'Clock in the Afternoon");
  });

  it("malformed schedule degrades to legacy-only behavior", () => {
    const result = buildInvitationScheduleFields({
      ...base,
      schedule: [{ nonsense: true }],
      config: {
        ...emptyConfig,
        ceremonyDate: "Saturday, the Twenty-Second of August",
        ceremonyVenue: "Legacy Chapel",
      },
    });
    expect(result.ceremonyDate).toBe("Saturday, the Twenty-Second of August");
    expect(result.ceremonyVenue).toBe("Legacy Chapel");
    expect(result.receptionDate).toBeUndefined();
  });
});
