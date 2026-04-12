import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/db";
import { getFirebaseAdmin } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "UNDER_REVIEW", "SUSPENDED", "BANNED"]),
  reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/admin/organizers/[id]/status
 * Change an organizer's platform status. Disables/enables Firebase account for BANNED.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminOrRes = await requireAdmin(request);
    if (adminOrRes instanceof Response) return adminOrRes;

    const { id } = await context.params;
    const body = await request.json();
    const result = statusSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.issues[0].message, 400);
    }

    const targetUser = await db.user.findUnique({
      where: { id },
      select: { id: true, firebaseUid: true, isAdmin: true, status: true },
    });

    if (!targetUser) {
      return errorResponse("User not found", 404);
    }

    // Prevent admins from changing other admins' status
    if (targetUser.isAdmin) {
      return errorResponse("Cannot change status of an admin user", 403);
    }

    const { status, reason } = result.data;
    const previousStatus = targetUser.status;

    // Update status in Postgres (source of truth)
    const updated = await db.user.update({
      where: { id },
      data: {
        status,
        statusReason: reason || null,
        statusChangedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        statusReason: true,
        statusChangedAt: true,
      },
    });

    // Sync Firebase account state for BANNED transitions
    try {
      getFirebaseAdmin();
      const auth = getAuth();

      if (status === "BANNED" && previousStatus !== "BANNED") {
        await auth.updateUser(targetUser.firebaseUid, { disabled: true });
        await auth.revokeRefreshTokens(targetUser.firebaseUid);
      } else if (status !== "BANNED" && previousStatus === "BANNED") {
        await auth.updateUser(targetUser.firebaseUid, { disabled: false });
      }
    } catch (firebaseError) {
      // Postgres is the source of truth — Layer 1 in verifyAuth still blocks BANNED users.
      // Log but don't roll back the status change.
      console.error("Firebase account sync failed:", firebaseError);
    }

    return successResponse({ user: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
