import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { getEmailStats, processEmail, resendEmail } from "@/lib/email";
import { NotFoundError } from "@/lib/errors";

const emailActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resend"), emailId: z.string().min(1) }),
  z.object({ action: z.literal("process") }),
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/emails
 * Get email statistics for an event
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;

    await requireEventOwner(eventId, user.id);

    // Get email stats
    const stats = await getEmailStats(eventId);

    // Get recent emails with details
    const recentEmails = await db.emailOutbox.findMany({
      where: {
        invite: { eventId },
      },
      select: {
        id: true,
        template: true,
        toEmail: true,
        subject: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        error: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return successResponse({
      stats,
      emails: recentEmails,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events/[id]/emails
 * Process queued emails or resend failed emails
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { id: eventId } = await context.params;
    const body = await request.json();

    await requireEventOwner(eventId, user.id);

    // Validate and handle actions
    const data = emailActionSchema.parse(body);

    if (data.action === "resend") {
      const { emailId } = data;

      // Verify the email belongs to this event
      const email = await db.emailOutbox.findUnique({
        where: { id: emailId },
        include: { invite: { select: { eventId: true } } },
      });

      if (!email || email.invite?.eventId !== eventId) {
        throw new NotFoundError("Email not found");
      }

      const newEmailId = await resendEmail(emailId);

      // Process it immediately
      await processEmail(newEmailId);

      return successResponse({ message: "Email resent", emailId: newEmailId });
    }

    if (data.action === "process") {
      // Process queued emails for this event
      const queuedEmails = await db.emailOutbox.findMany({
        where: {
          status: "QUEUED",
          invite: { eventId },
        },
        take: 10,
      });

      let processed = 0;
      const errors: string[] = [];

      for (const email of queuedEmails) {
        try {
          await processEmail(email.id);
          processed++;
        } catch (error) {
          errors.push(`${email.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }

      return successResponse({
        message: `Processed ${processed} emails`,
        processed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
