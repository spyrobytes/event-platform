import { z } from "zod";

/** E.164 phone format: + followed by 1–15 digits */
const e164Regex = /^\+[1-9]\d{1,14}$/;

/**
 * Schema for creating a single invite.
 * At least one of email or phone is required.
 */
export const createInviteSchema = z
  .object({
    email: z
      .string()
      .transform((v) => (v === "" ? undefined : v))
      .pipe(z.string().email("Invalid email address").optional()),
    phone: z
      .string()
      .transform((v) => (v === "" ? undefined : v))
      .pipe(
        z
          .string()
          .regex(e164Regex, "Phone must be E.164 format, e.g. +14155551234")
          .optional()
      ),
    name: z.string().max(200).optional(),
    plusOnesAllowed: z.number().int().min(0).max(10).optional().default(0),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((d) => !!d.email || !!d.phone, {
    message: "Please provide an email address or phone number",
    path: ["email"],
  });

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/**
 * Schema for bulk invite creation
 */
export const bulkInviteSchema = z.object({
  invites: z
    .array(createInviteSchema)
    .min(1, "At least one invite is required")
    .max(100, "Maximum 100 invites at once"),
  sendImmediately: z.boolean().default(false),
});

export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;

/**
 * Schema for invite query parameters
 */
export const inviteQuerySchema = z.object({
  status: z
    .enum(["PENDING", "DRAFTED", "SENT", "OPENED", "RESPONDED", "BOUNCED", "EXPIRED", "REVOKED"])
    .optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type InviteQueryInput = z.infer<typeof inviteQuerySchema>;

/**
 * Schema for invite lookup by token
 */
export const inviteLookupSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type InviteLookupInput = z.infer<typeof inviteLookupSchema>;

/**
 * Schema for PATCH /api/events/[id]/invites/[inviteId].
 * Strictly scoped to planning fields: unknown keys are rejected with a
 * validation error so the endpoint cannot be used to mutate email, name,
 * status, tokens, or any other field outside the planning panel's remit.
 * Partial update: `undefined` leaves a field unchanged; explicit `null` clears it.
 */
export const updateInvitePlanningSchema = z
  .object({
    seatAssignment: z
      .string()
      .max(500, "Seat assignment must be 500 characters or fewer")
      .nullable()
      .optional(),
    plannerNotes: z
      .string()
      .max(500, "Planner notes must be 500 characters or fewer")
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateInvitePlanningInput = z.infer<typeof updateInvitePlanningSchema>;
