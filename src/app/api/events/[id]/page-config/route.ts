import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { verifyEventOwnership, canModifyPageConfig, assertCanMutate } from "@/lib/authorization";
import {
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/api-response";
import {
  validateAndMigrate,
  createMinimalConfig,
} from "@/lib/config-migrations";
import { revalidateEventPage } from "@/lib/revalidation";
import { eventPageConfigV1Schema } from "@/schemas/event-page";
import type { EventPageConfigV1 } from "@/schemas/event-page";

/** Keep only the most recent N versions per event, delete the rest. */
const MAX_VERSIONS_PER_EVENT = 10;

async function pruneOldVersions(eventId: string) {
  const versions = await db.eventPageVersion.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: MAX_VERSIONS_PER_EVENT,
  });

  if (versions.length > 0) {
    await db.eventPageVersion.deleteMany({
      where: { id: { in: versions.map((v) => v.id) } },
    });
  }
}

const pageConfigActionSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
});

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
            tags: true,
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
        // Persist if lazy-backfill assigned new registry item uuids; see
        // companion write in src/app/e/[slug]/page.tsx for the same reason.
        if (JSON.stringify(fullEvent.pageConfig) !== JSON.stringify(config)) {
          await db.event.update({
            where: { id: eventId },
            data: { pageConfig: config as unknown as object },
          });
        }
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

    assertCanMutate(user);
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

    // Save version history and prune old versions
    await db.eventPageVersion.create({
      data: {
        eventId,
        pageConfig: validatedConfig,
        configVersion: validatedConfig.schemaVersion,
        createdBy: user.id,
      },
    });
    await pruneOldVersions(eventId);

    // Update event and get slug for revalidation
    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: {
        pageConfig: validatedConfig,
        ...(templateId && { templateId }),
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

    assertCanMutate(user);
    const hasAccess = await verifyEventOwnership(eventId, user.id);
    if (!hasAccess) {
      return errorResponse("Event not found or access denied", 404);
    }

    const body = await request.json();
    const { action } = pageConfigActionSchema.parse(body);

    if (action === "publish") {
      // Verify config is valid before publishing
      const fullEvent = await db.event.findUnique({
        where: { id: eventId },
        select: {
          slug: true,
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

      // Revalidate the public page
      await revalidateEventPage(fullEvent.slug);

      return successResponse({ published: true, publishedAt: new Date() });
    } else if (action === "unpublish") {
      // Get slug before unpublishing for revalidation
      const event = await db.event.findUnique({
        where: { id: eventId },
        select: { slug: true },
      });

      await db.event.update({
        where: { id: eventId },
        data: {
          publishedAt: null,
        },
      });

      // Revalidate to clear the cached page
      if (event) {
        await revalidateEventPage(event.slug);
      }

      return successResponse({ published: false });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
