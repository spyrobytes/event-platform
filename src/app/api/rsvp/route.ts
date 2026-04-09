import { NextRequest } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { successResponse, handleApiError } from "@/lib/api-response";
import { submitRsvpSchema, publicRsvpSchema } from "@/schemas/rsvp";
import { hashToken } from "@/lib/tokens";
import { queueConfirmationEmail, processEmail, buildUnsubscribeUrl } from "@/lib/email";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { buildPortalUrl } from "@/lib/guest-access";

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

      // Find the invite (without capacity — that's checked under lock in the transaction)
      const invite = await db.invite.findUnique({
        where: { tokenHash },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              maxAttendees: true,
              rsvpDeadline: true,
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

      // Check if invite has been revoked
      if (invite.status === "REVOKED") {
        throw new ValidationError("This invitation is no longer valid");
      }

      // Check if event is valid
      if (invite.event.status === "CANCELLED") {
        throw new ValidationError("This event has been cancelled");
      }

      // Check if RSVP deadline has passed
      if (invite.event.rsvpDeadline && new Date(invite.event.rsvpDeadline) < new Date()) {
        throw new ValidationError("The RSVP deadline for this event has passed");
      }

      // Validate guest count against plus ones allowed
      if (data.guestCount > invite.plusOnesAllowed + 1) {
        throw new ValidationError(
          `You can only bring up to ${invite.plusOnesAllowed} additional guest(s)`
        );
      }

      // Build portal URL for emails and API response
      const portalUrl = buildPortalUrl(invite.event.slug, inviteToken as string);

      // Atomic transaction: capacity check under lock + RSVP upsert + invite status + email outbox
      const { rsvp, emailId } = await db.$transaction(async (tx) => {
        // Lock the event row to prevent concurrent capacity overflows
        if (data.response === "YES" && invite.event.maxAttendees) {
          const [lockedEvent] = await tx.$queryRaw<
            { max_attendees: number | null }[]
          >`SELECT max_attendees FROM events WHERE id = ${invite.event.id} FOR UPDATE`;

          const maxAttendees = lockedEvent?.max_attendees;
          if (maxAttendees) {
            const [{ count: currentAttendees }] = await tx.$queryRaw<
              { count: bigint }[]
            >`SELECT COUNT(*) as count FROM rsvps WHERE event_id = ${invite.event.id} AND response = 'YES'`;

            const existingGuestCount = invite.rsvp?.guestCount || 0;
            const newGuests = data.guestCount - existingGuestCount;

            if (Number(currentAttendees) + newGuests > maxAttendees) {
              throw new ValidationError(
                "Sorry, this event has reached its maximum capacity"
              );
            }
          }
        }

        // Clear guest names if not attending or only 1 guest
        const guestNames =
          data.response === "YES" && data.guestCount > 1
            ? data.additionalGuestNames
            : [];

        // Create or update RSVP
        const rsvpResult = await tx.rSVP.upsert({
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
            additionalGuestNames: guestNames,
            dietaryRestrictions: data.dietaryRestrictions,
            notes: data.notes,
          },
          update: {
            response: data.response,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
            guestCount: data.guestCount,
            additionalGuestNames: guestNames,
            dietaryRestrictions: data.dietaryRestrictions,
            notes: data.notes,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            response: true,
            guestName: true,
            guestCount: true,
            additionalGuestNames: true,
            respondedAt: true,
          },
        });

        // Update invite status + curate guest-provided email for phone-only invites
        await tx.invite.update({
          where: { id: invite.id },
          data: {
            status: "RESPONDED",
            ...(data.guestEmail && !invite.email && { email: data.guestEmail }),
          },
        });

        // Queue confirmation email inside the transaction
        let queuedEmailId: string | null = null;
        const recipientEmail = data.guestEmail || invite.email;
        if (recipientEmail) {
          const fullEvent = await tx.event.findUnique({
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

            queuedEmailId = await queueConfirmationEmail(
              invite.id,
              recipientEmail,
              {
                guestName: data.guestName,
                eventTitle: invite.event.title,
                eventDate,
                eventTime,
                eventLocation,
                response: data.response,
                guestCount: data.guestCount || 1,
                hostName,
                portalUrl,
                unsubscribeUrl: buildUnsubscribeUrl(inviteToken as string),
              },
              tx
            );
          }
        }

        return { rsvp: rsvpResult, emailId: queuedEmailId };
      });

      // Fire-and-forget email delivery (outside transaction — outbox row is committed)
      if (emailId) {
        processEmail(emailId).catch((err) => {
          console.error(`Failed to send confirmation email ${emailId}:`, err);
        });
      }

      return successResponse({
        rsvp,
        event: {
          id: invite.event.id,
          title: invite.event.title,
          slug: invite.event.slug,
        },
        portalUrl,
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
          rsvpDeadline: true,
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

      // Check if RSVP deadline has passed
      if (event.rsvpDeadline && new Date(event.rsvpDeadline) < new Date()) {
        throw new ValidationError("The RSVP deadline for this event has passed");
      }

      // Atomic transaction: capacity check under lock + RSVP upsert
      const rsvp = await db.$transaction(async (tx) => {
        // Check capacity under row lock to prevent overselling
        if (data.response === "YES" && event.maxAttendees) {
          await tx.$queryRaw`SELECT id FROM events WHERE id = ${event.id} FOR UPDATE`;

          const [{ count: currentAttendees }] = await tx.$queryRaw<
            { count: bigint }[]
          >`SELECT COUNT(*) as count FROM rsvps WHERE event_id = ${event.id} AND response = 'YES'`;

          if (Number(currentAttendees) + data.guestCount > event.maxAttendees) {
            throw new ValidationError(
              "Sorry, this event has reached its maximum capacity"
            );
          }
        }

        // Clear guest names if not attending or only 1 guest
        const publicGuestNames =
          data.response === "YES" && data.guestCount > 1
            ? data.additionalGuestNames
            : [];

        // Check for existing RSVP with same email
        const existingRsvp = await tx.rSVP.findFirst({
          where: {
            eventId: data.eventId,
            guestEmail: data.guestEmail,
          },
        });

        if (existingRsvp) {
          return tx.rSVP.update({
            where: { id: existingRsvp.id },
            data: {
              response: data.response,
              guestName: data.guestName,
              guestCount: data.guestCount,
              additionalGuestNames: publicGuestNames,
              dietaryRestrictions: data.dietaryRestrictions,
              notes: data.notes,
              updatedAt: new Date(),
            },
            select: {
              id: true,
              response: true,
              guestName: true,
              guestCount: true,
              additionalGuestNames: true,
              respondedAt: true,
            },
          });
        }

        return tx.rSVP.create({
          data: {
            eventId: data.eventId,
            response: data.response,
            guestName: data.guestName,
            guestEmail: data.guestEmail,
            guestCount: data.guestCount,
            additionalGuestNames: publicGuestNames,
            dietaryRestrictions: data.dietaryRestrictions,
            notes: data.notes,
          },
          select: {
            id: true,
            response: true,
            guestName: true,
            guestCount: true,
            additionalGuestNames: true,
            respondedAt: true,
          },
        });
      });

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
