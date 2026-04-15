import { z } from "zod";

/**
 * Guest submits a claim on a registry item. Mirrors the RSVP endpoint's
 * token-in-body pattern (see src/app/api/rsvp/route.ts). `itemId` is the
 * uuid on the registry item in page config, not a Prisma cuid.
 */
export const createClaimSchema = z.object({
  inviteToken: z.string().min(1, "Invite token is required"),
  itemId: z.string().min(1, "Item id is required"),
  quantity: z.number().int().min(1).max(99).default(1),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;

/**
 * Guest-side unclaim. The token proves ownership; the claim id identifies
 * the row. Server cross-checks that the token's invite matches the claim's
 * invite before deleting.
 */
export const deleteClaimSchema = z.object({
  inviteToken: z.string().min(1, "Invite token is required"),
});

export type DeleteClaimInput = z.infer<typeof deleteClaimSchema>;
