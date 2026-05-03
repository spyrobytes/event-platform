import { describe, it, expect } from "vitest";
import { serverEnvSchema } from "@/env";

// Minimal valid env — all required fields filled. Per-test variants override
// individual fields to exercise the optional-URL handling.
const baseValidEnv = {
  DATABASE_URL: "postgresql://localhost/test",
  DIRECT_URL: "postgresql://localhost/test",
  FIREBASE_PROJECT_ID: "demo",
  FIREBASE_CLIENT_EMAIL: "demo@demo.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY: "demo-private-key",
  MAILGUN_API_KEY: "demo",
  MAILGUN_DOMAIN: "demo.example.com",
  MAILGUN_WEBHOOK_SIGNING_KEY: "demo",
  CRON_SECRET: "x".repeat(32),
  RSVP_CODE_HMAC_KEY: "x".repeat(32),
  SUPABASE_SERVICE_ROLE_KEY: "demo",
};

describe("serverEnvSchema — optional URL fields", () => {
  it("treats empty UPSTASH_REDIS_REST_URL as undefined (matches blank line in .env.example)", () => {
    const result = serverEnvSchema.parse({
      ...baseValidEnv,
      UPSTASH_REDIS_REST_URL: "",
    });
    expect(result.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it("treats empty SENTRY_DSN as undefined", () => {
    const result = serverEnvSchema.parse({
      ...baseValidEnv,
      SENTRY_DSN: "",
    });
    expect(result.SENTRY_DSN).toBeUndefined();
  });

  it("accepts a valid Upstash URL", () => {
    const result = serverEnvSchema.parse({
      ...baseValidEnv,
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    });
    expect(result.UPSTASH_REDIS_REST_URL).toBe("https://example.upstash.io");
  });

  it("rejects a non-empty but invalid URL — empty-string handling doesn't bypass validation", () => {
    const result = serverEnvSchema.safeParse({
      ...baseValidEnv,
      UPSTASH_REDIS_REST_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("treats absent UPSTASH_REDIS_REST_URL as undefined", () => {
    const result = serverEnvSchema.parse(baseValidEnv);
    expect(result.UPSTASH_REDIS_REST_URL).toBeUndefined();
    expect(result.SENTRY_DSN).toBeUndefined();
  });
});
