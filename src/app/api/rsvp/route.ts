import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { successResponse, handleApiError } from "@/lib/api-response";
import { submitRsvpSchema } from "@/schemas/rsvp";
import { hashToken } from "@/lib/tokens";
import { queueConfirmationEmail, scheduleEmailProcessing, buildUnsubscribeUrl } from "@/lib/email";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { buildPortalUrl } from "@/lib/guest-access";
import { exceedsEventCapacity } from "@/lib/event-capacity";

/**
 * POST /api/rsvp
 * Submit an RSVP via the email-link path (invite token in body).
 *
 * The previous `eventId`-only public branch was removed in PR 6 of the
 * public-portal RSVP rollout — public submissions now go through the
 * code-gated portal at `/api/rsvp/public/submit`. Submissions without an
 * invite token are rejected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const inviteToken = body.inviteToken || body.token;
    if (!inviteToken) {
      throw new ValidationError(
        "This endpoint requires an invite token. Public RSVPs go through /e/[slug]/rsvp."
      );
    }

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

    // Phone-only invites: email is optional at invite creation but required
    // at RSVP time so we have somewhere to send the confirmation. This check
    // layers on top of the permissive schema parse above.
    if (!invite.email && !data.guestEmail) {
      throw new ValidationError(
        "Please provide an email address so we can send your confirmation."
      );
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
      // Capacity is enforced inside the transaction: the helper locks the event
      // row (serializing concurrent YES submissions) and counts seats, excluding
      // this invite's own row so the result never depends on a stale pre-lock
      // snapshot of its prior RSVP.
      if (
        await exceedsEventCapacity(tx, {
          eventId: invite.event.id,
          inviteId: invite.id,
          response: data.response,
          guestCount: data.guestCount,
          maxAttendees: invite.event.maxAttendees,
        })
      ) {
        throw new ValidationError(
          "Sorry, this event has reached its maximum capacity"
        );
      }

      // Clear guest names if not attending or only 1 guest
      const guestNames =
        data.response === "YES" && data.guestCount > 1
          ? data.additionalGuestNames
          : [];

      // Reset wedding-wish moderation state only when the message text
      // actually changed — re-submitting an unchanged form should not
      // unapprove an already-approved message.
      const existingMessage = invite.rsvp?.messageToHost ?? null;
      const incomingMessage = data.messageToHost ?? null;
      const messageChanged = existingMessage !== incomingMessage;

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
          musicSuggestions: data.musicSuggestions,
          notes: data.notes,
          messageToHost: data.messageToHost,
          side: data.side,
        },
        update: {
          response: data.response,
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestCount: data.guestCount,
          additionalGuestNames: guestNames,
          dietaryRestrictions: data.dietaryRestrictions,
          musicSuggestions: data.musicSuggestions,
          notes: data.notes,
          side: data.side,
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

      // Advance invite status. The guest-email curation (phone-only invites)
      // is intentionally NOT done here — see the best-effort update after the
      // transaction commits, so a unique-constraint collision can't roll back
      // the RSVP.
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: "RESPONDED" },
      });

      // Queue confirmation email inside the transaction. The template no
      // longer renders event date/time/location — the View Event Details
      // CTA (portalUrl) is the authoritative source of event info.
      let queuedEmailId: string | null = null;
      const recipientEmail = data.guestEmail || invite.email;
      if (recipientEmail) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";
        queuedEmailId = await queueConfirmationEmail(
          invite.id,
          recipientEmail,
          {
            guestName: data.guestName,
            eventTitle: invite.event.title,
            response: data.response,
            guestCount: data.guestCount || 1,
            portalUrl,
            unsubscribeUrl: buildUnsubscribeUrl(inviteToken as string),
            logoUrl: `${baseUrl}/brand/eventfxr-logo.png`,
            passId: invite.passId,
          },
          tx
        );
      }

      return { rsvp: rsvpResult, emailId: queuedEmailId };
    });

    // Schedule post-response email delivery — outbox row is already committed.
    if (emailId) {
      scheduleEmailProcessing(emailId);
    }

    // Best-effort: curate the guest-provided email onto a phone-only invite so
    // the dashboard shows it. Done OUTSIDE the transaction because the
    // (event_id, email) partial unique index throws P2002 when that email
    // already belongs to another active invite — and that must never roll back
    // the RSVP (already committed) or the confirmation (already queued).
    if (data.guestEmail && !invite.email) {
      try {
        await db.invite.update({
          where: { id: invite.id },
          // Lowercase to match invite creation (which stores email lowercased);
          // the (event_id, email) partial unique index is case-sensitive.
          data: { email: data.guestEmail.toLowerCase() },
        });
      } catch (err) {
        // P2002 (email already on another active invite) or any other write
        // failure here is non-fatal — the RSVP + confirmation already landed.
        console.warn(
          `Could not curate guest email onto invite ${invite.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    return successResponse({
      rsvp,
      event: {
        id: invite.event.id,
        title: invite.event.title,
        slug: invite.event.slug,
      },
      portalUrl,
      // YES intentionally omitted: the form's `defaultRsvpSuccessMessage`
      // (in `src/lib/rsvp-copy.ts`) handles the QR-aware copy. NO/MAYBE
      // carry genuine action guidance, so they stay.
      message:
        data.response === "NO"
          ? "Thanks for letting us know. Your personal link will stay active if you'd like to browse the gift registry."
          : data.response === "MAYBE"
            ? "We've noted your response. We'll send a reminder closer to the event so you can confirm."
            : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
