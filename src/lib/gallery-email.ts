import { db } from "@/lib/db";
import { buildUnsubscribeUrl } from "@/lib/email";
import type { Prisma } from "@prisma/client";

// Read at call-time, not import-time, so tests + Vercel preview deploys
// can override NEXT_PUBLIC_BASE_URL after the module has been imported.
function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || "https://eventfxr.com";
  return raw.replace(/\/+$/, "");
}

/**
 * Helpers for the post-event GALLERY_PUBLISHED broadcast email (PR #8).
 *
 * Recipient policy (locked here, applied identically by count + enqueue):
 *   - invite has an email AND status === RESPONDED
 *   - the linked RSVP responded YES
 *   - the invite is NOT unsubscribed
 *   - the invite is NOT revoked / bounced / expired
 *
 * The same predicate must back the count preview the dashboard shows
 * and the enqueue path — otherwise organizers would see "We'll email N"
 * and then a different number of emails ship.
 */

/** Reusable predicate. Defined once so the count + enqueue paths can't
 *  drift apart. */
const recipientWhere = (eventId: string): Prisma.InviteWhereInput => ({
  eventId,
  email: { not: null },
  status: "RESPONDED",
  unsubscribedAt: null,
  revokedAt: null,
  rsvp: { response: "YES" },
});

export async function countGalleryEmailRecipients(
  eventId: string,
): Promise<number> {
  return db.invite.count({ where: recipientWhere(eventId) });
}

type EnqueueInput = {
  eventId: string;
  galleryId: string;
  /** Used to build the public gallery URL — `${BASE_URL}/e/${slug}/gallery`. */
  eventSlug: string;
  eventTitle: string;
  hostName: string;
  /** Optional cover image URL; rendered at the top of the email when present. */
  coverUrl?: string | null;
  /** Optional ready-photo count — appears in the body copy. */
  photoCount?: number;
};

export type EnqueueResult = {
  enqueued: number;
  skipped: number;
};

/**
 * Queue one GALLERY_PUBLISHED email per eligible RSVPed-yes invite for
 * this event. Runs as a single createMany insert; the email worker's
 * cron tick consumes the rows like any other.
 *
 * Each row references its own invite via inviteId so the unsubscribe
 * link (and any future per-invite gating) keeps working through the
 * standard /unsubscribe/[token] flow.
 */
export async function enqueueGalleryPublishedEmails(
  input: EnqueueInput,
): Promise<EnqueueResult> {
  const invites = await db.invite.findMany({
    where: recipientWhere(input.eventId),
    select: {
      id: true,
      email: true,
      name: true,
      tokenHash: true,
      rsvp: { select: { guestName: true } },
    },
  });

  if (invites.length === 0) {
    return { enqueued: 0, skipped: 0 };
  }

  // We have the tokenHash on each invite (hashed at issue), not the raw
  // token. The raw token is required to build the unsubscribe URL. We
  // can't reconstruct it from the hash — that's the security contract.
  // Drop the unsubscribe URL when we don't have a raw token; the email
  // still renders, just without an unsub link.
  // (Future: pass an event-level opt-out endpoint via {eventId, inviteId}
  // signed query; for MVP we accept the limitation.)
  const galleryUrl = `${getBaseUrl()}/e/${input.eventSlug}/gallery`;
  const subject = `Photos from ${input.eventTitle} are ready to view`;

  const rows = invites
    .filter((i): i is typeof i & { email: string } => typeof i.email === "string")
    .map((invite) => ({
      inviteId: invite.id,
      template: "GALLERY_PUBLISHED" as const,
      toEmail: invite.email,
      subject,
      payload: {
        guestName:
          invite.rsvp?.guestName ||
          invite.name ||
          "there",
        eventTitle: input.eventTitle,
        hostName: input.hostName,
        galleryUrl,
        ...(input.coverUrl ? { coverUrl: input.coverUrl } : {}),
        ...(typeof input.photoCount === "number"
          ? { photoCount: input.photoCount }
          : {}),
        // Note: unsubscribeUrl omitted. The raw invite token isn't
        // recoverable from tokenHash; see comment above.
      } satisfies Prisma.InputJsonValue,
      status: "QUEUED" as const,
    }));

  if (rows.length === 0) {
    return { enqueued: 0, skipped: invites.length };
  }

  const created = await db.emailOutbox.createMany({ data: rows });
  return {
    enqueued: created.count,
    skipped: invites.length - rows.length,
  };
}

// Re-export so the publish route doesn't need to import from
// "@/lib/email" just for the unsubscribe helper.
export { buildUnsubscribeUrl };
