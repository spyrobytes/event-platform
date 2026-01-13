/**
 * Simple in-memory rate limiter
 * For production, use Redis-based rate limiting (Upstash)
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store (replace with Redis for production)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

type RateLimitConfig = {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
};

type RateLimitResult = {
  success: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = store.get(key);

  // If no entry or expired, create new one
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // API endpoints: 100 requests per minute
  api: { limit: 100, windowSeconds: 60 },

  // Auth endpoints: 10 requests per minute
  auth: { limit: 10, windowSeconds: 60 },

  // RSVP submission: 5 requests per minute per IP
  rsvp: { limit: 5, windowSeconds: 60 },

  // Invite creation: 20 requests per minute
  invites: { limit: 20, windowSeconds: 60 },

  // Webhook endpoints: 1000 requests per minute
  webhooks: { limit: 1000, windowSeconds: 60 },
} as const;

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  // Try various headers that might contain the real IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (useful for development)
  return "127.0.0.1";
}
