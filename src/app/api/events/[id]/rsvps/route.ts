import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { rsvpQuerySchema } from "@/schemas/rsvp";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/rsvps
 * List RSVPs for an event (owner only)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    const { searchParams } = new URL(request.url);
    const query = rsvpQuerySchema.parse(Object.fromEntries(searchParams));

    const where = {
      eventId,
      ...(query.response && { response: query.response }),
    };

    const [rsvps, total, stats] = await Promise.all([
      db.rSVP.findMany({
        where,
        select: {
          id: true,
          response: true,
          guestName: true,
          guestEmail: true,
          guestCount: true,
          notes: true,
          respondedAt: true,
          updatedAt: true,
          invite: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { respondedAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.rSVP.count({ where }),
      db.rSVP.groupBy({
        by: ["response"],
        where: { eventId },
        _count: { response: true },
        _sum: { guestCount: true },
      }),
    ]);

    // Transform stats into an easier format
    const statsByResponse = stats.reduce(
      (acc, stat) => {
        acc[stat.response] = {
          count: stat._count.response,
          totalGuests: stat._sum.guestCount || 0,
        };
        return acc;
      },
      {} as Record<string, { count: number; totalGuests: number }>
    );

    return successResponse({
      rsvps,
      stats: {
        yes: statsByResponse["YES"] || { count: 0, totalGuests: 0 },
        no: statsByResponse["NO"] || { count: 0, totalGuests: 0 },
        maybe: statsByResponse["MAYBE"] || { count: 0, totalGuests: 0 },
      },
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + rsvps.length < total,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
