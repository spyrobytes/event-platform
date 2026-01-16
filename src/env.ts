import { z } from "zod";

/**
 * Environment variable schema with validation.
 * Validates all required secrets are present and correctly formatted.
 *
 * Usage:
 *   import { env } from "@/env";
 *   const apiKey = env.MAILGUN_API_KEY; // Type-safe!
 */

// Schema for server-side environment variables
const serverEnvSchema = z.object({
  // Database (Supabase Postgres)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  // Firebase Admin SDK
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z
    .string()
    .email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),

  // Mailgun
  MAILGUN_API_KEY: z
    .string()
    .min(1, "MAILGUN_API_KEY is required"),
  MAILGUN_DOMAIN: z.string().min(1, "MAILGUN_DOMAIN is required"),
  MAILGUN_REGION_BASE_URL: z
    .string()
    .url("MAILGUN_REGION_BASE_URL must be a valid URL")
    .default("https://api.mailgun.net"),
  MAILGUN_WEBHOOK_SIGNING_KEY: z
    .string()
    .min(1, "MAILGUN_WEBHOOK_SIGNING_KEY is required"),
  MAIL_FROM: z
    .string()
    .min(1, "MAIL_FROM is required")
    .default("Events <noreply@eventsfixer.com>"),

  // Cron job authentication
  CRON_SECRET: z
    .string()
    .min(32, "CRON_SECRET must be at least 32 characters"),

  // Optional services
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// Schema for client-side (public) environment variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url("NEXT_PUBLIC_BASE_URL must be a valid URL"),
  NEXT_PUBLIC_FIREBASE_API_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_API_KEY is required"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_FIREBASE_PROJECT_ID is required"),
});

// Combined schema
const envSchema = serverEnvSchema.merge(clientEnvSchema);

// Type exports
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns environment variables.
 * Throws descriptive error if validation fails.
 */
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(", ")}`)
      .join("\n");

    throw new Error(
      `Environment validation failed:\n${errorMessages}\n\n` +
        "Please check your .env.local file or Vercel environment variables."
    );
  }

  return parsed.data;
}

/**
 * Validated environment variables.
 * Use this instead of process.env for type safety.
 *
 * Note: Validation runs lazily on first access to avoid build-time issues.
 */
let _env: Env | undefined;

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string) {
    // Skip validation in test environment or during build
    if (process.env.NODE_ENV === "test" || process.env.SKIP_ENV_VALIDATION) {
      return process.env[prop];
    }

    // Lazy initialization
    if (!_env) {
      _env = validateEnv();
    }

    return _env[prop as keyof Env];
  },
});

/**
 * Helper to check if we're in a server context.
 * Useful for conditional logic around server-only variables.
 */
export function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Get a specific environment variable with validation.
 * Throws if the variable is not set.
 */
export function getEnvVar<K extends keyof Env>(key: K): Env[K] {
  return env[key];
}
