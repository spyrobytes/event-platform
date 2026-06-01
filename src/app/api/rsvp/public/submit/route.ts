import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { env } from "@/env";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { publicPortalSubmitSchema } from "@/schemas/rsvp";
import {
  consumeRsvpSession,
  lookupRsvpSession,
  RSVP_SESSION_COOKIE,
} from "@/lib/rsvp-session";
import {
  queueConfirmationEmail,
  scheduleEmailProcessing,
  buildUnsubscribeUrl,
} from "@/lib/email";
import { AppError } from "@/lib/errors";
import { generateTokenPair } from "@/lib/tokens";
import { buildPortalUrl } from "@/lib/guest-access";

const GENERIC_INVALID_MESSAGE =
  "Your RSVP couldn't be processed. Please re-enter your invitation code and try again.";

function genericInvalid(): NextResponse {
  return errorResponse(GENERIC_INVALID_MESSAGE, 400, "INVALID");
}

function clearSessionCookie(response: NextResponse): NextResponse {
  // The session is single-submit; clear the cookie regardless of outcome so
  // the browser doesn't keep sending a now-consumed (or invalid) token.
  response.cookies.set(RSVP_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/rsvp/public",
    maxAge: 0,
  });
  return response;
}

/**
 * POST /api/rsvp/public/submit
 * Public endpoint. Consumes an RsvpSession created by verify-code and writes
 * the RSVP. Mirrors the invite-token path's transaction semantics (capacity
 * lock, atomic email-outbox queueing) but identifies the invite via the
 * session rather than a raw token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = publicPortalSubmitSchema.parse(body);

    // Honeypot — collapse to the same generic error as a malformed body so
    // a bot can't differentiate "field tripped" from "invalid input."
    if (data.hp && data.hp.length > 0) {
      return clearSessionCookie(genericInvalid());
    }

    // Cookie is the primary transport (httpOnly, scoped to /api/rsvp/public);
    // the body field is a fallback for clients that strip cookies.
    const sessionToken =
      request.cookies.get(RSVP_SESSION_COOKIE)?.value ?? data.rsvpSessionToken;
    if (!sessionToken) {
      return clearSessionCookie(
        errorResponse(
          "Session expired. Please re-enter your invitation code.",
          401,
          "SESSION_INVALID"
        )
      );
    }

    // Mint a fresh portal-access token. The public flow never receives the
    // original raw invite token (only an HMAC'd RSVP code), so we issue one
    // now and rotate the invite's `tokenHash` to its hash. This matches the
    // /regenerate pattern (tokenHash is already designed to be rotated) and
    // gives us a raw token to embed in the confirmation email's "View Event
    // Details" link, the unsubscribe link, and the post-submit redirect URL.
    // Note: rotating invalidates any previously-sent tokenized email link
    // for this invite — acceptable here because (a) the guest just RSVP'd, so
    // the old link would only show "Already Responded", and (b) the new
    // confirmation email carries the replacement link.
    const { token: portalToken, hash: portalTokenHash } = generateTokenPair();

    const { rsvp, eventSummary, emailId } = await db.$transaction(async (tx) => {
      // 1. Re-validate the session inside the transaction. lookupRsvpSession
      //    returns null for missing / expired / already-consumed.
      const session = await lookupRsvpSession(tx, sessionToken);
      if (!session) {
        throw new AppError(
          "Session expired. Please re-enter your invitation code.",
          "SESSION_INVALID",
          401
        );
      }

      // 2. Re-fetch invite + event. State could have changed between
      //    verify-code and submit (organizer revoke, deadline pass, capacity
      //    fill via concurrent RSVPs). Don't trust session-only state.
      const invite = await tx.invite.findUnique({
        where: { id: session.inviteId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              maxAttendees: true,
              rsvpDeadline: true,
              startAt: true,
              timezone: true,
              venueName: true,
              city: true,
              creator: { select: { name: true, email: true } },
            },
          },
          rsvp: true,
        },
      });

      if (!invite || invite.status === "REVOKED") {
        throw new AppError("This invitation is no longer valid.", "INVITE_INVALID", 400);
      }
      if (invite.expiresAt && invite.expiresAt < new Date()) {
        throw new AppError("This invitation has expired.", "INVITE_INVALID", 400);
      }
      if (invite.event.status !== "PUBLISHED") {
        throw new AppError(
          "This event is no longer accepting RSVPs.",
          "INVITE_INVALID",
          400
        );
      }
      if (invite.event.rsvpDeadline && invite.event.rsvpDeadline < new Date()) {
        throw new AppError(
          "RSVPs for this event are closed.",
          "DEADLINE_PASSED",
          400
        );
      }
      if (invite.event.startAt < new Date()) {
        throw new AppError(
          "This event has already taken place.",
          "EVENT_ENDED",
          400
        );
      }

      // 3. Party size against this invite's plus-ones allowance.
      if (data.guestCount > invite.plusOnesAllowed + 1) {
        throw new AppError(
          `You can bring up to ${invite.plusOnesAllowed} additional guest${invite.plusOnesAllowed === 1 ? "" : "s"}.`,
          "PARTY_SIZE_INVALID",
          400
        );
      }

      // 4. Consume the session BEFORE any heavy work. Conditional update
      //    (where usedAt IS NULL) serializes two concurrent submits at the
      //    row lock level — exactly one wins. The loser rolls back here, so
      //    no double upsert and no double email queue.
      const consumed = await consumeRsvpSession(tx, session.id);
      if (!consumed) {
        throw new AppError(
          "Session expired. Please re-enter your invitation code.",
          "SESSION_INVALID",
          401
        );
      }

      // 5. Capacity check under row lock — matches the invite-token path so
      //    both entry points produce identical state under contention.
      if (data.response === "YES" && invite.event.maxAttendees) {
        const [lockedEvent] = await tx.$queryRaw<
          { max_attendees: number | null }[]
        >`SELECT max_attendees FROM events WHERE id = ${invite.event.id} FOR UPDATE`;

        const maxAttendees = lockedEvent?.max_attendees;
        if (maxAttendees) {
          // Sum the seats already taken — guest_count per attending row, not a
          // count of rows. A party with plus-ones occupies more than one seat,
          // so COUNT(*) would let plus-ones silently overbook the event.
          const [{ seats: takenSeats }] = await tx.$queryRaw<
            { seats: bigint }[]
          >`SELECT COALESCE(SUM(guest_count), 0) as seats FROM rsvps WHERE event_id = ${invite.event.id} AND response = 'YES'`;
          // Only this invite's *currently attending* seats are already in the
          // sum; subtract them (zero unless it's an existing YES) so a re-submit
          // or a NO/MAYBE→YES change is counted exactly once.
          const alreadyCounted =
            invite.rsvp?.response === "YES" ? invite.rsvp.guestCount : 0;
          const projectedSeats =
            Number(takenSeats) - alreadyCounted + data.guestCount;
          if (projectedSeats > maxAttendees) {
            throw new AppError(
              "Sorry, this event has reached its maximum capacity.",
              "CAPACITY_FULL",
              400
            );
          }
        }
      }

      // 6. Email conflict guard. If the guest provides an email that matches
      //    a different (non-revoked) invite for the same event, reject — this
      //    prevents linking two invitees through the public flow.
      const normalizedEmail = data.guestEmail
        ? data.guestEmail.trim().toLowerCase()
        : undefined;
      if (normalizedEmail) {
        const conflict = await tx.invite.findFirst({
          where: {
            eventId: invite.eventId,
            email: normalizedEmail,
            id: { not: invite.id },
            status: { not: "REVOKED" },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new AppError(
            "We already have an RSVP for this email — please check your inbox for the original invitation.",
            "EMAIL_CONFLICT",
            400
          );
        }
      }

      // 7. Upsert RSVP. Mirrors the invite-token path; adds `source` so the
      //    organizer can tell which entry point produced the response.
      const guestNames =
        data.response === "YES" && data.guestCount > 1
          ? data.additionalGuestNames
          : [];

      const existingMessage = invite.rsvp?.messageToHost ?? null;
      const incomingMessage = data.messageToHost ?? null;
      const messageChanged = existingMessage !== incomingMessage;

      const rsvpResult = await tx.rSVP.upsert({
        where: { inviteId: invite.id },
        create: {
          inviteId: invite.id,
          eventId: invite.event.id,
          response: data.response,
          guestName: data.guestName,
          guestEmail: normalizedEmail,
          guestCount: data.guestCount,
          additionalGuestNames: guestNames,
          dietaryRestrictions: data.dietaryRestrictions,
          musicSuggestions: data.musicSuggestions,
          notes: data.notes,
          messageToHost: data.messageToHost,
          side: data.side,
          source: "PUBLIC_PORTAL_CODE",
        },
        update: {
          response: data.response,
          guestName: data.guestName,
          guestEmail: normalizedEmail ?? invite.rsvp?.guestEmail,
          guestCount: data.guestCount,
          additionalGuestNames: guestNames,
          dietaryRestrictions: data.dietaryRestrictions,
          musicSuggestions: data.musicSuggestions,
          notes: data.notes,
          side: data.side,
          source: "PUBLIC_PORTAL_CODE",
          updatedAt: new Date(),
          ...(messageChanged && {
            messageToHost: data.messageToHost,
            messageStatus: "PENDING",
            messageApprovedAt: null,
          }),
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

      // 8. Update invite. RSVP code consumption is recorded once; a re-RSVP
      //    via session doesn't reset the original `rsvpCodeUsedAt` time.
      //    Rotate `tokenHash` to the freshly-minted portal token's hash so
      //    the raw token below can address the guest's portal view.
      await tx.invite.update({
        where: { id: invite.id },
        data: {
          status: "RESPONDED",
          rsvpCodeUsedAt: invite.rsvpCodeUsedAt ?? new Date(),
          tokenHash: portalTokenHash,
          ...(normalizedEmail && !invite.email && { email: normalizedEmail }),
        },
      });

      // 9. Queue confirmation email inside the transaction (atomic with the
      //    write above, like the invite-token path). The freshly-rotated
      //    tokenHash backs the portalUrl / unsubscribeUrl, so the public
      //    flow can match the regular flow's email template. The template
      //    no longer renders event date/time/location — the View Event
      //    Details CTA (portalUrl) is the authoritative source of event
      //    info, which avoids stale or partial sub-event listings.
      let queuedEmailId: string | null = null;
      const recipientEmail = normalizedEmail || invite.email;
      if (recipientEmail) {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";
        queuedEmailId = await queueConfirmationEmail(
          invite.id,
          recipientEmail,
          {
            guestName: data.guestName,
            eventTitle: invite.event.title,
            response: data.response,
            guestCount: data.guestCount,
            portalUrl: buildPortalUrl(invite.event.slug, portalToken),
            unsubscribeUrl: buildUnsubscribeUrl(portalToken),
            logoUrl: `${baseUrl}/brand/eventfxr-logo.png`,
            passId: invite.passId,
          },
          tx
        );
      }

      return {
        rsvp: rsvpResult,
        eventSummary: {
          id: invite.event.id,
          title: invite.event.title,
          slug: invite.event.slug,
        },
        emailId: queuedEmailId,
      };
    });

    // Schedule post-response email delivery — outbox row is committed.
    if (emailId) {
      scheduleEmailProcessing(emailId);
    }

    return clearSessionCookie(
      successResponse({
        rsvp,
        event: eventSummary,
        // Raw portal token. The respond form passes it onward to the
        // confirmed page so its "View Event Details" CTA can deep-link with
        // `?tk=`, matching the regular invite-token flow. The fully-assembled
        // portalUrl lives only in the confirmation email (the client builds
        // its own URL from the slug + token).
        portalToken,
        // YES intentionally omitted: the form's `defaultRsvpSuccessMessage`
        // (in `src/lib/rsvp-copy.ts`) handles the QR-aware copy. NO/MAYBE
        // carry genuine action guidance, so they stay.
        message:
          rsvp.response === "NO"
            ? "Thanks for letting us know."
            : rsvp.response === "MAYBE"
              ? "We've noted your response. We'll send a reminder closer to the event so you can confirm."
              : undefined,
      })
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return clearSessionCookie(genericInvalid());
    }
    if (error instanceof AppError) {
      // AppError carries the structured code + status we set when throwing.
      return clearSessionCookie(
        errorResponse(error.message, error.statusCode, error.code)
      );
    }
    return handleApiError(error);
  }
}
