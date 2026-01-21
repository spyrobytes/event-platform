import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { verifyEventOwnership } from "@/lib/authorization";
import {
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/page-config/versions
 * Get version history for an event's page configuration
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;

    const hasAccess = await verifyEventOwnership(eventId, user.id);
    if (!hasAccess) {
      return errorResponse("Event not found or access denied", 404);
    }

    // Get version history (most recent first)
    const versions = await db.eventPageVersion.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 versions
      select: {
        id: true,
        configVersion: true,
        createdAt: true,
        createdBy: true,
      },
    });

    // Get user info for each version
    const userIds = [...new Set(versions.map((v) => v.createdBy))];
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const versionsWithUser = versions.map((v) => ({
      id: v.id,
      configVersion: v.configVersion,
      createdAt: v.createdAt.toISOString(),
      createdBy: userMap.get(v.createdBy) || { id: v.createdBy, name: null, email: null },
    }));

    return successResponse({ versions: versionsWithUser });
  } catch (error) {
    return handleApiError(error);
  }
}
