import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["unpublish"]),
});

/**
 * PATCH /api/admin/events/[id]
 * Admin moderation: unpublish or warn.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminOrRes = await requireAdmin(request);
    if (adminOrRes instanceof Response) return adminOrRes;

    const { id } = await context.params;
    const body = await request.json();
    const result = actionSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.issues[0].message, 400);
    }

    const event = await db.event.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    });

    if (!event) {
      return errorResponse("Event not found", 404);
    }

    if (result.data.action === "unpublish") {
      await db.event.update({
        where: { id },
        data: { publishedAt: null },
      });
      return successResponse({ unpublished: true });
    }

    return errorResponse("Unknown action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
