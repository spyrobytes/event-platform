import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/events/[id]/schedule/acknowledge
 * Clears the "schedule was auto-populated, please verify" banner: the
 * organizer has reviewed the backfill-derived entries. Idempotent.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);
    assertCanMutate(user);

    await db.event.update({
      where: { id },
      data: { scheduleAutoPopulatedAt: null },
      select: { id: true },
    });

    return successResponse({ acknowledged: true });
  } catch (error) {
    return handleApiError(error);
  }
}
