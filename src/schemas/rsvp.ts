import { z } from "zod";

/**
 * Schema for submitting an RSVP
 */
export const submitRsvpSchema = z.object({
  token: z.string().min(1, "Invite token is required").optional(),
  response: z.enum(["YES", "NO", "MAYBE"], {
    message: "Please select a response",
  }),
  guestName: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters"),
  guestEmail: z.string().email("Invalid email address").optional(),
  guestCount: z.number().int().min(1).max(11).optional().default(1),
  dietaryRestrictions: z.string().max(500, "Dietary restrictions must be less than 500 characters").optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;

/**
 * Schema for public RSVP (without invite token - for public events)
 */
export const publicRsvpSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  response: z.enum(["YES", "NO", "MAYBE"], {
    message: "Please select a response",
  }),
  guestName: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters"),
  guestEmail: z.string().email("Invalid email address"),
  guestCount: z.number().int().min(1).max(5).optional().default(1),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

export type PublicRsvpInput = z.infer<typeof publicRsvpSchema>;

/**
 * Schema for RSVP query parameters
 */
export const rsvpQuerySchema = z.object({
  response: z.enum(["YES", "NO", "MAYBE"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type RsvpQueryInput = z.infer<typeof rsvpQuerySchema>;
