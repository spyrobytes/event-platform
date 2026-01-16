import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queueReminderEmail } from "@/lib/email";
import { formatEventDate } from "@/lib/utils";

/**
 * Cron job endpoint for sending event reminders.
 * Triggered by Vercel Cron daily at 9 AM UTC.
 *
 * Sends reminders to confirmed guests for events happening tomorrow.
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";

    // Calculate tomorrow's date range (in UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 1);

    // Find published events happening tomorrow
    const upcomingEvents = await db.event.findMany({
      where: {
        status: "PUBLISHED",
        startAt: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
      },
      include: {
        creator: {
          select: { name: true },
        },
        invites: {
          where: {
            status: "RESPONDED",
          },
          include: {
            rsvp: true,
          },
        },
      },
    });

    let remindersQueued = 0;
    let eventsProcessed = 0;
    const errors: string[] = [];

    for (const event of upcomingEvents) {
      eventsProcessed++;

      // Filter to only confirmed attendees (RSVP = YES)
      const confirmedInvites = event.invites.filter(
        (invite) => invite.rsvp?.response === "YES"
      );

      for (const invite of confirmedInvites) {
        try {
          // Check if reminder was already sent (within last 48 hours)
          const existingReminder = await db.emailOutbox.findFirst({
            where: {
              inviteId: invite.id,
              template: "REMINDER",
              createdAt: {
                gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
              },
            },
          });

          if (existingReminder) {
            // Skip - reminder already queued/sent
            continue;
          }

          // Format event date/time
          const eventDate = formatEventDate(event.startAt, event.timezone);
          const eventTime = new Date(event.startAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: event.timezone,
          });

          // Build location string
          const eventLocation = [event.venueName, event.city]
            .filter(Boolean)
            .join(", ") || undefined;

          // Queue the reminder email
          await queueReminderEmail(invite.id, invite.email, {
            guestName: invite.name || invite.rsvp?.guestName || "Guest",
            eventTitle: event.title,
            eventDate,
            eventTime,
            eventLocation,
            hostName: event.creator.name || "Event Organizer",
            eventUrl: `${baseUrl}/events/${event.slug}`,
            guestCount: invite.rsvp?.guestCount || 1,
          });

          remindersQueued++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`Invite ${invite.id}: ${errorMessage}`);
          console.error(`Failed to queue reminder for invite ${invite.id}:`, error);
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log("Reminder cron completed", {
      eventsProcessed,
      remindersQueued,
      errors: errors.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      eventsProcessed,
      remindersQueued,
      errors: errors.length > 0 ? errors : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Reminder cron failed", {
      error: errorMessage,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Reminder cron failed",
        message: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
