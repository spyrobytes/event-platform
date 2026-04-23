import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Load .env.local for development
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-only URL. In Prisma 7, `datasource.url` here is used exclusively
    // by the Prisma CLI (migrate, db push, etc.) — NOT by the runtime
    // PrismaClient, which gets its connection from the adapter in
    // src/lib/db.ts (Pool over DATABASE_URL).
    //
    // Point this at DIRECT_URL so migrations run through a direct session
    // (port 5432 on Supabase) and never through PgBouncer transaction
    // pooling, which breaks Prisma's advisory-lock DDL flow.
    //
    // Uses `process.env[...]` instead of the `env()` helper because `env()`
    // throws when the variable is unset — breaking CI jobs that only need
    // `prisma generate` / `prisma validate` (both work without a URL).
    // `process.env[...]` returns undefined, which Prisma tolerates for
    // non-connection commands; for migrate commands, DIRECT_URL must be
    // exported in the shell (or provided as a GitHub Actions secret).
    url: process.env["DIRECT_URL"],
  },
});
