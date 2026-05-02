import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { userCanEditEvent } from "@/lib/authorization";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { SLUG_PATTERN, type SlugAvailability } from "@/schemas/event";
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
  slug: z.string().min(1).max(100),
  eventId: z.string().optional(),
});

const ok = (body: SlugAvailability) => successResponse(body);

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

    const candidate = slug.trim().toLowerCase();

    if (!SLUG_PATTERN.test(candidate)) return ok({ available: false, reason: "invalid" });
    if (isReservedSlug(candidate)) return ok({ available: false, reason: "reserved" });

    // If caller passed eventId AND can edit it AND the candidate is its
    // current slug, treat as self. Mirrors requireEventOwner so org admins
    // editing their own org's event don't see "taken" for their own slug.
    if (eventId) {
      const target = await db.event.findUnique({
        where: { id: eventId },
        select: { slug: true },
      });
      if (
        target &&
        target.slug === candidate &&
        (await userCanEditEvent(eventId, user.id))
      ) {
        return ok({ available: true, reason: "self" });
      }
    }

    const [activeHit, historyHit] = await Promise.all([
      db.event.findUnique({ where: { slug: candidate }, select: { id: true } }),
      db.eventSlugHistory.findUnique({
        where: { slug: candidate },
        select: { eventId: true },
      }),
    ]);

    if (activeHit || historyHit) return ok({ available: false, reason: "taken" });

    return ok({ available: true });
  } catch (error) {
    return handleApiError(error);
  }
}
