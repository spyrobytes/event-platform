import { describe, it, expect } from "vitest";
import { createEventSchema, updateEventSchema } from "@/schemas/event";
import { createInviteSchema, bulkInviteSchema } from "@/schemas/invite";
import { submitRsvpSchema, publicRsvpSchema } from "@/schemas/rsvp";

// Helper to get a future date
const getFutureDate = () => new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

describe("createEventSchema", () => {
  it("validates a valid event", () => {
    const validEvent = {
      title: "Test Event",
      startAt: getFutureDate(),
      timezone: "America/New_York",
    };
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("requires a title", () => {
    const invalidEvent = {
      startAt: getFutureDate(),
      timezone: "UTC",
    };
    const result = createEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it("requires a start date", () => {
    const invalidEvent = {
      title: "Test Event",
      timezone: "UTC",
    };
    const result = createEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it("validates visibility options", () => {
    const validEvent = {
      title: "Test Event",
      startAt: getFutureDate(),
      timezone: "UTC",
      visibility: "PRIVATE",
    };
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("rejects invalid visibility", () => {
    const invalidEvent = {
      title: "Test Event",
      startAt: getFutureDate(),
      timezone: "UTC",
      visibility: "INVALID",
    };
    const result = createEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it("validates optional fields", () => {
    const validEvent = {
      title: "Test Event",
      startAt: getFutureDate(),
      timezone: "UTC",
      description: "A test event description",
      venueName: "Test Venue",
      city: "Test City",
      maxAttendees: 100,
    };
    const result = createEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("rejects start dates in the past", () => {
    const pastEvent = {
      title: "Test Event",
      startAt: new Date("2020-01-01").toISOString(),
      timezone: "UTC",
    };
    const result = createEventSchema.safeParse(pastEvent);
    expect(result.success).toBe(false);
  });
});

describe("updateEventSchema", () => {
  it("allows partial updates", () => {
    const partialUpdate = {
      title: "Updated Title",
    };
    const result = updateEventSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  it("validates fields when provided", () => {
    const invalidUpdate = {
      maxAttendees: -5,
    };
    const result = updateEventSchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
  });
});

describe("createInviteSchema", () => {
  it("validates a valid invite", () => {
    const validInvite = {
      email: "test@example.com",
    };
    const result = createInviteSchema.safeParse(validInvite);
    expect(result.success).toBe(true);
  });

  it("requires a valid email", () => {
    const invalidInvite = {
      email: "not-an-email",
    };
    const result = createInviteSchema.safeParse(invalidInvite);
    expect(result.success).toBe(false);
  });

  it("validates optional name", () => {
    const validInvite = {
      email: "test@example.com",
      name: "John Doe",
    };
    const result = createInviteSchema.safeParse(validInvite);
    expect(result.success).toBe(true);
  });

  it("validates plusOnesAllowed range", () => {
    const invalidInvite = {
      email: "test@example.com",
      plusOnesAllowed: 20, // Max is 10
    };
    const result = createInviteSchema.safeParse(invalidInvite);
    expect(result.success).toBe(false);
  });
});

describe("bulkInviteSchema", () => {
  it("validates multiple invites", () => {
    const validBulk = {
      invites: [
        { email: "test1@example.com" },
        { email: "test2@example.com" },
      ],
    };
    const result = bulkInviteSchema.safeParse(validBulk);
    expect(result.success).toBe(true);
  });

  it("requires at least one invite", () => {
    const invalidBulk = {
      invites: [],
    };
    const result = bulkInviteSchema.safeParse(invalidBulk);
    expect(result.success).toBe(false);
  });

  it("limits to 100 invites", () => {
    const tooManyInvites = {
      invites: Array.from({ length: 101 }, (_, i) => ({
        email: `test${i}@example.com`,
      })),
    };
    const result = bulkInviteSchema.safeParse(tooManyInvites);
    expect(result.success).toBe(false);
  });
});

describe("submitRsvpSchema", () => {
  it("validates a valid RSVP", () => {
    const validRsvp = {
      response: "YES",
      guestName: "John Doe",
    };
    const result = submitRsvpSchema.safeParse(validRsvp);
    expect(result.success).toBe(true);
  });

  it("requires a response", () => {
    const invalidRsvp = {
      guestName: "John Doe",
    };
    const result = submitRsvpSchema.safeParse(invalidRsvp);
    expect(result.success).toBe(false);
  });

  it("validates response options", () => {
    const validResponses = ["YES", "NO", "MAYBE"];
    for (const response of validResponses) {
      const result = submitRsvpSchema.safeParse({
        response,
        guestName: "John Doe",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid response", () => {
    const invalidRsvp = {
      response: "INVALID",
      guestName: "John Doe",
    };
    const result = submitRsvpSchema.safeParse(invalidRsvp);
    expect(result.success).toBe(false);
  });

  it("requires guest name", () => {
    const invalidRsvp = {
      response: "YES",
    };
    const result = submitRsvpSchema.safeParse(invalidRsvp);
    expect(result.success).toBe(false);
  });

  it("validates optional guest count", () => {
    const validRsvp = {
      response: "YES",
      guestName: "John Doe",
      guestCount: 3,
    };
    const result = submitRsvpSchema.safeParse(validRsvp);
    expect(result.success).toBe(true);
  });
});

describe("publicRsvpSchema", () => {
  it("requires eventId for public RSVPs", () => {
    const validPublicRsvp = {
      eventId: "event-123",
      response: "YES",
      guestName: "John Doe",
      guestEmail: "john@example.com",
    };
    const result = publicRsvpSchema.safeParse(validPublicRsvp);
    expect(result.success).toBe(true);
  });

  it("requires guest email for public RSVPs", () => {
    const invalidPublicRsvp = {
      eventId: "event-123",
      response: "YES",
      guestName: "John Doe",
    };
    const result = publicRsvpSchema.safeParse(invalidPublicRsvp);
    expect(result.success).toBe(false);
  });
});
