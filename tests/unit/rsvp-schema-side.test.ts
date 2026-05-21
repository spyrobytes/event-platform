import { describe, it, expect } from "vitest";
import {
  buildSubmitRsvpSchema,
  publicPortalSubmitSchema,
  RSVP_SIDE_VALUES,
} from "@/schemas/rsvp";

const baseValid = {
  response: "YES" as const,
  guestName: "Ada Lovelace",
  guestCount: 1,
  additionalGuestNames: [],
};

describe("RSVP submit schemas — side field", () => {
  const schema = buildSubmitRsvpSchema();

  it.each(RSVP_SIDE_VALUES)(
    "buildSubmitRsvpSchema accepts side=%s",
    (side) => {
      const result = schema.safeParse({ ...baseValid, side });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe(side);
      }
    }
  );

  it("buildSubmitRsvpSchema treats omitted side as undefined", () => {
    const result = schema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.side).toBeUndefined();
    }
  });

  it("buildSubmitRsvpSchema rejects an unknown side value", () => {
    const result = schema.safeParse({
      ...baseValid,
      side: "OFFICIANTS_SIDE",
    });
    expect(result.success).toBe(false);
  });

  it("buildSubmitRsvpSchema rejects an empty string side", () => {
    const result = schema.safeParse({ ...baseValid, side: "" });
    expect(result.success).toBe(false);
  });

  it.each(RSVP_SIDE_VALUES)(
    "publicPortalSubmitSchema accepts side=%s",
    (side) => {
      const result = publicPortalSubmitSchema.safeParse({
        ...baseValid,
        side,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe(side);
      }
    }
  );

  it("publicPortalSubmitSchema treats omitted side as undefined", () => {
    const result = publicPortalSubmitSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.side).toBeUndefined();
    }
  });

  it("publicPortalSubmitSchema rejects an unknown side value", () => {
    const result = publicPortalSubmitSchema.safeParse({
      ...baseValid,
      side: "FRIENDS_SIDE",
    });
    expect(result.success).toBe(false);
  });
});
