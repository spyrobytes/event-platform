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
    // Primary connection (pooled for serverless)
    url: process.env["DATABASE_URL"],
  },
});
