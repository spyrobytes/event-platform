import { describe, it, expect } from "vitest";

// Clear UPSTASH_* BEFORE importing the module under test. The module reads
// env once at load time (`upstashRedis` is a module-level constant), so any
// `beforeAll` that mutates process.env runs too late — the import has already
// resolved. Hoisting the clear here keeps the test deterministic regardless
// of what the developer has in `.env.local`.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const {
  upstashLimiter,
  checkUpstashLimit,
  ipKey,
  hashedIpKey,
} = await import("@/lib/rate-limit");

describe("upstashLimiter", () => {
  it("returns null in dev/test when Upstash env is absent", () => {
    const limiter = upstashLimiter("test", 5, "1 m");
    expect(limiter).toBeNull();
  });
});

describe("checkUpstashLimit", () => {
  it("allows the request when the limiter is null (dev fallback)", async () => {
    const allowed = await checkUpstashLimit(null, "any-key");
    expect(allowed).toBe(true);
  });
});

describe("ipKey", () => {
  it("returns IPv4 addresses unchanged", () => {
    expect(ipKey("203.0.113.42")).toBe("203.0.113.42");
  });

  it("truncates IPv6 to a /64 prefix", () => {
    expect(ipKey("2001:db8:85a3:8d3:1319:8a2e:370:7348")).toBe(
      "2001:db8:85a3:8d3::/64"
    );
  });

  it("expands `::` compression before truncating", () => {
    // fe80::1 → fe80:0:0:0:0:0:0:1 → first 4 hextets = fe80:0:0:0
    expect(ipKey("fe80::1")).toBe("fe80:0:0:0::/64");
  });

  it("handles `::` at the start of the address", () => {
    // ::1 → 0:0:0:0:0:0:0:1 → first 4 = 0:0:0:0
    expect(ipKey("::1")).toBe("0:0:0:0::/64");
  });

  it("handles `::` at the end of the address", () => {
    // 2001:db8:: → 2001:db8:0:0:0:0:0:0 → first 4 = 2001:db8:0:0
    expect(ipKey("2001:db8::")).toBe("2001:db8:0:0::/64");
  });

  it("returns 'unknown' for empty input", () => {
    expect(ipKey("")).toBe("unknown");
  });

  it("collapses two IPs in the same /64 to the same key", () => {
    const a = ipKey("2001:db8:85a3:8d3:1::1");
    const b = ipKey("2001:db8:85a3:8d3:9999::ffff");
    expect(a).toBe(b);
  });

  it("keeps IPs in different /64s distinct", () => {
    const a = ipKey("2001:db8:85a3:8d3::1");
    const b = ipKey("2001:db8:85a3:9999::1");
    expect(a).not.toBe(b);
  });
});

describe("hashedIpKey", () => {
  it("returns a 16-char hex string", () => {
    const h = hashedIpKey("203.0.113.42");
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("is deterministic", () => {
    expect(hashedIpKey("203.0.113.42")).toBe(hashedIpKey("203.0.113.42"));
  });

  it("never reveals the raw IP", () => {
    const raw = "203.0.113.42";
    const h = hashedIpKey(raw);
    expect(h).not.toContain("203");
    expect(h).not.toContain("113");
  });

  it("two IPs in the same /64 hash to the same value", () => {
    const a = hashedIpKey("2001:db8:85a3:8d3:1::1");
    const b = hashedIpKey("2001:db8:85a3:8d3:9999::ffff");
    expect(a).toBe(b);
  });
});
