import { db } from "@/lib/db";
import type { InviteStatus } from "@prisma/client";

/**
 * Invite statuses that precede a guest's first engagement. A link click
 * advances any of these to OPENED. `DRAFTED` is the phone-only share state
 * (organizer composed/shared the link); `SENT` is the email-dispatch state.
 *
 * Single source of truth for the OPENED transition — the lookup route and the
 * three invite/RSVP pages all consult this set, so adding a future pre-open
 * state (or changing the rule) happens in exactly one place.
 */
export const PRE_OPEN_STATUSES: readonly InviteStatus[] = [
  "PENDING",
  "DRAFTED",
  "SENT",
];

/** True when a link click should advance `status` to OPENED. */
export function isPreOpenStatus(status: InviteStatus): boolean {
  return PRE_OPEN_STATUSES.includes(status);
}

/**
 * Advances an invite to OPENED (stamping `openedAt`) when it's still in a
 * pre-open state — the first real engagement signal (guest clicked the link).
 * No-op for any later/terminal state, so repeat page loads don't rewrite
 * `openedAt` or regress progress. Server-only (touches the DB).
 */
export async function markInviteOpenedIfUnopened(
  inviteId: string,
  currentStatus: InviteStatus,
): Promise<void> {
  if (!isPreOpenStatus(currentStatus)) return;
  await db.invite.update({
    where: { id: inviteId },
    data: { status: "OPENED", openedAt: new Date() },
  });
}
