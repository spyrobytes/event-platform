import { describe, it, expect } from "vitest";
import {
  buildSubEventBlocks,
  type InviteSubEventConfig,
} from "@/lib/invite-email-payload";

const TZ = "America/Edmonton"; // UTC-6 in summer

const base = {
  tz: TZ,
  eventStartAt: new Date("2026-08-22T15:00:00Z"), // 9:00 AM local
  eventDate: "Saturday, August 22, 2026",
  eventTime: "9:00 AM",
  eventVenueName: "Main Venue",
  eventAddress: "1 Main St",
  schedule: null as unknown,
  invitationConfig: null as InviteSubEventConfig | null,
};

const emptyConfig: InviteSubEventConfig = {
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

describe("buildSubEventBlocks", () => {
  it("returns nothing when no sub-event data exists anywhere", () => {
    expect(buildSubEventBlocks(base)).toEqual({});
    expect(
      buildSubEventBlocks({ ...base, invitationConfig: emptyConfig })
    ).toEqual({});
  });

  it("legacy-only: free-text wording wins over reformatting StartAt (unchanged behavior)", () => {
    const result = buildSubEventBlocks({
      ...base,
      invitationConfig: {
        ...emptyConfig,
        ceremonyStartAt: new Date("2026-08-22T16:00:00Z"),
        ceremonyDate: "Saturday, the Twenty-Second of August",
        ceremonyTime: null,
        ceremonyVenue: "Legacy Chapel",
      },
    });
    expect(result.ceremonyDate).toBe("Saturday, the Twenty-Second of August");
    expect(result.ceremonyTime).toBe("10:00 AM"); // reformat of StartAt
    expect(result.ceremonyVenue).toBe("Legacy Chapel");
  });

  it("typed-only: blocks derive from schedule entries in venue timezone", () => {
    const result = buildSubEventBlocks({ ...base, schedule: typedSchedule });
    expect(result).toEqual({
      ceremonyDate: "Saturday, August 22, 2026",
      ceremonyTime: "10:00 AM",
      ceremonyVenue: "Celebration Church",
      ceremonyAddress: "7544 Argyll Road",
      // main event (9:00) precedes typed ceremony (10:00) by 1h → Traditional
      traditionalDate: base.eventDate,
      traditionalTime: base.eventTime,
      traditionalVenue: "Main Venue",
      traditionalAddress: "1 Main St",
      receptionDate: "Saturday, August 22, 2026",
      receptionTime: "1:00 PM",
      receptionVenue: "Convention Centre",
    });
  });

  it("typed wins over a disagreeing legacy StartAt; free-text wording still overrides", () => {
    const result = buildSubEventBlocks({
      ...base,
      schedule: typedSchedule,
      invitationConfig: {
        ...emptyConfig,
        ceremonyStartAt: new Date("2026-08-22T14:00:00Z"), // legacy says 8:00 AM
        ceremonyDate: "Saturday, the Twenty-Second of August", // wording override
        receptionStartAt: new Date("2026-08-22T22:00:00Z"), // legacy says 4:00 PM
        receptionVenue: "Old Hall",
      },
    });
    // wording override beats everything for the date string
    expect(result.ceremonyDate).toBe("Saturday, the Twenty-Second of August");
    // no time wording → typed entry (10:00), NOT legacy StartAt (8:00)
    expect(result.ceremonyTime).toBe("10:00 AM");
    // typed venue beats legacy venue
    expect(result.receptionVenue).toBe("Convention Centre");
    expect(result.receptionTime).toBe("1:00 PM"); // typed, not legacy 4:00 PM
  });

  it("suppresses Traditional when the main event is within the lead threshold", () => {
    const result = buildSubEventBlocks({
      ...base,
      eventStartAt: new Date("2026-08-22T15:45:00Z"), // 15 min before ceremony
      schedule: typedSchedule,
    });
    expect(result.traditionalDate).toBeUndefined();
  });

  it("anchors Traditional on the typed reception when there is no ceremony entry", () => {
    const receptionOnly = [typedSchedule[1]];
    const result = buildSubEventBlocks({
      ...base, // main event 9:00, reception 1:00 PM → distinct
      schedule: receptionOnly,
    });
    expect(result.traditionalDate).toBe(base.eventDate);
    expect(result.ceremonyDate).toBeUndefined();
  });

  it("formal wording style spells out derived rungs; free-text stays verbatim", () => {
    const result = buildSubEventBlocks({
      ...base,
      schedule: typedSchedule,
      wordingStyle: "formal",
      invitationConfig: {
        ...emptyConfig,
        ceremonyDate: "The Longest Day of Summer", // verbatim override
      },
    });
    expect(result.ceremonyDate).toBe("The Longest Day of Summer");
    expect(result.ceremonyTime).toBe("Ten O'Clock in the Morning");
    expect(result.receptionDate).toBe("Saturday, the Twenty-Second of August");
    expect(result.receptionTime).toBe("One O'Clock in the Afternoon");
    // venue text unaffected by wording style
    expect(result.receptionVenue).toBe("Convention Centre");
  });

  it("malformed schedule degrades to legacy-only behavior", () => {
    const result = buildSubEventBlocks({
      ...base,
      schedule: [{ nonsense: true }],
      invitationConfig: {
        ...emptyConfig,
        receptionStartAt: new Date("2026-08-22T22:00:00Z"),
        receptionVenue: "Old Hall",
      },
    });
    expect(result.receptionTime).toBe("4:00 PM");
    expect(result.receptionVenue).toBe("Old Hall");
  });
});
