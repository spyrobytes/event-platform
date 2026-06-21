/**
 * Best-effort client IP from proxy headers. Lives in its own (dependency-free)
 * module so both the rate limiter and the admin audit trail can share one
 * parser without dragging the Upstash-heavy rate-limit module into routes that
 * only need the IP. Falls back to a sentinel for local/dev with no proxy header.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "127.0.0.1";
}
