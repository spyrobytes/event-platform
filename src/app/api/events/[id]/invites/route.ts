import { NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanPublish, assertProfileComplete } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { createInviteSchema, bulkInviteSchema, inviteQuerySchema } from "@/schemas/invite";
import { generateTokenPair } from "@/lib/tokens";
import { generateGuestRsvpCode, hashRsvpCode } from "@/lib/rsvp-code";
import {
  queueInviteEmail,
  scheduleEmailProcessing,
  buildUnsubscribeUrl,
  EMAIL_LAMBDA_MAX_DURATION_S,
} from "@/lib/email";
import { ConflictError } from "@/lib/errors";

export const maxDuration = EMAIL_LAMBDA_MAX_DURATION_S;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function buildInviteEmailContext(eventId: string) {
  const [event, invitationConfig] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        slug: true,
        description: true,
        startAt: true,
        timezone: true,
        venueName: true,
        address: true,
        city: true,
        rsvpDeadline: true,
        creator: { select: { name: true, email: true } },
      },
    }),
    db.invitationConfig.findUnique({
      where: { eventId },
      select: {
        ceremonyStartAt: true,
        ceremonyDate: true,
        ceremonyTime: true,
        ceremonyVenue: true,
        ceremonyAddress: true,
        receptionStartAt: true,
        receptionDate: true,
        receptionTime: true,
        receptionVenue: true,
        receptionAddress: true,
        rsvpDeadline: true,
      },
    }),
  ]);

  if (!event) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";
  // All datetimes are formatted in the event's timezone — Vercel functions
  // run in UTC, so without this a 23:59 PDT deadline would render as the
  // following day's date for any guest reading the email.
  const tz = event.timezone;
  const eventDate = formatInTimeZone(event.startAt, tz, "EEEE, MMMM d, yyyy");
  const eventTime = formatInTimeZone(event.startAt, tz, "h:mm a");
  const eventLocation = event.venueName || event.city || undefined;
  const hostName = event.creator.name || event.creator.email;

  // Prefer the user-typed wording from the Invitation Design panel
  // (e.g. "Saturday, the Twenty-First of June") over a date-fns reformat
  // of the structured datetime — this is what guests see on the invite page,
  // and the email must match it verbatim.
  const ceremonyHasAny =
    invitationConfig?.ceremonyStartAt ||
    invitationConfig?.ceremonyDate ||
    invitationConfig?.ceremonyTime ||
    invitationConfig?.ceremonyVenue;
  const ceremony = ceremonyHasAny
    ? {
        ceremonyDate:
          invitationConfig?.ceremonyDate ||
          (invitationConfig?.ceremonyStartAt
            ? formatInTimeZone(invitationConfig.ceremonyStartAt, tz, "EEEE, MMMM d, yyyy")
            : undefined),
        ceremonyTime:
          invitationConfig?.ceremonyTime ||
          (invitationConfig?.ceremonyStartAt
            ? formatInTimeZone(invitationConfig.ceremonyStartAt, tz, "h:mm a")
            : undefined),
        ceremonyVenue: invitationConfig?.ceremonyVenue || undefined,
        ceremonyAddress: invitationConfig?.ceremonyAddress || undefined,
      }
    : {};

  // Surface the main Event row's start time as a "Traditional" sub-event
  // when (a) wedding sub-events are configured AND (b) the main event
  // precedes the ceremony by at least 30 minutes. Captures the common case
  // of a separate cultural / traditional ceremony preceding the formal one;
  // the 30-minute threshold avoids treating "guests please arrive early"
  // padding as a distinct event. If there's no ceremonyStartAt to compare
  // against, fall back to receptionStartAt; if neither, skip — there's
  // nothing reliable to anchor the precedes-by-X check against.
  const ceremonyAnchor =
    invitationConfig?.ceremonyStartAt ?? invitationConfig?.receptionStartAt ?? null;
  const TRADITIONAL_MIN_LEAD_MS = 30 * 60 * 1000;
  const isMainEventDistinct =
    ceremonyAnchor !== null &&
    event.startAt.getTime() + TRADITIONAL_MIN_LEAD_MS <= ceremonyAnchor.getTime();
  const traditional = isMainEventDistinct
    ? {
        traditionalDate: eventDate,
        traditionalTime: eventTime,
        traditionalVenue: event.venueName || undefined,
        traditionalAddress: event.address || undefined,
      }
    : {};

  const receptionHasAny =
    invitationConfig?.receptionStartAt ||
    invitationConfig?.receptionDate ||
    invitationConfig?.receptionTime ||
    invitationConfig?.receptionVenue;
  const reception = receptionHasAny
    ? {
        receptionDate:
          invitationConfig?.receptionDate ||
          (invitationConfig?.receptionStartAt
            ? formatInTimeZone(invitationConfig.receptionStartAt, tz, "EEEE, MMMM d, yyyy")
            : undefined),
        receptionTime:
          invitationConfig?.receptionTime ||
          (invitationConfig?.receptionStartAt
            ? formatInTimeZone(invitationConfig.receptionStartAt, tz, "h:mm a")
            : undefined),
        receptionVenue: invitationConfig?.receptionVenue || undefined,
        receptionAddress: invitationConfig?.receptionAddress || undefined,
      }
    : {};

  const rsvpDeadline =
    invitationConfig?.rsvpDeadline ||
    (event.rsvpDeadline ? formatInTimeZone(event.rsvpDeadline, tz, "EEEE, MMMM d, yyyy") : undefined);

  return {
    eventTitle: event.title,
    eventDate,
    eventTime,
    eventLocation,
    eventDescription: event.description || undefined,
    hostName,
    baseUrl,
    publicRsvpUrl: `${baseUrl}/e/${event.slug}/rsvp`,
    logoUrl: `${baseUrl}/brand/eventfxr-logo.png`,
    rsvpDeadline,
    ...traditional,
    ...ceremony,
    ...reception,
  };
}

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

    const [invites, total, statusCounts, attendingCount] = await Promise.all([
      db.invite.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          status: true,
          plusOnesAllowed: true,
          seatAssignment: true,
          plannerNotes: true,
          sentAt: true,
          openedAt: true,
          expiresAt: true,
          createdAt: true,
          tokenRegenerateCount: true,
          rsvpCodeIssuedAt: true,
          rsvpCodeRegenerateCount: true,
          passId: true,
          rsvp: {
            select: {
              id: true,
              response: true,
              guestName: true,
              guestCount: true,
              additionalGuestNames: true,
              dietaryRestrictions: true,
              musicSuggestions: true,
              respondedAt: true,
            },
          },
          // Latest INVITE outbox row — used by the UI to gate the Resend
          // action to FAILED/BOUNCED states only.
          emails: {
            where: { template: "INVITE" },
            select: { id: true, status: true, error: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: query.limit,
        skip: query.offset,
      }),
      db.invite.count({ where }),
      // Unfiltered status counts for stats cards
      db.invite.groupBy({
        by: ["status"],
        where: { eventId },
        _count: { _all: true },
      }),
      db.rSVP.count({
        where: { eventId, response: "YES" },
      }),
    ]);

    // Build stats from groupBy result
    const statsMap: Record<string, number> = {};
    let statsTotal = 0;
    for (const group of statusCounts) {
      statsMap[group.status] = group._count._all;
      statsTotal += group._count._all;
    }

    // Cumulative funnel: each stage includes all stages beyond it
    const sent = (statsMap["SENT"] || 0)
      + (statsMap["OPENED"] || 0)
      + (statsMap["RESPONDED"] || 0)
      + (statsMap["BOUNCED"] || 0);
    const opened = (statsMap["OPENED"] || 0)
      + (statsMap["RESPONDED"] || 0);

    return successResponse({
      invites,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + invites.length < total,
      },
      stats: {
        total: statsTotal,
        pending: statsMap["PENDING"] || 0,
        sent,
        opened,
        responded: statsMap["RESPONDED"] || 0,
        attending: attendingCount,
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
    assertCanPublish(user);
    assertProfileComplete(user);

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

      // Check for existing *active* invites by email or phone. Revoked rows
      // are intentionally ignored so an organizer can re-invite the same
      // recipient after revoking — the partial unique index in the DB
      // enforces the same rule.
      const existingByEmail = emails.length > 0
        ? await db.invite.findMany({
            where: { eventId, email: { in: emails }, status: { not: "REVOKED" } },
            select: { email: true },
          })
        : [];
      const existingByPhone = phones.length > 0
        ? await db.invite.findMany({
            where: { eventId, phone: { in: phones }, status: { not: "REVOKED" } },
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

      // Create invites with tokens + public-portal RSVP codes. Both are
      // generated up-front; the raw values flow into the email payload and
      // never persist outside their hashes.
      const issuedAt = new Date();
      const invitesData = data.invites.map((invite) => {
        const { token, hash } = generateTokenPair();
        const rsvpCode = generateGuestRsvpCode();
        return {
          eventId,
          email: invite.email?.toLowerCase() ?? null,
          phone: invite.phone ?? null,
          name: invite.name,
          tokenHash: hash,
          rsvpCodeHash: hashRsvpCode(rsvpCode),
          rsvpCodeIssuedAt: issuedAt,
          plusOnesAllowed: invite.plusOnesAllowed ?? 0,
          expiresAt: invite.expiresAt,
          _rawToken: token,
          _rawRsvpCode: rsvpCode,
        };
      });

      // Insert invites (exclude raw tokens + raw codes from DB insert).
      const createdInvites = await db.$transaction(
        invitesData.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ _rawToken, _rawRsvpCode, ...inviteData }) =>
            db.invite.create({
              data: inviteData,
              select: {
                id: true,
                email: true,
                phone: true,
                name: true,
                status: true,
                plusOnesAllowed: true,
                seatAssignment: true,
                plannerNotes: true,
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
          .map((invite, i) => ({
            invite,
            token: invitesData[i]._rawToken,
            rsvpCode: invitesData[i]._rawRsvpCode,
          }))
          .filter((item) => !!item.invite.email);

        if (invitesWithEmail.length > 0) {
          const ctx = await buildInviteEmailContext(eventId);

          if (ctx) {
            const { baseUrl, ...emailFields } = ctx;

            for (const { invite, token, rsvpCode } of invitesWithEmail) {
              const emailId = await queueInviteEmail(invite.id, invite.email!, {
                guestName: invite.name || undefined,
                ...emailFields,
                rsvpUrl: `${baseUrl}/rsvp/${token}`,
                unsubscribeUrl: buildUnsubscribeUrl(token),
                rsvpCode,
              });

              scheduleEmailProcessing(emailId);

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

      // Check for existing *active* invite by email or phone. Revoked rows
      // are intentionally ignored so an organizer can re-invite the same
      // recipient after revoking — the partial unique index in the DB
      // enforces the same rule.
      if (email) {
        const existingByEmail = await db.invite.findFirst({
          where: { eventId, email, status: { not: "REVOKED" } },
          select: { id: true },
        });
        if (existingByEmail) {
          throw new ConflictError("An invite already exists for this email");
        }
      }
      if (phone) {
        const existingByPhone = await db.invite.findFirst({
          where: { eventId, phone, status: { not: "REVOKED" } },
          select: { id: true },
        });
        if (existingByPhone) {
          throw new ConflictError("An invite already exists for this phone number");
        }
      }

      const { token, hash } = generateTokenPair();
      const rsvpCode = generateGuestRsvpCode();

      const invite = await db.invite.create({
        data: {
          eventId,
          email,
          phone,
          name: data.name,
          tokenHash: hash,
          rsvpCodeHash: hashRsvpCode(rsvpCode),
          rsvpCodeIssuedAt: new Date(),
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
          seatAssignment: true,
          plannerNotes: true,
          createdAt: true,
        },
      });

      // Queue email only if invite has an email address
      const sendImmediately = body.sendImmediately === true;
      let emailQueued = false;

      if (sendImmediately && email) {
        const ctx = await buildInviteEmailContext(eventId);

        if (ctx) {
          const { baseUrl, ...emailFields } = ctx;

          const emailId = await queueInviteEmail(invite.id, email, {
            guestName: invite.name || undefined,
            ...emailFields,
            rsvpUrl: `${baseUrl}/rsvp/${token}`,
            unsubscribeUrl: buildUnsubscribeUrl(token),
            rsvpCode,
          });

          scheduleEmailProcessing(emailId);

          emailQueued = true;
        }
      }

      return successResponse({ ...invite, token, emailQueued }, 201);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
