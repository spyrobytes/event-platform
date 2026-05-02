import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { SLUG_PATTERN } from "@/schemas/event";
import { isReservedSlug } from "@/lib/reserved-slugs";

/**
 * GET /api/events/check-slug?slug=<candidate>&eventId=<optional>
 *
 * Lightweight availability check for the slug editor UI.
 *  - `slug`     candidate slug to check
 *  - `eventId`  optional; if the caller owns this event and the candidate
 *               matches its current slug, returns { available: true, reason: "self" }
 *               so the UI doesn't flag the user's own slug as taken.
 *
 * Reasons for unavailability:
 *  - "invalid"   fails format
 *  - "reserved"  on the reserved list
 *  - "taken"     active on another event OR retired into another event's history
 *
 * Auth required (organizers only — no need to expose this publicly).
 */
const querySchema = z.object({
  slug: z.string().min(1),
  eventId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(request.url);
    const { slug, eventId } = querySchema.parse(
      Object.fromEntries(searchParams)
    );

    const candidate = slug.toLowerCase();

    if (!SLUG_PATTERN.test(candidate)) {
      return successResponse({ available: false, reason: "invalid" as const });
    }

    if (isReservedSlug(candidate)) {
      return successResponse({ available: false, reason: "reserved" as const });
    }

    // If caller passed eventId AND owns it AND the candidate is its current
    // slug, treat as self — no DB lookup needed beyond ownership.
    if (eventId) {
      const ownEvent = await db.event.findFirst({
        where: { id: eventId, creatorId: user.id },
        select: { slug: true },
      });
      if (ownEvent && ownEvent.slug === candidate) {
        return successResponse({ available: true, reason: "self" as const });
      }
    }

    const [activeHit, historyHit] = await Promise.all([
      db.event.findUnique({ where: { slug: candidate }, select: { id: true } }),
      db.eventSlugHistory.findUnique({
        where: { slug: candidate },
        select: { eventId: true },
      }),
    ]);

    if (activeHit || historyHit) {
      return successResponse({ available: false, reason: "taken" as const });
    }

    return successResponse({ available: true });
  } catch (error) {
    return handleApiError(error);
  }
}
