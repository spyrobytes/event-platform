import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { createEventSchema, eventQuerySchema } from "@/schemas/event";
import { generateUniqueSlug } from "@/lib/utils";

/**
 * GET /api/events
 * List events (public: published only, authenticated: user's events)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = eventQuerySchema.parse(Object.fromEntries(searchParams));

    const user = await verifyAuth(request);

    // Build where clause based on authentication
    const where = user
      ? {
          // Authenticated: show user's events
          creatorId: user.id,
          ...(query.status && { status: query.status }),
          ...(query.visibility && { visibility: query.visibility }),
        }
      : {
          // Public: only show published public events
          status: "PUBLISHED" as const,
          visibility: "PUBLIC" as const,
          ...(query.city && { city: query.city }),
        };

    const [events, total] = await Promise.all([
      db.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          startAt: true,
          endAt: true,
          timezone: true,
          venueName: true,
          city: true,
          coverImageUrl: true,
          status: true,
          visibility: true,
          createdAt: true,
          _count: {
            select: {
              rsvps: { where: { response: "YES" } },
            },
          },
        },
        orderBy: { startAt: "asc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.event.count({ where }),
    ]);

    return successResponse({
      events,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + events.length < total,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events
 * Create a new event (requires authentication)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const body = await request.json();
    const data = createEventSchema.parse(body);

    // Generate unique slug from title
    const slug = await generateUniqueSlug(data.title, async (slug) => {
      const existing = await db.event.findUnique({ where: { slug } });
      return !!existing;
    });

    const event = await db.event.create({
      data: {
        ...data,
        slug,
        creatorId: user.id,
        status: "DRAFT",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        startAt: true,
        endAt: true,
        timezone: true,
        venueName: true,
        address: true,
        city: true,
        country: true,
        visibility: true,
        status: true,
        coverImageUrl: true,
        maxAttendees: true,
        createdAt: true,
      },
    });

    return successResponse(event, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
