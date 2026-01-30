import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import {
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/api-response";
import { invitationConfigSchema } from "@/schemas/invitation";
import { NotFoundError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/invitation-config
 * Get invitation configuration for an event
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    // Fetch invitation config
    const config = await db.invitationConfig.findUnique({
      where: { eventId },
    });

    // Return null if no config exists (event doesn't have elegant invitations yet)
    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/events/[id]/invitation-config
 * Create or update invitation configuration
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    const body = await request.json();
    const data = invitationConfigSchema.parse(body);

    // Upsert the configuration
    const config = await db.invitationConfig.upsert({
      where: { eventId },
      create: {
        eventId,
        template: data.template,
        themeId: data.themeId,
        typographyPair: data.typographyPair,
        coupleDisplayName: data.coupleDisplayName || null,
        person1Name: data.person1Name || null,
        person2Name: data.person2Name || null,
        headerText: data.headerText || null,
        eventTypeText: data.eventTypeText || null,
        monogram: data.monogram || null,
        customMessage: data.customMessage || null,
        dressCode: data.dressCode || null,
        heroImageUrl: data.heroImageUrl || null,
        locale: data.locale,
        textDirection: data.textDirection,
      },
      update: {
        template: data.template,
        themeId: data.themeId,
        typographyPair: data.typographyPair,
        coupleDisplayName: data.coupleDisplayName || null,
        person1Name: data.person1Name || null,
        person2Name: data.person2Name || null,
        headerText: data.headerText || null,
        eventTypeText: data.eventTypeText || null,
        monogram: data.monogram || null,
        customMessage: data.customMessage || null,
        dressCode: data.dressCode || null,
        heroImageUrl: data.heroImageUrl || null,
        locale: data.locale,
        textDirection: data.textDirection,
      },
    });

    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/events/[id]/invitation-config
 * Delete invitation configuration (revert to legacy RSVP)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    // Check if config exists
    const existing = await db.invitationConfig.findUnique({
      where: { eventId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Invitation config not found");
    }

    await db.invitationConfig.delete({
      where: { eventId },
    });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
