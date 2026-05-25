import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { countGalleryEmailRecipients } from "@/lib/gallery-email";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/gallery/recipients-preview
 *
 * Lightweight count of how many invites the GALLERY_PUBLISHED broadcast
 * would email if the organizer opts in at publish time. Same predicate
 * as the actual enqueue path — see countGalleryEmailRecipients.
 *
 * Returns just `{ recipientCount: number }`. Fetched lazily by the
 * dashboard publish dialog so the organizer sees "We'll email N guests"
 * before checking the box.
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

    const recipientCount = await countGalleryEmailRecipients(eventId);
    return successResponse({ recipientCount });
  } catch (error) {
    return handleApiError(error);
  }
}
