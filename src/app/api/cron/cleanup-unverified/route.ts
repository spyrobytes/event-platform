import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/db";
import { getFirebaseAdmin } from "@/lib/auth";

/**
 * Cron job: hard-delete unverified accounts older than 30 days.
 *
 * Triggered by Vercel Cron daily at 03:00 UTC. Authentication: Bearer
 * token matching CRON_SECRET.
 *
 * Scope:
 *   emailVerified = false AND createdAt < now - 30d
 *
 * Per-user flow:
 *   1. Defensive pre-check: Event.creatorId and LaunchInvite.claimedById
 *      are NoAction FKs. Unverified users shouldn't own either (AuthGuard
 *      blocks creation), but if they somehow do, skip with a log rather
 *      than fail the FK.
 *   2. Delete the Firebase Auth user (Admin SDK). If Firebase says
 *      user-not-found, that's fine — it means an earlier run already
 *      got the Firebase side, or an operator deleted it manually; we
 *      still want the Postgres row gone.
 *   3. Delete the Postgres User row. OrganizationMember cascades.
 *
 * Batch cap: MAX_PER_RUN prevents runaway deletes if the table ever
 * accumulates a large backlog; the sweep is daily, so catch-up takes
 * at most a few days for any realistic volume.
 */
const DAYS = 24 * 60 * 60 * 1000;
const MAX_AGE_DAYS = 30;
const MAX_PER_RUN = 100;

type DeleteOutcome =
  | { userId: string; status: "deleted" }
  | { userId: string; status: "skipped"; reason: string }
  | { userId: string; status: "failed"; error: string };

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
      route: "cleanup-unverified",
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * DAYS);

  try {
    const candidates = await db.user.findMany({
      where: {
        emailVerified: false,
        createdAt: { lt: cutoff },
      },
      select: { id: true, firebaseUid: true, email: true },
      take: MAX_PER_RUN,
    });

    getFirebaseAdmin();

    const outcomes: DeleteOutcome[] = [];
    let deleted = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of candidates) {
      try {
        const [ownedEvents, claimedInvites] = await Promise.all([
          db.event.count({ where: { creatorId: user.id } }),
          db.launchInvite.count({ where: { claimedById: user.id } }),
        ]);

        if (ownedEvents > 0 || claimedInvites > 0) {
          outcomes.push({
            userId: user.id,
            status: "skipped",
            reason: `has dependencies (events=${ownedEvents}, claimedInvites=${claimedInvites})`,
          });
          skipped += 1;
          console.warn("Skipping unverified cleanup — user has dependencies", {
            userId: user.id,
            email: user.email,
            ownedEvents,
            claimedInvites,
          });
          continue;
        }

        try {
          await getAuth().deleteUser(user.firebaseUid);
        } catch (err) {
          const code = (err as { code?: string } | null)?.code;
          if (code !== "auth/user-not-found") {
            throw err;
          }
          // Firebase side already gone; proceed with Postgres delete.
        }

        await db.user.delete({ where: { id: user.id } });

        outcomes.push({ userId: user.id, status: "deleted" });
        deleted += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        outcomes.push({ userId: user.id, status: "failed", error: message });
        failed += 1;
        console.error("Unverified cleanup failed for user", {
          userId: user.id,
          email: user.email,
          error: message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log("Unverified cleanup cron completed", {
      candidates: candidates.length,
      deleted,
      skipped,
      failed,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      candidates: candidates.length,
      deleted,
      skipped,
      failed,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Unverified cleanup cron failed", {
      error: errorMessage,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Unverified cleanup cron failed",
        message: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
