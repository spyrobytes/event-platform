import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import {
  checkUpstashLimit,
  getClientIp,
  hashedIpKey,
  ipKey,
  upstashLimiter,
} from "@/lib/rate-limit";
import {
  checkDailyBudget,
  incrementTodayUsage,
} from "@/lib/maps/geocode-cache";

// Public, unauthenticated proxy for LocationIQ Static Maps. Lives at this
// boundary so the API key never reaches the browser (free-tier LocationIQ
// permits one access token across all envs; embedding it in <img src>
// would let scrapers burn our daily quota). Static-map fetches consume
// the same daily quota as geocoding, so we share `geocode_usage` for the
// budget counter.
//
// Caching layers, from outermost to innermost:
//   - Social crawlers (Slack/Twitter/iMessage): cache OG images for days.
//   - Browser: respects our 30-day immutable Cache-Control.
//   - Vercel edge: serves the same URL from edge cache after first hit.
// In practice, per-event the LocationIQ tile service sees ~1 transaction.

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  w: z.coerce.number().int().min(64).max(2_048).default(600),
  h: z.coerce.number().int().min(64).max(2_048).default(400),
  z: z.coerce.number().int().min(1).max(18).default(15),
});

// Per-IP rate limiter — public route, no auth, so we keep it tight. The
// limit is generous enough for normal browsers (one image per page view,
// CDN caches the rest) but rules out scraping the proxy as a free
// geocoding service.
const ipLimiter = upstashLimiter("static-map:ip", 30, "1 m");
const ipHourlyLimiter = upstashLimiter("static-map:ip:hourly", 300, "1 h");

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const CACHE_HEADER = `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}, immutable`;

export async function GET(request: NextRequest) {
  // 1. Validate query params before doing any work.
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid params" },
      { status: 400 }
    );
  }
  const { lat, lng, w, h, z } = parsed.data;

  // 2. Rate limit by IP. No-op without Upstash (dev) per the project pattern.
  const ip = getClientIp(request);
  const [perIpOk, perIpHourlyOk] = await Promise.all([
    checkUpstashLimit(ipLimiter, ipKey(ip)),
    checkUpstashLimit(ipHourlyLimiter, ipKey(ip)),
  ]);
  if (!perIpOk || !perIpHourlyOk) {
    console.warn("[static-map] rate limited", { hashedIp: hashedIpKey(ip) });
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 }
    );
  }

  // 3. If no provider key is configured, return a 503 with cache-friendly
  // headers so we don't proxy nothing repeatedly. Clients then fall back to
  // their existing placeholder (gray div / no OG image).
  if (env.GEOCODER_PROVIDER !== "locationiq" || !env.LOCATIONIQ_API_KEY) {
    return NextResponse.json(
      { error: "Static maps not configured" },
      { status: 503 }
    );
  }

  // 4. Shared LocationIQ daily quota — refuse past the floor.
  const budget = await checkDailyBudget();
  if (!budget.allowed) {
    console.warn("[static-map] daily budget exhausted", {
      todayCount: budget.todayCount,
    });
    return NextResponse.json(
      { error: "Daily quota reached" },
      { status: 503 }
    );
  }

  // 5. Build the LocationIQ Static Maps URL server-side so the key stays out
  // of the response. `markers=icon:large-red-cutout` plus the coords places
  // a single marker at the venue center.
  // Docs: https://locationiq.com/docs#staticmap
  const liqParams = new URLSearchParams({
    key: env.LOCATIONIQ_API_KEY,
    center: `${lat},${lng}`,
    zoom: String(z),
    size: `${w}x${h}`,
    markers: `icon:large-red-cutout|${lat},${lng}`,
    format: "png",
  });
  const liqUrl = `https://maps.locationiq.com/v3/staticmap?${liqParams.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(liqUrl, {
      headers: { Accept: "image/png" },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Static map provider timed out" },
        { status: 504 }
      );
    }
    console.error("[static-map] upstream fetch failed", err);
    return NextResponse.json(
      { error: "Static map provider unavailable" },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    console.warn("[static-map] upstream non-OK", { status: upstream.status });
    return NextResponse.json(
      { error: "Static map provider error" },
      { status: 502 }
    );
  }

  // 6. Count toward the daily quota only on successful upstream hits. Fire
  // and forget — increment failures shouldn't break the response.
  incrementTodayUsage().catch(() => undefined);

  // 7. Stream the PNG back with aggressive cache headers. The URL is
  // deterministic from (lat, lng, w, h, z) so subsequent requests for the
  // same image hit Vercel's edge cache or the client's browser cache.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "image/png",
      "Cache-Control": CACHE_HEADER,
    },
  });
}
