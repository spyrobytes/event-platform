import { NextRequest, NextResponse } from "next/server";
import { isPostEventGalleryEnabled } from "@/lib/gallery-feature-flag";
import { processGalleryImports } from "@/lib/gallery-worker";

// Next.js segment config — must be a literal per
// feedback_nextjs_segment_config_literals. Matches the 60s Vercel Pro
// function cap; the worker batch size + per-item budget are tuned to
// stay under this.
export const maxDuration = 60;

/**
 * GET /api/cron/process-gallery-imports
 *
 * Triggered every 5 minutes by Vercel Cron. Claims a batch of PENDING
 * gallery items (plus stale IMPORTING items recoverable per
 * GALLERY_LIMITS.staleImportingThresholdMs), processes each through
 * download → transcode → upload, and reconciles touched jobs.
 *
 * Auth: same `Bearer ${CRON_SECRET}` shape as the email cron — Vercel
 * Cron sends this header automatically.
 *
 * Short-circuits when the feature flag is off OR there's no work, so
 * non-gallery deployments don't burn function-seconds. Logs are
 * structured to match the email cron for log-search uniformity.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("Gallery import cron auth failed", {
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature flag off → return success with zero work so the cron stays
  // wired up and doesn't surface as a perpetual failure in the Vercel UI.
  if (!isPostEventGalleryEnabled()) {
    return NextResponse.json({
      success: true,
      flagOff: true,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const summary = await processGalleryImports();
    const duration = Date.now() - startTime;

    console.log("Gallery import cron completed", {
      ...summary,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ...summary,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Gallery import cron failed", {
      error: message,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        error: "Gallery import processing failed",
        message,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
