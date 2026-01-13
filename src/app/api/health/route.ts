import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type HealthStatus = "healthy" | "degraded" | "unhealthy";

type HealthCheck = {
  status: HealthStatus;
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: HealthStatus;
      latencyMs?: number;
      error?: string;
    };
  };
};

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
export async function GET() {
  const startTime = Date.now();
  const health: HealthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: {
        status: "healthy",
      },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    health.checks.database.latencyMs = Date.now() - dbStart;
    health.checks.database.status = "healthy";
  } catch (error) {
    health.checks.database.status = "unhealthy";
    health.checks.database.error =
      error instanceof Error ? error.message : "Unknown database error";
    health.status = "unhealthy";
  }

  // Determine overall status
  if (health.checks.database.status === "unhealthy") {
    health.status = "unhealthy";
  } else if (
    health.checks.database.latencyMs &&
    health.checks.database.latencyMs > 1000
  ) {
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Response-Time": `${Date.now() - startTime}ms`,
    },
  });
}

/**
 * HEAD /api/health
 * Quick health check (no body)
 */
export async function HEAD() {
  try {
    await db.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
