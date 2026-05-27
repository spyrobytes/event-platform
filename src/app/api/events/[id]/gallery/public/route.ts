import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import {
  getPublicGalleryItems,
  GALLERY_PAGE_SIZE,
} from "@/lib/gallery-data";
import { resolveGuestAccess } from "@/lib/event-page-loader";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_LIMIT = 60;

/**
 * GET /api/events/[id]/gallery/public?cursor=…&limit=…&tk=…
 *
 * Public pagination endpoint for the native gallery render. The first
 * page of items is hydrated server-side by /e/[slug]/gallery; this
 * endpoint serves subsequent pages as the client scrolls.
 *
 * No auth header — guest-portal pattern. Token in `?tk=` is forwarded to
 * the same `resolveGuestAccess` helper used by /e/[slug]/gallery so the
 * access semantics stay identical (see §8.4 of the consolidated plan).
 *
 * Returns 404 (not 401) when the event is non-public AND the token is
 * missing/invalid, to avoid disclosing event existence.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!isPostEventGalleryEnabled()) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    const { id: eventId } = await context.params;
    const url = new URL(request.url);
    const tk = url.searchParams.get("tk") ?? undefined;
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit
      ? Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(rawLimit, 10) || GALLERY_PAGE_SIZE))
      : GALLERY_PAGE_SIZE;

    // Existence + visibility check. Resolves the gallery in one round-trip.
    // Mirror getEventBySlug's filters so the API can't serve photos for an
    // event whose page would 404 (unpublished or cancelled).
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        visibility: true,
        status: true,
        publishedAt: true,
        galleries: {
          where: { status: "PUBLISHED" },
          select: { id: true, sourceType: true },
          take: 1,
        },
      },
    });
    if (!event || !event.galleries.length) {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }
    if (!event.publishedAt || event.status === "CANCELLED") {
      return errorResponse("Not found", 404, "NOT_FOUND");
    }

    // Access contract mirrors /e/[slug]/gallery (SSR):
    //   PUBLIC   — anyone
    //   UNLISTED — anyone with the direct link (no token required)
    //   PRIVATE  — only a valid guest token
    // Previously the API stripped UNLISTED of access too, so its infinite
    // scroll fell off a cliff after 24 items even though the page rendered.
    if (event.visibility === "PRIVATE") {
      const access = await resolveGuestAccess(tk, eventId);
      if (access.accessLevel !== "guest") {
        return errorResponse("Not found", 404, "NOT_FOUND");
      }
    }

    const gallery = event.galleries[0];
    if (gallery.sourceType === "EXTERNAL_LINK") {
      // External-link galleries have no items; respond with an empty page
      // rather than 404 so a misbehaving client polling here gets a clean
      // "you're done" signal instead of an error.
      return successResponse({ items: [], pageInfo: { nextCursor: null } });
    }

    const { items, nextCursor } = await getPublicGalleryItems(gallery.id, {
      cursor,
      limit,
    });

    return successResponse({ items, pageInfo: { nextCursor } });
  } catch (error) {
    return handleApiError(error);
  }
}
