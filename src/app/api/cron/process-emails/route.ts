import { NextRequest, NextResponse } from "next/server";
import { processQueuedEmails } from "@/lib/email";

/**
 * Cron job endpoint for processing queued emails.
 * Triggered by Vercel Cron every 5 minutes.
 *
 * Authentication: Bearer token matching CRON_SECRET
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("Cron authentication failed", {
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Process queued emails (batch of 50)
    const processed = await processQueuedEmails(50);

    const duration = Date.now() - startTime;

    console.log("Email processing cron completed", {
      processed,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      processed,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Email processing cron failed", {
      error: errorMessage,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Email processing failed",
        message: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
