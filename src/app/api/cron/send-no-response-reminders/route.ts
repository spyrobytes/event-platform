import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { queueNoResponseReminderEmail, scheduleEmailProcessing } from "@/lib/email";
import { formatEventDateLong, formatEventDateMedium, formatEventTime } from "@/lib/utils";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";

/**
 * GET /api/cron/send-no-response-reminders
 *
 * Cron job to send reminder emails to guests who haven't responded.
 * Authentication: Bearer token matching CRON_SECRET
 * Logic:
 * 1. Find events with reminderEnabled: true
 * 2. For each event, find invites where status is SENT or OPENED (no response yet)
 * 3. Check if enough time has passed based on reminderDays interval
 * 4. Count existing NO_RESPONSE_REMINDER emails for each invite
 * 5. If next interval reached and not already sent for that interval -> queue reminder
 * 6. Stop reminders when event starts or deadline passes
 */
export async function GET(request: NextRequest) {
  // Verify cron authorization (fail-closed)
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

      // Find invites that haven't responded OR responded with MAYBE
      const invites = await db.invite.findMany({
        where: {
          eventId: event.id,
          sentAt: { not: null },
          unsubscribedAt: null,
          OR: [
            { status: { in: ["SENT", "OPENED"] }, rsvp: null },
            { status: "RESPONDED", rsvp: { response: "MAYBE" } },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          sentAt: true,
          tokenHash: true,
          rsvp: { select: { response: true } },
        },
      });

      if (invites.length === 0) continue;

      const reminderDays = event.reminderDays!;
      const reminderIntervalMs = reminderDays * 24 * 60 * 60 * 1000;

      // Prepare event details for email — all formatted in event.timezone
      // so guests see the venue's wall-clock time, not the server's UTC.
      const eventDate = formatEventDateLong(event.startAt, event.timezone);
      const eventTime = formatEventTime(event.startAt, event.timezone);
      const eventLocation = event.venueName || event.city || undefined;
      const hostName = event.creator.name || event.creator.email;
      const rsvpDeadline = event.rsvpDeadline
        ? formatEventDateMedium(event.rsvpDeadline, event.timezone)
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

          // Skip invites without an email address (phone-only)
          if (!invite.email) continue;

          // Retrieve the RSVP URL from the original INVITE email payload
          const originalEmail = await db.emailOutbox.findFirst({
            where: {
              inviteId: invite.id,
              template: "INVITE",
            },
            select: { payload: true },
            orderBy: { createdAt: "asc" },
          });

          const originalPayload = originalEmail?.payload as Record<string, unknown> | null;
          const rsvpUrl = (originalPayload?.rsvpUrl as string) || null;

          if (!rsvpUrl) {
            console.warn(`No RSVP URL found for invite ${invite.id}, skipping reminder`);
            continue;
          }

          // Derive unsubscribe URL from the RSVP URL token
          const rsvpToken = rsvpUrl.split("/rsvp/").pop();
          const unsubscribeUrl = rsvpToken ? `${BASE_URL}/unsubscribe/${rsvpToken}` : undefined;

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
                unsubscribeUrl,
              }
            );

            // Schedule post-response delivery so the cron returns quickly.
            scheduleEmailProcessing(emailId);

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
