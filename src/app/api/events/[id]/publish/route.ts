import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanPublish } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { publishEventSchema } from "@/schemas/event";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { revalidateEventPage } from "@/lib/revalidation";
import { validateAndMigrate } from "@/lib/config-migrations";
import { validateMapSectionsInConfig } from "@/lib/maps/map-utils";
import { eventPageConfigV1Schema } from "@/schemas/event-page";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/events/[id]/publish
 * Publish an event (owner only)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);
    assertCanPublish(user);

    // Get current event to validate
    const currentEvent = await db.event.findUnique({
      where: { id },
      select: {
        status: true,
        title: true,
        startAt: true,
        pageConfig: true,
      },
    });

    if (!currentEvent) {
      throw new NotFoundError("Event not found");
    }

    // Validate event can be published
    if (currentEvent.status === "PUBLISHED") {
      throw new ValidationError("Event is already published");
    }

    if (currentEvent.status === "CANCELLED") {
      throw new ValidationError("Cannot publish a cancelled event");
    }

    if (!currentEvent.title || !currentEvent.startAt) {
      throw new ValidationError("Event must have a title and start date to be published");
    }

    if (currentEvent.startAt < new Date()) {
      throw new ValidationError("Cannot publish an event with a start date in the past");
    }

    // Reject publish if the saved config is structurally invalid, or if any
    // enabled map section is missing address or coords. Drafts may have
    // incomplete map data (schema allows it); publish must not.
    //
    // Mirrors the safeParse pattern used by `/api/events/[id]/page-config`
    // action=publish so error specificity is consistent between the two
    // publish surfaces.
    if (currentEvent.pageConfig) {
      const migrated = validateAndMigrate(currentEvent.pageConfig);
      const parseResult = eventPageConfigV1Schema.safeParse(migrated);
      if (!parseResult.success) {
        throw new ValidationError(
          `Cannot publish: page config is invalid (${parseResult.error.issues[0]?.message ?? "schema parse error"}).`
        );
      }
      const mapResult = validateMapSectionsInConfig(parseResult.data);
      if (!mapResult.ok) {
        throw new ValidationError(mapResult.reason);
      }
    }

    // Parse optional publish data
    const body = await request.json().catch(() => ({}));
    const data = publishEventSchema.parse(body);

    const event = await db.event.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: data.publishedAt ?? new Date(),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        visibility: true,
        publishedAt: true,
        startAt: true,
        endAt: true,
      },
    });

    await revalidateEventPage(event.slug);

    return successResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}
