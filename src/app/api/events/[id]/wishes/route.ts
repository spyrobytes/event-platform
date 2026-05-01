import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const statusFilterSchema = z.enum(["PENDING", "APPROVED", "HIDDEN", "ALL"]).default("PENDING");

/**
 * GET /api/events/[id]/wishes
 * Organizer-only list of guest wedding-wish messages for moderation.
 * Filters by `?status=PENDING|APPROVED|HIDDEN|ALL` (default PENDING).
 * Always returns counts for all three buckets so the dashboard can
 * render tab badges in one round trip.
 *
 * Only RSVPs with a non-empty `messageToHost` are returned — rows where
 * the guest skipped the message are not part of the moderation queue.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const { id: eventId } = await context.params;
    await requireEventOwner(eventId, user.id);

    const url = new URL(request.url);
    const status = statusFilterSchema.parse(url.searchParams.get("status") ?? "PENDING");

    const whereBase = {
      eventId,
      messageToHost: { not: null },
    } as const;

    const [pending, approved, hidden, rows] = await Promise.all([
      db.rSVP.count({ where: { ...whereBase, messageStatus: "PENDING" } }),
      db.rSVP.count({ where: { ...whereBase, messageStatus: "APPROVED" } }),
      db.rSVP.count({ where: { ...whereBase, messageStatus: "HIDDEN" } }),
      db.rSVP.findMany({
        where:
          status === "ALL"
            ? whereBase
            : { ...whereBase, messageStatus: status },
        orderBy: { respondedAt: "desc" },
        select: {
          id: true,
          guestName: true,
          messageToHost: true,
          messageStatus: true,
          messageApprovedAt: true,
          respondedAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return successResponse({
      counts: { pending, approved, hidden },
      messages: rows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
