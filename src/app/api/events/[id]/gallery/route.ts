import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { getGalleryForOrganizer } from "@/lib/gallery-data";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/gallery
 *
 * Organizer-facing read. Returns the (single) gallery row for the event
 * including drafts and hidden galleries, or `{ gallery: null }` if none
 * exists. Public viewers should never hit this — the public payload comes
 * from getPublishedGalleryForEvent and is shaped differently.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    const gallery = await getGalleryForOrganizer(eventId);
    return successResponse({ gallery });
  } catch (error) {
    return handleApiError(error);
  }
}
