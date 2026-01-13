import { NextRequest } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { createInviteSchema, bulkInviteSchema, inviteQuerySchema } from "@/schemas/invite";
import { generateTokenPair } from "@/lib/tokens";
import { queueInviteEmail, processEmail } from "@/lib/email";
import { ConflictError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/invites
 * List invites for an event (owner only)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    const { searchParams } = new URL(request.url);
    const query = inviteQuerySchema.parse(Object.fromEntries(searchParams));

    const where = {
      eventId,
      ...(query.status && { status: query.status }),
    };

    const [invites, total] = await Promise.all([
      db.invite.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          plusOnesAllowed: true,
          sentAt: true,
          openedAt: true,
          expiresAt: true,
          createdAt: true,
          rsvp: {
            select: {
              id: true,
              response: true,
              guestName: true,
              guestCount: true,
              respondedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.invite.count({ where }),
    ]);

    return successResponse({
      invites,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + invites.length < total,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events/[id]/invites
 * Create invites for an event (owner only)
 * Supports single invite or bulk invites
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, user.id);

    const body = await request.json();

    // Check if it's a bulk invite request
    const isBulk = Array.isArray(body.invites);

    if (isBulk) {
      // Bulk invite
      const data = bulkInviteSchema.parse(body);

      // Check for duplicate emails within the request
      const emails = data.invites.map((i) => i.email.toLowerCase());
      const uniqueEmails = new Set(emails);
      if (uniqueEmails.size !== emails.length) {
        return errorResponse("Duplicate emails in request", 400, "DUPLICATE_EMAILS");
      }

      // Check for existing invites
      const existingInvites = await db.invite.findMany({
        where: {
          eventId,
          email: { in: emails },
        },
        select: { email: true },
      });

      if (existingInvites.length > 0) {
        const existingEmails = existingInvites.map((i) => i.email);
        throw new ConflictError(
          `Invites already exist for: ${existingEmails.join(", ")}`
        );
      }

      // Create invites with tokens
      const invitesData = data.invites.map((invite) => {
        const { token, hash } = generateTokenPair();
        return {
          eventId,
          email: invite.email.toLowerCase(),
          name: invite.name,
          tokenHash: hash,
          plusOnesAllowed: invite.plusOnesAllowed ?? 0,
          expiresAt: invite.expiresAt,
          // Store raw token temporarily for response (not saved to DB)
          _rawToken: token,
        };
      });

      // Insert invites (exclude raw tokens from DB insert)
      const createdInvites = await db.$transaction(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        invitesData.map(({ _rawToken, ...inviteData }) =>
          db.invite.create({
            data: inviteData,
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
              plusOnesAllowed: true,
              createdAt: true,
            },
          })
        )
      );

      // Combine with tokens for response
      const invitesWithTokens = createdInvites.map((invite, index) => ({
        ...invite,
        token: invitesData[index]._rawToken,
      }));

      // Queue emails if sendImmediately is true
      if (data.sendImmediately) {
        const event = await db.event.findUnique({
          where: { id: eventId },
          select: {
            title: true,
            description: true,
            startAt: true,
            timezone: true,
            venueName: true,
            city: true,
            creator: { select: { name: true, email: true } },
          },
        });

        if (event) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";
          const eventDate = format(new Date(event.startAt), "EEEE, MMMM d, yyyy");
          const eventTime = format(new Date(event.startAt), "h:mm a");
          const eventLocation = event.venueName || event.city || undefined;
          const hostName = event.creator.name || event.creator.email;

          for (let i = 0; i < createdInvites.length; i++) {
            const invite = createdInvites[i];
            const token = invitesData[i]._rawToken;

            const emailId = await queueInviteEmail(invite.id, invite.email, {
              guestName: invite.name || undefined,
              eventTitle: event.title,
              eventDate,
              eventTime,
              eventLocation,
              eventDescription: event.description || undefined,
              hostName,
              rsvpUrl: `${baseUrl}/rsvp/${token}`,
            });

            // Process immediately
            processEmail(emailId).catch((err) => {
              console.error(`Failed to send invite email ${emailId}:`, err);
            });
          }
        }
      }

      return successResponse(
        {
          invites: invitesWithTokens,
          count: createdInvites.length,
          emailsQueued: data.sendImmediately ? createdInvites.length : 0,
        },
        201
      );
    } else {
      // Single invite
      const data = createInviteSchema.parse(body);
      const email = data.email.toLowerCase();

      // Check for existing invite
      const existingInvite = await db.invite.findUnique({
        where: {
          eventId_email: { eventId, email },
        },
      });

      if (existingInvite) {
        throw new ConflictError("An invite already exists for this email");
      }

      const { token, hash } = generateTokenPair();

      const invite = await db.invite.create({
        data: {
          eventId,
          email,
          name: data.name,
          tokenHash: hash,
          plusOnesAllowed: data.plusOnesAllowed ?? 0,
          expiresAt: data.expiresAt,
        },
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          plusOnesAllowed: true,
          createdAt: true,
        },
      });

      // Queue email if sendImmediately is true (from body, not schema)
      const sendImmediately = body.sendImmediately === true;
      let emailQueued = false;

      if (sendImmediately) {
        const event = await db.event.findUnique({
          where: { id: eventId },
          select: {
            title: true,
            description: true,
            startAt: true,
            timezone: true,
            venueName: true,
            city: true,
            creator: { select: { name: true, email: true } },
          },
        });

        if (event) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventsfixer.com";
          const eventDate = format(new Date(event.startAt), "EEEE, MMMM d, yyyy");
          const eventTime = format(new Date(event.startAt), "h:mm a");
          const eventLocation = event.venueName || event.city || undefined;
          const hostName = event.creator.name || event.creator.email;

          const emailId = await queueInviteEmail(invite.id, invite.email, {
            guestName: invite.name || undefined,
            eventTitle: event.title,
            eventDate,
            eventTime,
            eventLocation,
            eventDescription: event.description || undefined,
            hostName,
            rsvpUrl: `${baseUrl}/rsvp/${token}`,
          });

          // Process immediately
          processEmail(emailId).catch((err) => {
            console.error(`Failed to send invite email ${emailId}:`, err);
          });

          emailQueued = true;
        }
      }

      return successResponse({ ...invite, token, emailQueued }, 201);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
