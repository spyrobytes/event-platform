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

    // Atomic eventId guard via the compound where — count=0 covers both
    // "belongs to another event" and "deleted concurrently", surfaced as
    // 404 instead of letting Prisma's P2025 bubble to a generic 500.
    const result = await db.manualWish.updateMany({
      where: { id: wishId, eventId },
      data: {
        authorName: data.authorName,
        message: data.message,
      },
    });
    if (result.count === 0) {
      throw new NotFoundError("Wish not found");
    }

    const wish = await db.manualWish.findUnique({
      where: { id: wishId },
      select: {
        id: true,
        authorName: true,
        message: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!wish) {
      // Deleted between the write above and this read.
      throw new NotFoundError("Wish not found");
    }

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

    // Same atomic guard as PATCH: a concurrent double-delete gets a clean
    // 404 on the second request, not a P2025-backed 500.
    const result = await db.manualWish.deleteMany({
      where: { id: wishId, eventId },
    });
    if (result.count === 0) {
      throw new NotFoundError("Wish not found");
    }

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
