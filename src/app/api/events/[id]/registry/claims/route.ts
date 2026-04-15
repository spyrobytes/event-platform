import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { verifyAuth } from "@/lib/auth";
import { verifyEventOwnership } from "@/lib/authorization";
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
 * GET /api/events/[id]/registry/claims
 * Organizer-only list of guest claims for the thank-you tracker. Resolves
 * item metadata from the current page config so the client can render rows
 * without a second fetch. Organizer-source rows are skipped — there's
 * nobody to thank for a self-toggled `purchased` flag.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401);

    const { id: eventId } = await context.params;
    const owns = await verifyEventOwnership(eventId, user.id);
    if (!owns) return errorResponse("Event not found or access denied", 404);

    const [event, claims] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: { pageConfig: true },
      }),
      db.registryClaim.findMany({
        where: { eventId, source: "GUEST" },
        orderBy: { claimedAt: "desc" },
        select: {
          id: true,
          itemId: true,
          quantity: true,
          claimedAt: true,
          thankYouSentAt: true,
          invite: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    // Build an itemId -> item metadata map from the current page config.
    // Claims can outlive the item they reference (e.g. organizer deletes an
    // item post-claim); we surface those as "Unknown item" rather than fail.
    const itemMeta = new Map<
      string,
      { name: string; category: string | null; amountLabel: string | null }
    >();
    if (event?.pageConfig) {
      try {
        const config = validateAndMigrate(event.pageConfig);
        for (const section of config.sections) {
          if (section.type !== "registry") continue;
          for (const item of section.data.items) {
            itemMeta.set(item.id, {
              name: item.name,
              category: item.category ?? null,
              amountLabel: item.amountLabel ?? null,
            });
          }
        }
      } catch {
        // Config invalid — leave the map empty; all rows will show "Unknown item"
      }
    }

    const rows = claims.map((c) => ({
      id: c.id,
      itemId: c.itemId,
      itemName: itemMeta.get(c.itemId)?.name ?? "Unknown item",
      itemCategory: itemMeta.get(c.itemId)?.category ?? null,
      itemAmountLabel: itemMeta.get(c.itemId)?.amountLabel ?? null,
      quantity: c.quantity,
      claimedAt: c.claimedAt,
      thankYouSentAt: c.thankYouSentAt,
      guestName: c.invite?.name ?? null,
      guestEmail: c.invite?.email ?? null,
    }));

    return successResponse({ claims: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

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
