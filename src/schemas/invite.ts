import { z } from "zod";

/**
 * Schema for creating a single invite
 */
export const createInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().max(200).optional(),
  plusOnesAllowed: z.number().int().min(0).max(10).optional().default(0),
  expiresAt: z.coerce.date().optional(),
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
    .enum(["PENDING", "SENT", "OPENED", "RESPONDED", "BOUNCED", "EXPIRED"])
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
