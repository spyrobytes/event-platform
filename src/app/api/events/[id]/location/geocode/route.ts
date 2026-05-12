import { NextRequest } from "next/server";
import { z } from "zod";
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

// Server controls how many candidates to surface — clients can't widen this.
// Kept here (rather than relying on the geocoder default) so the cache key
// records a stable value.
const RESULT_LIMIT = 5;

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

    // requireEventOwner throws NotFoundError if the event is missing, so we
    // don't need an explicit 404 fallthrough. The returned row's organizationId
    // feeds the org rate-limit key — saves a redundant findUnique per request.
    const event = await requireEventOwner(eventId, user.id);

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Invalid request: ${parsed.error.issues[0]?.message ?? "bad input"}`, 400);
    }
    const { query, country } = parsed.data;

    // For events with no organization (solo organizers), the org limiter
    // falls back to eventId — effectively per-event instead of per-org.
    // Functionally correct; the prefix name overstates the grouping.
    const [userAllowed, orgAllowed] = await Promise.all([
      checkUpstashLimit(userLimiter, user.id),
      checkUpstashLimit(orgLimiter, event.organizationId ?? eventId),
    ]);
    if (!userAllowed || !orgAllowed) {
      return errorResponse("Too many geocode requests — slow down a moment.", 429);
    }

    const geocoder = getGeocoder();
    const cacheKey = buildCacheKey({
      query,
      provider: geocoder.provider,
      biasCountry: country,
      limit: RESULT_LIMIT,
    });

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

    const results = await geocoder.geocode(query, { biasCountry: country, limit: RESULT_LIMIT });

    if (geocoder.provider !== "none") {
      // Cache even empty results so a typo'd address doesn't burn quota on
      // every retry. TTL is 30d so a corrected address still works fine.
      // Skip cache + usage write when the provider is Noop — those rows are
      // never re-served (different cache key once a real provider is configured)
      // and would waste Prisma upserts on every Find-Location click in dev.
      await writeCache({ key: cacheKey, provider: geocoder.provider, result: results });
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
