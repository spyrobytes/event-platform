import { z } from "zod";

/**
 * Environment variable schema with validation.
 * Validates all required secrets are present and correctly formatted.
 *
 * Usage:
 *   import { env } from "@/env";
 *   const apiKey = env.MAILGUN_API_KEY; // Type-safe!
 */

/**
 * Optional URL field that treats an empty string the same as `undefined`.
 *
 * Plain `z.string().url().optional()` rejects `""` because the empty string
 * passes `.string()`, fails `.optional()`'s `undefined` gate, and then fails
 * `.url()`. `.env.example` ships these variables blank (e.g. `SENTRY_DSN=`),
 * which expands to `""` at process.env read time — and validation rejects
 * the blank line. Using this helper makes the blank line equivalent to
 * "not set," matching `.env.example`'s implicit contract.
 */
const optionalUrl = z
  .string()
  .transform((v) => (v === "" ? undefined : v))
  .pipe(z.string().url().optional());

// Schema for server-side environment variables
export const serverEnvSchema = z.object({
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
    .default("Events <noreply@eventfxr.com>"),

  // Cron job authentication
  CRON_SECRET: z
    .string()
    .min(32, "CRON_SECRET must be at least 32 characters"),

  // Public-portal RSVP code pepper (HMAC key). Required since PR 3 — the
  // verify-code endpoint hashes every guest-submitted code with this pepper
  // before lookup. Treat as a long-lived secret; rotating invalidates every
  // issued code. Generate with `openssl rand -base64 32`.
  RSVP_CODE_HMAC_KEY: z
    .string()
    .min(32, "RSVP_CODE_HMAC_KEY must be at least 32 characters"),

  // Supabase Storage (server-side privileged access)
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Optional services
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SENTRY_DSN: optionalUrl,

  // Geocoder (Phase 3 — LocationIQ). Defaults to "none" so local dev / CI /
  // first-time contributors get a NoopGeocoder that returns []. Production
  // sets GEOCODER_PROVIDER=locationiq + LOCATIONIQ_API_KEY; preview deploys
  // stay on "none" so they don't eat prod's daily quota (LocationIQ free
  // tier permits one access token shared across all envs).
  //
  // Empty-string handling: a blank `GEOCODER_PROVIDER=` line in .env.local
  // (the .env.example default) reads as "" — which Zod's .default() does
  // NOT treat as missing. `preprocess` collapses "" → undefined BEFORE the
  // enum runs, so both absent and blank fall through to "none".
  GEOCODER_PROVIDER: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(["locationiq", "none"]).default("none"),
  ),
  LOCATIONIQ_API_KEY: z.string().optional(),

  // Post-event gallery feature flag. Server-side gate for API routes and
  // server pages. Helper in src/lib/gallery-feature-flag.ts treats `"true"`
  // as on; any other value (including empty) means off.
  POST_EVENT_GALLERY_ENABLED: z.string().optional(),

  // AES-256-GCM key used to encrypt OAuth refresh/access tokens stored in
  // the provider_tokens table. Base64-encoded 32 bytes — generate with
  // `openssl rand -base64 32`. Optional at the schema layer because the
  // gallery feature is flag-gated; src/lib/provider-tokens.ts throws a
  // helpful error if the env is missing when an encrypt/decrypt is
  // attempted. Rotating this key invalidates every stored token.
  PROVIDER_TOKEN_ENCRYPTION_KEY: z.string().optional(),

  // AES-256-GCM key for the durable phone-only invite share link. When set,
  // the raw invite token is also stored encrypted (Invite.token_enc) so the
  // owner-only invite list can re-display a working /rsvp/<token> link after a
  // reload. Base64-encoded 32 bytes — generate with `openssl rand -base64 32`.
  // Optional: when unset, share links fall back to session-ephemeral (today's
  // behavior); RSVP never depends on this key. Rotating it drops durability
  // for existing invites but does not break RSVP. src/lib/invite-token-crypto.ts
  // degrades gracefully (returns null) rather than throwing.
  INVITE_TOKEN_ENC_KEY: z.string().optional(),

  // HMAC key for signing the OAuth state cookie set during
  // /api/auth/google-drive/connect and verified in /callback. Distinct from
  // PROVIDER_TOKEN_ENCRYPTION_KEY so a state-cookie compromise doesn't
  // imply token-store compromise. Base64-encoded ≥32 bytes. Generate with
  // `openssl rand -base64 32`. Optional at the schema layer for the same
  // flag-gating reason as above.
  OAUTH_STATE_SIGNING_KEY: z.string().optional(),

  // Google Drive OAuth credentials from Google Cloud Console. Required only
  // once a user attempts to connect Drive; the route returns 503 with a
  // clear error otherwise. Web client type, with the callback URL
  // configured as ${NEXT_PUBLIC_BASE_URL}/api/auth/google-drive/callback.
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),

  // Local development (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  ALLOW_TEST_ROUTES: z.string().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

// Schema for client-side (public) environment variables
export const clientEnvSchema = z.object({
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
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),

  // Post-event gallery client-side flag. Gates dashboard UI affordances
  // (the Gallery button on the event-detail page). Server routes always
  // re-check via POST_EVENT_GALLERY_ENABLED — this is for hiding UI only.
  NEXT_PUBLIC_POST_EVENT_GALLERY_ENABLED: z.string().optional(),

  // Google Picker API key (browser-side; "API key" type in Google Cloud
  // Console with the Picker API enabled). Required for the dashboard
  // Picker launcher to instantiate. The Picker calls Google APIs
  // directly from the browser using this key + the OAuth token minted by
  // /api/auth/google-drive/access-token. Distinct from the server-side
  // GOOGLE_OAUTH_CLIENT_ID/SECRET (used for the OAuth dance only).
  NEXT_PUBLIC_GOOGLE_PICKER_API_KEY: z.string().optional(),

  // Google Cloud project number — the numeric "Project number" shown on
  // the Google Cloud Console project dashboard (NOT the alphanumeric
  // project ID). Required by the Picker whenever a Drive OAuth scope is
  // used (drive.readonly in our case): without it, thumbnails fail to
  // load, the PICKED-action grant doesn't complete, and the Picker chrome
  // can't close. Exposed to the browser via NEXT_PUBLIC_ because the
  // Picker JS SDK consumes it directly via PickerBuilder.setAppId().
  NEXT_PUBLIC_GOOGLE_PICKER_APP_ID: z.string().optional(),

  // Local development (optional)
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
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
