import { z } from "zod";

const additionalGuestNamesField = z
  .array(
    z
      .string()
      .trim()
      .min(1, "Guest name is required")
      .max(200, "Name must be less than 200 characters")
  )
  .optional()
  .default([]);

/**
 * Factory for the submit-RSVP schema.
 * Pass `{ emailRequired: true }` when the invite has no email on file
 * (phone-only invite) so the guest must provide one at RSVP time.
 */
export function buildSubmitRsvpSchema({
  emailRequired = false,
}: { emailRequired?: boolean } = {}) {
  const emailField = emailRequired
    ? z
        .string({ message: "Email is required" })
        .trim()
        .min(1, "Email is required")
        .email("Invalid email address")
    : z
        .string()
        .transform((v) => (v === "" ? undefined : v))
        .pipe(z.string().email("Invalid email address").optional());

  return z
    .object({
      token: z.string().min(1, "Invite token is required").optional(),
      response: z.enum(["YES", "NO", "MAYBE"], {
        message: "Please select a response",
      }),
      guestName: z
        .string()
        .min(1, "Name is required")
        .max(200, "Name must be less than 200 characters"),
      guestEmail: emailField,
      guestCount: z.number().int().min(1).max(11).optional().default(1),
      additionalGuestNames: additionalGuestNamesField,
      dietaryRestrictions: z
        .string()
        .max(500, "Dietary restrictions must be less than 500 characters")
        .optional(),
      notes: z
        .string()
        .max(1000, "Notes must be less than 1000 characters")
        .optional(),
      messageToHost: z
        .string()
        .max(1000, "Message must be less than 1000 characters")
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.response === "YES" && data.guestCount > 1) {
        const expected = data.guestCount - 1;
        const provided = data.additionalGuestNames.length;
        if (provided !== expected) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Please provide names for all ${expected} additional guest${expected > 1 ? "s" : ""}`,
            path: ["additionalGuestNames"],
          });
        }
      }
    });
}

/**
 * Default submit-RSVP schema — email optional.
 * Kept as the default export so existing callers (e.g. the API route that
 * may not yet know whether the invite is phone-only) continue to validate
 * against the permissive shape, with the phone-only email check layered on
 * afterwards.
 */
export const submitRsvpSchema = buildSubmitRsvpSchema();

export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;

/**
 * Schema for public RSVP (without invite token - for public events)
 */
export const publicRsvpSchema = z
  .object({
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
    additionalGuestNames: additionalGuestNamesField,
    dietaryRestrictions: z
      .string()
      .max(500, "Dietary restrictions must be less than 500 characters")
      .optional(),
    notes: z
      .string()
      .max(1000, "Notes must be less than 1000 characters")
      .optional(),
    messageToHost: z
      .string()
      .max(1000, "Message must be less than 1000 characters")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.response === "YES" && data.guestCount > 1) {
      const expected = data.guestCount - 1;
      const provided = data.additionalGuestNames.length;
      if (provided !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please provide names for all ${expected} additional guest${expected > 1 ? "s" : ""}`,
          path: ["additionalGuestNames"],
        });
      }
    }
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
