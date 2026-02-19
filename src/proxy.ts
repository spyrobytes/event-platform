import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "./lib/rate-limit";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting for static assets and non-API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Determine rate limit config based on path
  let rateLimitConfig: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS] = RATE_LIMITS.api;
  let rateLimitKey = "api";

  if (pathname.startsWith("/api/webhooks")) {
    rateLimitConfig = RATE_LIMITS.webhooks;
    rateLimitKey = "webhooks";
  } else if (pathname.startsWith("/api/rsvp")) {
    rateLimitConfig = RATE_LIMITS.rsvp;
    rateLimitKey = "rsvp";
  } else if (pathname.startsWith("/api/analytics/track")) {
    rateLimitConfig = RATE_LIMITS.analytics;
    rateLimitKey = "analytics";
  } else if (pathname.startsWith("/api/invites/lookup")) {
    rateLimitConfig = RATE_LIMITS.inviteLookup;
    rateLimitKey = "inviteLookup";
  } else if (pathname.includes("/invites")) {
    rateLimitConfig = RATE_LIMITS.invites;
    rateLimitKey = "invites";
  } else if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    rateLimitConfig = RATE_LIMITS.auth;
    rateLimitKey = "auth";
  } else if (pathname.startsWith("/e/") && request.nextUrl.searchParams.has("tk")) {
    // Rate limit token validation on event pages to prevent enumeration
    rateLimitConfig = RATE_LIMITS.tokenValidation;
    rateLimitKey = "token";
  }

  // Only rate limit API routes, auth pages, and token-bearing event pages
  if (
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/signup") &&
    rateLimitKey !== "token"
  ) {
    return NextResponse.next();
  }

  // Get client IP for rate limiting
  const clientIp = getClientIp(request);
  const key = `${rateLimitKey}:${clientIp}`;

  // Check rate limit
  const result = checkRateLimit(key, rateLimitConfig);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        code: "RATE_LIMITED",
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rateLimitConfig.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(rateLimitConfig.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
