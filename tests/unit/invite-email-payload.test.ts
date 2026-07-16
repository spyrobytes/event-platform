import { describe, it, expect } from "vitest";
import { buildSubEventBlocks } from "@/lib/invite-email-payload";

const TZ = "America/Edmonton"; // UTC-6 in summer

const base = {
  tz: TZ,
  eventStartAt: new Date("2026-08-22T15:00:00Z"), // 9:00 AM local
  eventVenueName: "Main Venue",
  eventAddress: "1 Main St",
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

describe("buildSubEventBlocks", () => {
  it("returns nothing when no typed schedule exists", () => {
    expect(buildSubEventBlocks(base)).toEqual({});
  });

  it("blocks derive from schedule entries in venue timezone", () => {
    const result = buildSubEventBlocks({ ...base, schedule: typedSchedule });
    expect(result).toEqual({
      ceremonyDate: "Saturday, August 22, 2026",
      ceremonyTime: "10:00 AM",
      ceremonyVenue: "Celebration Church",
      ceremonyAddress: "7544 Argyll Road",
      // main event (9:00) precedes typed ceremony (10:00) by 1h → Traditional
      traditionalDate: "Saturday, August 22, 2026",
      traditionalTime: "9:00 AM",
      traditionalVenue: "Main Venue",
      traditionalAddress: "1 Main St",
      receptionDate: "Saturday, August 22, 2026",
      receptionTime: "1:00 PM",
      receptionVenue: "Convention Centre",
    });
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
    expect(result.traditionalDate).toBe("Saturday, August 22, 2026");
    expect(result.ceremonyDate).toBeUndefined();
  });

  it("formal wording style spells out derived strings", () => {
    const result = buildSubEventBlocks({
      ...base,
      schedule: typedSchedule,
      wordingStyle: "formal",
    });
    expect(result.ceremonyDate).toBe("Saturday, the Twenty-Second of August");
    expect(result.ceremonyTime).toBe("Ten O'Clock in the Morning");
    expect(result.receptionDate).toBe("Saturday, the Twenty-Second of August");
    expect(result.receptionTime).toBe("One O'Clock in the Afternoon");
    // venue text unaffected by wording style
    expect(result.receptionVenue).toBe("Convention Centre");
    // the heuristic Traditional block (main event 9:00, distinct from the
    // 10:00 ceremony) must use the same formal formatters — a formal email
    // never mixes wording styles across blocks
    expect(result.traditionalDate).toBe("Saturday, the Twenty-Second of August");
    expect(result.traditionalTime).toBe("Nine O'Clock in the Morning");
  });

  it("an explicit traditional-role entry drives the Traditional block over the heuristic", () => {
    const withTraditional = [
      {
        id: "t1",
        label: "Traditional Ceremony",
        role: "traditional",
        startAt: "2026-08-20T18:00:00.000Z", // Thursday, 12:00 PM local
        venue: "10 Degrees Event Centre",
        address: "Oregun Road, Ikeja",
        isAccessPassGated: false,
      },
      ...typedSchedule,
    ];
    const result = buildSubEventBlocks({
      ...base,
      // Main event 30+ min before ceremony → the heuristic WOULD fire with
      // the main-event strings; the typed entry must win instead.
      eventStartAt: new Date("2026-08-22T15:00:00Z"),
      schedule: withTraditional,
    });
    expect(result.traditionalDate).toBe("Thursday, August 20, 2026");
    expect(result.traditionalTime).toBe("12:00 PM");
    expect(result.traditionalVenue).toBe("10 Degrees Event Centre");
    expect(result.traditionalAddress).toBe("Oregun Road, Ikeja");
  });

  it("formal wording applies to the traditional-role block too", () => {
    const withTraditional = [
      {
        id: "t1",
        label: "Traditional Ceremony",
        role: "traditional",
        startAt: "2026-08-20T18:00:00.000Z",
        isAccessPassGated: false,
      },
      ...typedSchedule,
    ];
    const result = buildSubEventBlocks({
      ...base,
      schedule: withTraditional,
      wordingStyle: "formal",
    });
    expect(result.traditionalDate).toBe("Thursday, the Twentieth of August");
    expect(result.traditionalTime).toBe("Noon");
  });

  it("malformed schedule renders no blocks (no legacy rung to fall back to)", () => {
    const result = buildSubEventBlocks({
      ...base,
      schedule: [{ nonsense: true }],
    });
    expect(result).toEqual({});
  });
});
