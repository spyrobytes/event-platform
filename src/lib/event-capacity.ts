import type { Prisma } from "@prisma/client";

type CapacityCheck = {
  /** The event being RSVP'd to. */
  eventId: string;
  /** The invite submitting — its own attending seats are excluded from the count. */
  inviteId: string;
  /** The incoming response. Only YES consumes seats. */
  response: string;
  /** Seats the incoming party wants (the guest + plus-ones). */
  guestCount: number;
  /**
   * The event cap as already loaded by the caller. `null` means unlimited.
   * Used only to skip the lock for uncapped events; the authoritative value is
   * re-read under the row lock below.
   */
  maxAttendees: number | null;
};

/**
 * Whether accepting `guestCount` for this invite would exceed the event's cap.
 *
 * MUST run inside a transaction. It takes a `FOR UPDATE` lock on the event row
 * so every concurrent YES submission for the same event serializes — two
 * parties can't both pass the check and overbook.
 *
 * Counts SEATS (`SUM(guest_count)`), not rows: a party with plus-ones occupies
 * more than one seat, so a row count would let plus-ones silently overbook.
 *
 * The sum EXCLUDES this invite's own attending row (`invite_id IS DISTINCT FROM`)
 * and then adds the incoming party. Counting "everyone else + the new party"
 * means the result never depends on a stale, pre-lock snapshot of this invite's
 * prior RSVP — a re-submit or a NO/MAYBE→YES change is always counted exactly
 * once, with no TOCTOU on the invite's own seats.
 *
 * Returns a boolean (rather than throwing) so each route keeps its own error
 * shape — the invite-token path raises a ValidationError, the public portal a
 * CAPACITY_FULL AppError.
 */
export async function exceedsEventCapacity(
  tx: Prisma.TransactionClient,
  { eventId, inviteId, response, guestCount, maxAttendees }: CapacityCheck,
): Promise<boolean> {
  // Only YES adds seats, and only capped events need a check. Gating on the
  // already-loaded cap means uncapped events never take the lock (matches the
  // prior behavior — no serialization where there's no limit to enforce).
  if (response !== "YES" || maxAttendees == null) return false;

  // Lock the event row: all YES submissions for this event now serialize here,
  // so the seat count below can't race a concurrent accept.
  const [lockedEvent] = await tx.$queryRaw<{ max_attendees: number | null }[]>`
    SELECT max_attendees FROM events WHERE id = ${eventId} FOR UPDATE
  `;
  const cap = lockedEvent?.max_attendees;
  // `== null` (not falsy): a cap of 0 is a real "closed" limit, not "unlimited".
  if (cap == null) return false;

  const [{ seats: otherSeats }] = await tx.$queryRaw<{ seats: bigint }[]>`
    SELECT COALESCE(SUM(guest_count), 0) AS seats
    FROM rsvps
    WHERE event_id = ${eventId}
      AND response = 'YES'
      AND invite_id IS DISTINCT FROM ${inviteId}
  `;

  return Number(otherSeats) + guestCount > cap;
}
