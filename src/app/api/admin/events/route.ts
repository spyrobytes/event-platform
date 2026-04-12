import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { successResponse, handleApiError } from "@/lib/api-response";

/**
 * GET /api/admin/events
 * List all events with organizer info for moderation.
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrRes = await requireAdmin(request);
    if (adminOrRes instanceof Response) return adminOrRes;

    const events = await db.event.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        templateId: true,
        publishedAt: true,
        startAt: true,
        createdAt: true,
        creator: {
          select: { id: true, email: true, name: true },
        },
        _count: { select: { invites: true } },
      },
    });

    const result = events.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      templateId: e.templateId,
      isPublished: !!e.publishedAt,
      publishedAt: e.publishedAt,
      startAt: e.startAt,
      inviteCount: e._count.invites,
      organizer: e.creator,
      createdAt: e.createdAt,
    }));

    return successResponse({ events: result });
  } catch (error) {
    return handleApiError(error);
  }
}
