import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { manualWishSchema } from "@/schemas/manual-wish";

type RouteContext = {
  params: Promise<{ id: string; wishId: string }>;
};

/** Loads the wish and enforces that it belongs to the route's event. */
async function findOwnedWish(eventId: string, wishId: string) {
  const wish = await db.manualWish.findUnique({
    where: { id: wishId },
    select: { id: true, eventId: true },
  });
  if (!wish || wish.eventId !== eventId) {
    throw new NotFoundError("Wish not found");
  }
  return wish;
}

/**
 * PATCH /api/events/[id]/wishes/manual/[wishId]
 * Organizer edits a manually added wish (author and/or message).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const { id: eventId, wishId } = await context.params;
    await requireEventOwner(eventId, user.id);

    const body = await request.json();
    const data = manualWishSchema.parse(body);

    await findOwnedWish(eventId, wishId);

    const wish = await db.manualWish.update({
      where: { id: wishId },
      data: {
        authorName: data.authorName,
        message: data.message,
      },
      select: {
        id: true,
        authorName: true,
        message: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse({ wish });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/events/[id]/wishes/manual/[wishId]
 * Organizer removes a manually added wish. Manual wishes have no HIDDEN
 * state — the organizer owns the content, so delete is the whole story.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const { id: eventId, wishId } = await context.params;
    await requireEventOwner(eventId, user.id);

    await findOwnedWish(eventId, wishId);
    await db.manualWish.delete({ where: { id: wishId } });

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
