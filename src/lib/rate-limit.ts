/**
 * Rate limiting — two backends:
 *   - In-memory (this file's original `checkRateLimit` + `RATE_LIMITS`),
 *     used by `src/proxy.ts`. Per-instance only; suitable for the proxy.
 *   - Upstash Redis (`upstashLimiter` / `checkUpstashLimit` below), shared
 *     across instances. Use this for new endpoints where multi-instance
 *     coordination matters (e.g. anti-enumeration on public endpoints).
 *
 * **Upstash status (deferred until pre-GA):** Upstash Redis is not yet
 * provisioned. When `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
 * are absent, the Upstash helpers no-op in every environment — including
 * production — and emit a single boot-time warning to the server logs.
 * Pre-GA, provision Upstash and set the two env vars in Vercel; that flips
 * activation on with no code change. Existing call sites (PR 3+ public
 * RSVP endpoints) become real rate limits the moment the secrets land.
 *
 * Until then, public endpoints rely on defense-in-depth (HMAC-pepper'd
 * code space, honeypot fields, generic error responses) instead of rate
 * limiting. See `project_launch_plan.md` memory for the pre-GA TODO.
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

  // Token validation on event pages: 15 requests per minute per IP
  tokenValidation: { limit: 15, windowSeconds: 60 },

  // Analytics tracking: 30 requests per minute per IP
  analytics: { limit: 30, windowSeconds: 60 },

  // Invite lookup: 15 requests per minute per IP
  inviteLookup: { limit: 15, windowSeconds: 60 },

  // Waitlist signup: 5 requests per 24 hours per IP
  waitlist: { limit: 5, windowSeconds: 86400 },
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

// ---------------------------------------------------------------------------
// Upstash Redis–backed limiter (multi-instance coordination)
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

type Window = `${number} ${"s" | "m" | "h" | "d"}`;

// Upstash is deferred until pre-GA (see file-level JSDoc). When env vars are
// absent, the limiter no-ops in every environment — including production —
// and we log a single boot-time warning so operators can see in Vercel logs
// that rate limiting is currently disabled.
const upstashRedis: Redis | null =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

if (env.NODE_ENV === "production" && !upstashRedis) {
  console.warn(
    "[rate-limit] Upstash Redis not configured — Upstash rate limiters are " +
      "disabled in production. Provision Upstash and set " +
      "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to activate."
  );
}

/**
 * Build a sliding-window Upstash limiter for a given key prefix. Returns
 * null when Upstash isn't configured (dev only — prod throws above).
 */
export function upstashLimiter(
  prefix: string,
  limit: number,
  window: Window
): Ratelimit | null {
  if (!upstashRedis) return null;
  return new Ratelimit({
    redis: upstashRedis,
    prefix,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: false,
  });
}

/**
 * Check a request against an Upstash limiter. Returns `true` if allowed.
 * In dev with no Upstash configured (`limiter === null`), always returns
 * `true` — local development is not bound by production limits.
 */
export async function checkUpstashLimit(
  limiter: Ratelimit | null,
  key: string
): Promise<boolean> {
  if (!limiter) return true;
  const { success } = await limiter.limit(key);
  return success;
}

/**
 * Normalize a raw IP address into a rate-limit key. IPv6 addresses are
 * truncated to a /64 prefix so a single user can't sidestep limits by
 * cycling through addresses in their allocation.
 */
export function ipKey(ip: string): string {
  if (!ip) return "unknown";
  if (!ip.includes(":")) return ip; // IPv4

  // IPv6: expand `::` compression to a full 8-hextet form, then keep the
  // first four (the /64 routing prefix). Without expansion, abbreviated
  // forms like `fe80::1` would slice incorrectly.
  const parts = ip.split("::");
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts.length > 1 && parts[1] ? parts[1].split(":") : [];
  const zerosNeeded = Math.max(0, 8 - head.length - tail.length);
  const expanded = [...head, ...Array(zerosNeeded).fill("0"), ...tail];
  return expanded.slice(0, 4).join(":") + "::/64";
}

/**
 * Hash an IP key with SHA-256 for log lines. Logs shouldn't carry raw
 * IP/identifier material; the hash preserves uniqueness for correlation
 * without storing the address itself.
 */
export function hashedIpKey(ip: string): string {
  return createHash("sha256").update(ipKey(ip)).digest("hex").slice(0, 16);
}
