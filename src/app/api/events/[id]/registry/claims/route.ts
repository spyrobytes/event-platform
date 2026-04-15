import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { hashToken } from "@/lib/tokens";
import { createClaimSchema } from "@/schemas/registry-claim";
import { validateAndMigrate } from "@/lib/config-migrations";
import {
  findClaimableItem,
  runWithSerializableRetry,
} from "@/lib/registry-claims";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/events/[id]/registry/claims
 * Guest claims a registry item. Follows the RSVP endpoint's token-in-body
 * pattern. Succeeds if the guest's share doesn't push total claimed past
 * item.quantity. Upserts on (eventId, itemId, inviteId) so repeated calls
 * by the same guest update their row rather than creating duplicates.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const body = await request.json();
    const { inviteToken, itemId, quantity } = createClaimSchema.parse(body);

    const tokenHash = hashToken(inviteToken);
    const invite = await db.invite.findUnique({
      where: { tokenHash },
      select: { id: true, eventId: true, status: true, expiresAt: true },
    });

    if (!invite || invite.eventId !== eventId) {
      throw new NotFoundError("Invite not found for this event");
    }
    if (invite.status === "REVOKED") {
      throw new ValidationError("This invitation is no longer valid");
    }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new ValidationError("This invitation has expired");
    }

    // Resolve the item from the event's current page config. Items live in
    // JSON so there's no FK — we validate by re-reading the config each call.
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { pageConfig: true },
    });
    if (!event?.pageConfig) {
      throw new NotFoundError("Registry not configured for this event");
    }
    const config = validateAndMigrate(event.pageConfig);
    const item = findClaimableItem(config, itemId);
    if (!item) {
      throw new NotFoundError("Registry item not found or not claimable");
    }

    const itemQuantity = item.quantity ?? 1;

    // Serializable transaction prevents two guests from both succeeding when
    // their combined claims would exceed item.quantity. The unique constraint
    // on (eventId, itemId, inviteId) makes this guest's row unique.
    const claim = await runWithSerializableRetry(() =>
      db.$transaction(
        async (tx) => {
          const existingClaims = await tx.registryClaim.findMany({
            where: { eventId, itemId, source: "GUEST" },
            select: { id: true, inviteId: true, quantity: true },
          });

          const mine = existingClaims.find((c) => c.inviteId === invite.id);
          const othersTotal = existingClaims
            .filter((c) => c.inviteId !== invite.id)
            .reduce((sum, c) => sum + c.quantity, 0);

          if (othersTotal + quantity > itemQuantity) {
            throw new ValidationError(
              `Only ${itemQuantity - othersTotal} left to claim`
            );
          }

          if (mine) {
            return tx.registryClaim.update({
              where: { id: mine.id },
              data: { quantity },
            });
          }
          return tx.registryClaim.create({
            data: {
              eventId,
              itemId,
              inviteId: invite.id,
              source: "GUEST",
              quantity,
            },
          });
        },
        { isolationLevel: "Serializable" }
      )
    );

    return successResponse(
      {
        claim: {
          id: claim.id,
          itemId: claim.itemId,
          quantity: claim.quantity,
          claimedAt: claim.claimedAt,
        },
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
