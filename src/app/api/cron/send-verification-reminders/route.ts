import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/verification";
import { EMAIL_LAMBDA_MAX_DURATION_S } from "@/lib/email";

/**
 * Cron job: nudge users who signed up but never verified their email.
 *
 * Triggered by Vercel Cron daily at 11:00 UTC. Authentication: Bearer
 * token matching CRON_SECRET.
 *
 * Cadence:
 *   - Day-1 nudge: verificationRemindersSent = 0 AND signup older than 22h
 *   - Day-3 nudge: verificationRemindersSent = 1 AND signup older than 70h
 *   - After two nudges, stop — cleanup-unverified reclaims the row at 30d.
 *
 * Each nudge regenerates the verification token (invalidates the previous
 * link) and queues a fresh `VerificationEmail`. The counter is incremented
 * after a successful queue — if the send throws, the counter stays put and
 * tomorrow's cron retries. A crash between send and increment would
 * produce one duplicate; the cost is tolerable vs. the complexity of a
 * tx here.
 */
const HOURS = 60 * 60 * 1000;
const DAY_1_THRESHOLD_HOURS = 22;
const DAY_3_THRESHOLD_HOURS = 70;

export const maxDuration = EMAIL_LAMBDA_MAX_DURATION_S;

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("Cron authentication failed", {
      route: "send-verification-reminders",
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const day1Before = new Date(now - DAY_1_THRESHOLD_HOURS * HOURS);
  const day3Before = new Date(now - DAY_3_THRESHOLD_HOURS * HOURS);

  try {
    const candidates = await db.user.findMany({
      where: {
        emailVerified: false,
        OR: [
          { verificationRemindersSent: 0, createdAt: { lt: day1Before } },
          { verificationRemindersSent: 1, createdAt: { lt: day3Before } },
        ],
      },
      select: { id: true, email: true, verificationRemindersSent: true },
    });

    let sent = 0;
    const failures: { userId: string; error: string }[] = [];

    for (const user of candidates) {
      try {
        await sendVerificationEmail(user.id);
        await db.user.update({
          where: { id: user.id },
          data: { verificationRemindersSent: { increment: 1 } },
        });
        sent += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        failures.push({ userId: user.id, error: message });
        console.error("Verification reminder failed for user", {
          userId: user.id,
          error: message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log("Verification reminder cron completed", {
      candidates: candidates.length,
      sent,
      failed: failures.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      candidates: candidates.length,
      sent,
      failed: failures.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Verification reminder cron failed", {
      error: errorMessage,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Verification reminder cron failed",
        message: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
