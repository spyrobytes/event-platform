import { NextRequest } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { successResponse, handleApiError } from "@/lib/api-response";
import { submitRsvpSchema, publicRsvpSchema } from "@/schemas/rsvp";
import { hashToken } from "@/lib/tokens";
import { queueConfirmationEmail, processEmail } from "@/lib/email";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * POST /api/rsvp
 * Submit an RSVP (public endpoint)
 * Supports both invite-based and public RSVPs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Determine if this is an invite-based or public RSVP
    const isInviteBased = !!body.inviteToken || !!body.token;

    if (isInviteBased) {
      // Invite-based RSVP
      const inviteToken = body.inviteToken || body.token;
      const data = submitRsvpSchema.parse(body);
      const tokenHash = hashToken(inviteToken as string);

      // Find the invite
      const invite = await db.invite.findUnique({
        where: { tokenHash },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              status: true,
              maxAttendees: true,
              _count: {
                select: {
                  rsvps: { where: { response: "YES" } },
                },
              },
            },
          },
          rsvp: true,
        },
      });

      if (!invite) {
        throw new NotFoundError("Invite not found or has expired");
      }

      // Check if invite has expired
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        throw new ValidationError("This invite has expired");
      }

      // Check if event is valid
      if (invite.event.status === "CANCELLED") {
        throw new ValidationError("This event has been cancelled");
      }

      // Validate guest count against plus ones allowed
      if (data.guestCount > invite.plusOnesAllowed + 1) {
        throw new ValidationError(
          `You can only bring up to ${invite.plusOnesAllowed} additional guest(s)`
        );
      }

      // Check capacity for YES responses
      if (data.response === "YES" && invite.event.maxAttendees) {
        const currentAttendees = invite.event._count.rsvps;
        const existingGuestCount = invite.rsvp?.guestCount || 0;
        const newGuests = data.guestCount - existingGuestCount;

        if (currentAttendees + newGuests > invite.event.maxAttendees) {
          throw new ValidationError(
            "Sorry, this event has reached its maximum capacity"
          );
        }
      }

      // Create or update RSVP
      const rsvp = await db.rSVP.upsert({
        where: {
          inviteId: invite.id,
        },
        create: {
          inviteId: invite.id,
          eventId: invite.event.id,
          response: data.response,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestCount: data.guestCount,
          notes: data.notes,
        },
        update: {
          response: data.response,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestCount: data.guestCount,
          notes: data.notes,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          response: true,
          guestName: true,
          guestCount: true,
          respondedAt: true,
        },
      });

      // Update invite status
      await db.invite.update({
        where: { id: invite.id },
        data: { status: "RESPONDED" },
      });

      // Queue confirmation email
      if (data.guestEmail || invite.email) {
        const fullEvent = await db.event.findUnique({
          where: { id: invite.event.id },
          select: {
            startAt: true,
            timezone: true,
            venueName: true,
            city: true,
            creator: { select: { name: true, email: true } },
          },
        });

        if (fullEvent) {
          const eventDate = format(new Date(fullEvent.startAt), "EEEE, MMMM d, yyyy");
          const eventTime = format(new Date(fullEvent.startAt), "h:mm a");
          const eventLocation = fullEvent.venueName || fullEvent.city || undefined;
          const hostName = fullEvent.creator.name || fullEvent.creator.email;

          const emailId = await queueConfirmationEmail(
            invite.id,
            data.guestEmail || invite.email,
            {
              guestName: data.guestName,
              eventTitle: invite.event.title,
              eventDate,
              eventTime,
              eventLocation,
              response: data.response,
              guestCount: data.guestCount || 1,
              hostName,
            }
          );

          // Process immediately
          processEmail(emailId).catch((err) => {
            console.error(`Failed to send confirmation email ${emailId}:`, err);
          });
        }
      }

      return successResponse({
        rsvp,
        event: {
          id: invite.event.id,
          title: invite.event.title,
        },
        message:
          data.response === "YES"
            ? "You're going! We'll see you there."
            : data.response === "NO"
              ? "Thanks for letting us know."
              : "Thanks for your response. We hope to see you!",
      });
    } else {
      // Public RSVP (for public events without invite)
      const data = publicRsvpSchema.parse(body);

      // Get the event
      const event = await db.event.findUnique({
        where: { id: data.eventId },
        select: {
          id: true,
          title: true,
          status: true,
          visibility: true,
          maxAttendees: true,
          _count: {
            select: {
              rsvps: { where: { response: "YES" } },
            },
          },
        },
      });

      if (!event) {
        throw new NotFoundError("Event not found");
      }

      // Check if event allows public RSVPs
      if (event.visibility === "PRIVATE") {
        throw new ValidationError("This event requires an invitation");
      }

      if (event.status !== "PUBLISHED") {
        throw new ValidationError("This event is not accepting RSVPs");
      }

      // Check capacity
      if (data.response === "YES" && event.maxAttendees) {
        if (event._count.rsvps + data.guestCount > event.maxAttendees) {
          throw new ValidationError(
            "Sorry, this event has reached its maximum capacity"
          );
        }
      }

      // Check for existing RSVP with same email
      const existingRsvp = await db.rSVP.findFirst({
        where: {
          eventId: data.eventId,
          guestEmail: data.guestEmail,
        },
      });

      let rsvp;
      if (existingRsvp) {
        // Update existing RSVP
        rsvp = await db.rSVP.update({
          where: { id: existingRsvp.id },
          data: {
            response: data.response,
            guestName: data.guestName,
            guestCount: data.guestCount,
            notes: data.notes,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            response: true,
            guestName: true,
            guestCount: true,
            respondedAt: true,
          },
        });
      } else {
        // Create new RSVP
        rsvp = await db.rSVP.create({
          data: {
            eventId: data.eventId,
            response: data.response,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
            guestCount: data.guestCount,
            notes: data.notes,
          },
          select: {
            id: true,
            response: true,
            guestName: true,
            guestCount: true,
            respondedAt: true,
          },
        });
      }

      return successResponse({
        rsvp,
        event: {
          id: event.id,
          title: event.title,
        },
        message:
          data.response === "YES"
            ? "You're going! We'll see you there."
            : data.response === "NO"
              ? "Thanks for letting us know."
              : "Thanks for your response. We hope to see you!",
      });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
