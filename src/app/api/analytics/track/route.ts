import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";

/**
 * Analytics event types
 */
const VALID_EVENT_TYPES = [
  "page_view",
  "rsvp_form_started",
  "rsvp_form_abandoned",
  "rsvp_form_submitted",
  "section_viewed",
] as const;

/**
 * Validation schema for tracking events
 */
const trackEventSchema = z.object({
  eventId: z.string().min(1, "Event ID is required"),
  type: z.enum(VALID_EVENT_TYPES),
  sessionId: z.string().min(1, "Session ID is required"),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
});

/**
 * POST /api/analytics/track
 *
 * Track an analytics event for an event page.
 * No authentication required - uses anonymous session IDs.
 * Rate limiting recommended in production.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, type, sessionId, data } = trackEventSchema.parse(body);

    // Verify event exists and is published (prevent tracking for non-existent events)
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, publishedAt: true },
    });

    if (!event) {
      return errorResponse("Event not found", 404, "NOT_FOUND");
    }

    // Only track for published events (or allow all in development)
    if (!event.publishedAt && process.env.NODE_ENV === "production") {
      return errorResponse("Event not published", 400, "EVENT_NOT_PUBLISHED");
    }

    // Create analytics event
    const analyticsEvent = await db.analyticsEvent.create({
      data: {
        eventId,
        type,
        sessionId,
        data: data ? (data as object) : undefined,
      },
    });

    return successResponse({ id: analyticsEvent.id }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(
        "Invalid request body",
        400,
        "VALIDATION_ERROR",
        error.issues
      );
    }
    return handleApiError(error);
  }
}
