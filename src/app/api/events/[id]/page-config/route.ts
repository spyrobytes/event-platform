import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { verifyEventOwnership, canModifyPageConfig } from "@/lib/authorization";
import {
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/api-response";
import {
  validateAndMigrate,
  createMinimalConfig,
} from "@/lib/config-migrations";
import { eventPageConfigV1Schema } from "@/schemas/event-page";
import type { EventPageConfigV1 } from "@/schemas/event-page";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/page-config
 * Get the current page configuration
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

    // Get full event data for config
    const fullEvent = await db.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        startAt: true,
        venueName: true,
        city: true,
        pageConfig: true,
        templateId: true,
        publishedAt: true,
        mediaAssets: {
          select: {
            id: true,
            kind: true,
            publicUrl: true,
            width: true,
            height: true,
            alt: true,
          },
        },
      },
    });

    if (!fullEvent) {
      return errorResponse("Event not found", 404);
    }

    // Validate and migrate config or create minimal config
    let config: EventPageConfigV1;
    if (fullEvent.pageConfig) {
      try {
        config = validateAndMigrate(fullEvent.pageConfig);
      } catch {
        // If validation fails, create a minimal config
        config = createMinimalConfig(fullEvent.title);
      }
    } else {
      config = createMinimalConfig(fullEvent.title);
    }

    return successResponse({
      config,
      templateId: fullEvent.templateId || "wedding_v1",
      isPublished: !!fullEvent.publishedAt,
      publishedAt: fullEvent.publishedAt,
      assets: fullEvent.mediaAssets,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/events/[id]/page-config
 * Update the page configuration
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;

    const canModify = await canModifyPageConfig(eventId, user.id);
    if (!canModify) {
      return errorResponse("Event not found or access denied", 403);
    }

    const body = await request.json();
    const { config, templateId } = body;

    // Validate config against schema
    const parseResult = eventPageConfigV1Schema.safeParse(config);
    if (!parseResult.success) {
      return errorResponse(
        `Invalid config: ${parseResult.error.message}`,
        400
      );
    }

    const validatedConfig: EventPageConfigV1 = parseResult.data;

    // Save version history
    await db.eventPageVersion.create({
      data: {
        eventId,
        pageConfig: validatedConfig,
        configVersion: validatedConfig.schemaVersion,
        createdBy: user.id,
      },
    });

    // Update event
    await db.event.update({
      where: { id: eventId },
      data: {
        pageConfig: validatedConfig,
        ...(templateId && { templateId }),
      },
    });

    return successResponse({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events/[id]/page-config
 * Publish or unpublish the page
 * Body: { action: "publish" | "unpublish" }
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = await request.json();
    const { action } = body;

    if (action === "publish") {
      // Verify config is valid before publishing
      const fullEvent = await db.event.findUnique({
        where: { id: eventId },
        select: {
          pageConfig: true,
          title: true,
          templateId: true,
        },
      });

      if (!fullEvent) {
        return errorResponse("Event not found", 404);
      }

      // Get or create config
      let config: EventPageConfigV1;
      if (fullEvent.pageConfig) {
        const parseResult = eventPageConfigV1Schema.safeParse(fullEvent.pageConfig);
        if (!parseResult.success) {
          return errorResponse(
            "Cannot publish: page config is invalid",
            400
          );
        }
        config = parseResult.data;
      } else {
        // Create default config for publishing
        config = createMinimalConfig(fullEvent.title);
      }

      await db.event.update({
        where: { id: eventId },
        data: {
          publishedAt: new Date(),
          pageConfig: config,
        },
      });

      return successResponse({ published: true, publishedAt: new Date() });
    } else if (action === "unpublish") {
      await db.event.update({
        where: { id: eventId },
        data: {
          publishedAt: null,
        },
      });

      return successResponse({ published: false });
    } else {
      return errorResponse(
        "Invalid action. Must be 'publish' or 'unpublish'",
        400
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
