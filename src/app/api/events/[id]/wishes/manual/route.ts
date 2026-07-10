import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { manualWishSchema } from "@/schemas/manual-wish";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const querySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/events/[id]/wishes/manual
 * Organizer-only list of manually added wedding wishes (collected outside
 * the invite/RSVP pipeline). Cursor pagination mirrors the sibling
 * moderation route: stable `(createdAt desc, id desc)` ordering, peek-ahead
 * page detection. `total` is returned for the dashboard tab badge.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const { id: eventId } = await context.params;
    await requireEventOwner(eventId, user.id);

    const url = new URL(request.url);
    const { cursor, limit } = querySchema.parse({
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const [total, rawRows] = await Promise.all([
      db.manualWish.count({ where: { eventId } }),
      db.manualWish.findMany({
        where: { eventId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1, // peek-ahead to detect more pages
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          authorName: true,
          message: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const hasMore = rawRows.length > limit;
    const wishes = hasMore ? rawRows.slice(0, limit) : rawRows;
    const nextCursor = hasMore ? wishes[wishes.length - 1].id : null;

    return successResponse({ total, wishes, nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events/[id]/wishes/manual
 * Organizer adds a wish on behalf of a guest. No moderation status — a
 * wish the organizer typed is implicitly approved and appears on the
 * public wall immediately (merged with guest wishes in src/lib/wishes.ts).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const { id: eventId } = await context.params;
    await requireEventOwner(eventId, user.id);

    const body = await request.json();
    const data = manualWishSchema.parse(body);

    const wish = await db.manualWish.create({
      data: {
        eventId,
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

    return successResponse({ wish }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
