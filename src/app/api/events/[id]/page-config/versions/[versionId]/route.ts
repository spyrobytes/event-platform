import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { canModifyPageConfig } from "@/lib/authorization";
import {
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/api-response";
import { revalidateEventPage } from "@/lib/revalidation";
import { eventPageConfigV1Schema } from "@/schemas/event-page";
import type { EventPageConfigV1 } from "@/schemas/event-page";

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

/**
 * GET /api/events/[id]/page-config/versions/[versionId]
 * Get a specific version's config for preview
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId, versionId } = await context.params;

    const canModify = await canModifyPageConfig(eventId, user.id);
    if (!canModify) {
      return errorResponse("Event not found or access denied", 403);
    }

    // Get the specific version
    const version = await db.eventPageVersion.findFirst({
      where: {
        id: versionId,
        eventId,
      },
      select: {
        id: true,
        pageConfig: true,
        configVersion: true,
        createdAt: true,
        createdBy: true,
      },
    });

    if (!version) {
      return errorResponse("Version not found", 404);
    }

    return successResponse({
      id: version.id,
      config: version.pageConfig,
      configVersion: version.configVersion,
      createdAt: version.createdAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events/[id]/page-config/versions/[versionId]
 * Rollback to a specific version
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId, versionId } = await context.params;

    const canModify = await canModifyPageConfig(eventId, user.id);
    if (!canModify) {
      return errorResponse("Event not found or access denied", 403);
    }

    // Get the version to rollback to
    const version = await db.eventPageVersion.findFirst({
      where: {
        id: versionId,
        eventId,
      },
      select: {
        pageConfig: true,
        configVersion: true,
      },
    });

    if (!version) {
      return errorResponse("Version not found", 404);
    }

    // Validate the config
    const parseResult = eventPageConfigV1Schema.safeParse(version.pageConfig);
    if (!parseResult.success) {
      return errorResponse("Cannot rollback: version config is invalid", 400);
    }

    const validatedConfig: EventPageConfigV1 = parseResult.data;

    // Create a new version entry for this rollback (to maintain history)
    await db.eventPageVersion.create({
      data: {
        eventId,
        pageConfig: validatedConfig,
        configVersion: validatedConfig.schemaVersion,
        createdBy: user.id,
      },
    });

    // Update the event with the rolled-back config
    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: {
        pageConfig: validatedConfig,
      },
      select: {
        slug: true,
        publishedAt: true,
      },
    });

    // Revalidate public page if published
    if (updatedEvent.publishedAt) {
      await revalidateEventPage(updatedEvent.slug);
    }

    return successResponse({ rolledBack: true, config: validatedConfig });
  } catch (error) {
    return handleApiError(error);
  }
}
