import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { generateUniqueSlug } from "@/lib/utils";
import { NotFoundError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/events/[id]/duplicate
 * Create a copy of an existing event (owner only)
 *
 * Copies:
 * - Event details (title, description, venue, etc.)
 * - Page configuration
 * - Template settings
 *
 * Does NOT copy:
 * - RSVPs
 * - Invites
 * - Media assets
 * - Preview tokens
 * - Published status
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);

    // Fetch the original event
    const originalEvent = await db.event.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        timezone: true,
        venueName: true,
        address: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        visibility: true,
        coverImageUrl: true,
        maxAttendees: true,
        templateId: true,
        themePreset: true,
        pageConfig: true,
      },
    });

    if (!originalEvent) {
      throw new NotFoundError("Event not found");
    }

    // Generate new title and slug
    const newTitle = `Copy of ${originalEvent.title}`;
    const slug = await generateUniqueSlug(newTitle, async (slug) => {
      const existing = await db.event.findUnique({ where: { slug } });
      return !!existing;
    });

    // Create the duplicated event
    const duplicatedEvent = await db.event.create({
      data: {
        title: newTitle,
        slug,
        description: originalEvent.description,
        startAt: originalEvent.startAt,
        endAt: originalEvent.endAt,
        timezone: originalEvent.timezone,
        venueName: originalEvent.venueName,
        address: originalEvent.address,
        city: originalEvent.city,
        country: originalEvent.country,
        latitude: originalEvent.latitude,
        longitude: originalEvent.longitude,
        visibility: originalEvent.visibility,
        coverImageUrl: originalEvent.coverImageUrl,
        maxAttendees: originalEvent.maxAttendees,
        templateId: originalEvent.templateId,
        themePreset: originalEvent.themePreset,
        pageConfig: originalEvent.pageConfig ?? undefined,
        creatorId: user.id,
        status: "DRAFT",
        configVersion: 1,
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
        templateId: true,
        createdAt: true,
      },
    });

    return successResponse(duplicatedEvent, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
