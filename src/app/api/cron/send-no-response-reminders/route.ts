import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { queueNoResponseReminderEmail, processEmail } from "@/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/send-no-response-reminders
 *
 * Cron job to send reminder emails to guests who haven't responded.
 * Logic:
 * 1. Find events with reminderEnabled: true
 * 2. For each event, find invites where status is SENT or OPENED (no response yet)
 * 3. Check if enough time has passed based on reminderDays interval
 * 4. Count existing NO_RESPONSE_REMINDER emails for each invite
 * 5. If next interval reached and not already sent for that interval -> queue reminder
 * 6. Stop reminders when event starts or deadline passes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();
    let totalQueued = 0;

    // Find events with reminders enabled that haven't started yet
    const events = await db.event.findMany({
      where: {
        reminderEnabled: true,
        reminderDays: { not: null },
        startAt: { gt: now }, // Event hasn't started yet
        status: { in: ["DRAFT", "PUBLISHED"] },
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        timezone: true,
        venueName: true,
        city: true,
        reminderDays: true,
        rsvpDeadline: true,
        creator: {
          select: { name: true, email: true },
        },
      },
    });

    for (const event of events) {
      // Skip if RSVP deadline has passed
      if (event.rsvpDeadline && new Date(event.rsvpDeadline) < now) {
        continue;
      }

      // Find invites that haven't responded
      const invites = await db.invite.findMany({
        where: {
          eventId: event.id,
          status: { in: ["SENT", "OPENED"] },
          sentAt: { not: null },
          rsvp: null, // No response yet
        },
        select: {
          id: true,
          email: true,
          name: true,
          sentAt: true,
          tokenHash: true,
        },
      });

      if (invites.length === 0) continue;

      const reminderDays = event.reminderDays!;
      const reminderIntervalMs = reminderDays * 24 * 60 * 60 * 1000;

      // Prepare event details for email
      const eventDate = format(new Date(event.startAt), "EEEE, MMMM d, yyyy");
      const eventTime = format(new Date(event.startAt), "h:mm a");
      const eventLocation = event.venueName || event.city || undefined;
      const hostName = event.creator.name || event.creator.email;
      const rsvpDeadline = event.rsvpDeadline
        ? format(new Date(event.rsvpDeadline), "MMMM d, yyyy")
        : undefined;

      for (const invite of invites) {
        if (!invite.sentAt) continue;

        const sentAt = new Date(invite.sentAt);
        const timeSinceSent = now.getTime() - sentAt.getTime();

        // Calculate which reminder number we should be on
        // 1st reminder at reminderDays, 2nd at 2*reminderDays, etc.
        const expectedReminderNumber = Math.floor(timeSinceSent / reminderIntervalMs);

        if (expectedReminderNumber < 1) {
          // Not time for any reminder yet
          continue;
        }

        // Count how many reminders have already been sent
        const sentRemindersCount = await db.emailOutbox.count({
          where: {
            inviteId: invite.id,
            template: "NO_RESPONSE_REMINDER",
            status: { not: "FAILED" }, // Don't count failed attempts
          },
        });

        // If we haven't sent this reminder interval yet, queue it
        if (sentRemindersCount < expectedReminderNumber) {
          const reminderNumber = sentRemindersCount + 1;

          // Generate RSVP URL (we need to reconstruct from tokenHash)
          // Note: In production, you'd want to store/regenerate tokens more securely
          // For now, we'll use a placeholder that the invite page can handle
          const rsvpUrl = `${BASE_URL}/rsvp/remind/${invite.id}`;

          try {
            const emailId = await queueNoResponseReminderEmail(
              invite.id,
              invite.email,
              {
                guestName: invite.name || undefined,
                eventTitle: event.title,
                eventDate,
                eventTime,
                eventLocation,
                hostName,
                rsvpUrl,
                rsvpDeadline,
                reminderNumber,
              }
            );

            // Process immediately
            processEmail(emailId).catch((err) => {
              console.error(`Failed to send reminder email ${emailId}:`, err);
            });

            totalQueued++;
          } catch (err) {
            console.error(`Failed to queue reminder for invite ${invite.id}:`, err);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Queued ${totalQueued} reminder emails`,
      eventsProcessed: events.length,
    });
  } catch (error) {
    console.error("No-response reminder cron error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}
