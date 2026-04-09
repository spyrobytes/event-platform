import { NextRequest } from "next/server";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { createInviteSchema, bulkInviteSchema, inviteQuerySchema } from "@/schemas/invite";
import { generateTokenPair } from "@/lib/tokens";
import { queueInviteEmail, processEmail, buildUnsubscribeUrl } from "@/lib/email";
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
          phone: true,
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
              additionalGuestNames: true,
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

      // Check for duplicate emails/phones within the request
      const emails = data.invites.map((i) => i.email?.toLowerCase()).filter(Boolean) as string[];
      const phones = data.invites.map((i) => i.phone).filter(Boolean) as string[];
      if (new Set(emails).size !== emails.length) {
        return errorResponse("Duplicate emails in request", 400, "DUPLICATE_EMAILS");
      }
      if (new Set(phones).size !== phones.length) {
        return errorResponse("Duplicate phone numbers in request", 400, "DUPLICATE_PHONES");
      }

      // Check for existing invites by email or phone
      const existingByEmail = emails.length > 0
        ? await db.invite.findMany({
            where: { eventId, email: { in: emails } },
            select: { email: true },
          })
        : [];
      const existingByPhone = phones.length > 0
        ? await db.invite.findMany({
            where: { eventId, phone: { in: phones } },
            select: { phone: true },
          })
        : [];

      const conflicts: string[] = [
        ...existingByEmail.map((i) => i.email!),
        ...existingByPhone.map((i) => i.phone!),
      ];
      if (conflicts.length > 0) {
        throw new ConflictError(
          `Invites already exist for: ${conflicts.join(", ")}`
        );
      }

      // Create invites with tokens
      const invitesData = data.invites.map((invite) => {
        const { token, hash } = generateTokenPair();
        return {
          eventId,
          email: invite.email?.toLowerCase() ?? null,
          phone: invite.phone ?? null,
          name: invite.name,
          tokenHash: hash,
          plusOnesAllowed: invite.plusOnesAllowed ?? 0,
          expiresAt: invite.expiresAt,
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
              phone: true,
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

      // Queue emails for invites that have an email address
      let emailsQueued = 0;
      if (data.sendImmediately) {
        const invitesWithEmail = createdInvites
          .map((invite, i) => ({ invite, token: invitesData[i]._rawToken }))
          .filter((item) => !!item.invite.email);

        if (invitesWithEmail.length > 0) {
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

            for (const { invite, token } of invitesWithEmail) {
              const emailId = await queueInviteEmail(invite.id, invite.email!, {
                guestName: invite.name || undefined,
                eventTitle: event.title,
                eventDate,
                eventTime,
                eventLocation,
                eventDescription: event.description || undefined,
                hostName,
                rsvpUrl: `${baseUrl}/rsvp/${token}`,
                unsubscribeUrl: buildUnsubscribeUrl(token),
              });

              processEmail(emailId).catch((err) => {
                console.error(`Failed to send invite email ${emailId}:`, err);
              });

              emailsQueued++;
            }
          }
        }
      }

      return successResponse(
        {
          invites: invitesWithTokens,
          count: createdInvites.length,
          emailsQueued,
        },
        201
      );
    } else {
      // Single invite
      const data = createInviteSchema.parse(body);
      const email = data.email?.toLowerCase() ?? null;
      const phone = data.phone ?? null;

      // Check for existing invite by email or phone
      if (email) {
        const existingByEmail = await db.invite.findUnique({
          where: { eventId_email: { eventId, email } },
        });
        if (existingByEmail) {
          throw new ConflictError("An invite already exists for this email");
        }
      }
      if (phone) {
        const existingByPhone = await db.invite.findUnique({
          where: { eventId_phone: { eventId, phone } },
        });
        if (existingByPhone) {
          throw new ConflictError("An invite already exists for this phone number");
        }
      }

      const { token, hash } = generateTokenPair();

      const invite = await db.invite.create({
        data: {
          eventId,
          email,
          phone,
          name: data.name,
          tokenHash: hash,
          plusOnesAllowed: data.plusOnesAllowed ?? 0,
          expiresAt: data.expiresAt,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          status: true,
          plusOnesAllowed: true,
          createdAt: true,
        },
      });

      // Queue email only if invite has an email address
      const sendImmediately = body.sendImmediately === true;
      let emailQueued = false;

      if (sendImmediately && email) {
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

          const emailId = await queueInviteEmail(invite.id, email, {
            guestName: invite.name || undefined,
            eventTitle: event.title,
            eventDate,
            eventTime,
            eventLocation,
            eventDescription: event.description || undefined,
            hostName,
            rsvpUrl: `${baseUrl}/rsvp/${token}`,
            unsubscribeUrl: buildUnsubscribeUrl(token),
          });

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
