import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { upstashLimiter, checkUpstashLimit } from "@/lib/rate-limit";
import { getGeocoder } from "@/lib/maps/geocode";
import {
  buildCacheKey,
  checkDailyBudget,
  incrementTodayUsage,
  readCache,
  writeCache,
} from "@/lib/maps/geocode-cache";

const bodySchema = z.object({
  query: z.string().trim().min(3).max(300),
  country: z.string().length(2).optional(),
});

// Per-user and per-org rate limiters. Both no-op when Upstash isn't
// provisioned (memory: rate limiting is opt-in until pre-GA). These limits
// gate spam/runaway clients; the LocationIQ daily budget guard separately
// protects against quota exhaustion.
const userLimiter = upstashLimiter("geocode:user", 30, "1 m");
const orgLimiter = upstashLimiter("geocode:org", 200, "1 h");

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;

    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    await requireEventOwner(eventId, user.id);

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    if (!event) return errorResponse("Event not found", 404);

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Invalid request: ${parsed.error.issues[0]?.message ?? "bad input"}`, 400);
    }
    const { query, country } = parsed.data;

    const [userAllowed, orgAllowed] = await Promise.all([
      checkUpstashLimit(userLimiter, user.id),
      checkUpstashLimit(orgLimiter, event.organizationId ?? eventId),
    ]);
    if (!userAllowed || !orgAllowed) {
      return errorResponse("Too many geocode requests — slow down a moment.", 429);
    }

    const geocoder = getGeocoder();
    const cacheKey = buildCacheKey({ query, provider: geocoder.provider, biasCountry: country });

    const cached = await readCache(cacheKey);
    if (cached) {
      console.info("[geocode] cache hit", {
        userId: user.id,
        eventId,
        queryLength: query.length,
        provider: geocoder.provider,
        cache: "hit",
        resultCount: cached.length,
      });
      return successResponse({ results: cached, provider: geocoder.provider, cached: true });
    }

    const budget = await checkDailyBudget();
    if (!budget.allowed) {
      console.warn("[geocode] daily budget exhausted", {
        eventId,
        todayCount: budget.todayCount,
      });
      return errorResponse(
        "Geocoding is temporarily unavailable — daily quota reached. Try again tomorrow or enter coordinates manually.",
        503
      );
    }

    const results = await geocoder.geocode(query, { biasCountry: country });

    // Cache even empty results so a typo'd address doesn't burn quota on
    // every retry. TTL is 30d so a corrected address still works fine.
    await writeCache({ key: cacheKey, provider: geocoder.provider, result: results });
    if (geocoder.provider !== "none") {
      await incrementTodayUsage();
    }

    console.info("[geocode] provider hit", {
      userId: user.id,
      eventId,
      queryLength: query.length,
      provider: geocoder.provider,
      cache: "miss",
      resultCount: results.length,
    });

    return successResponse({ results, provider: geocoder.provider, cached: false });
  } catch (error) {
    return handleApiError(error);
  }
}
