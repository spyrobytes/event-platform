import type { Prisma, RsvpSession } from "@prisma/client";
import { generateToken, hashToken } from "@/lib/tokens";

/** Session lifetime in seconds (20 minutes per v3 §2.2 / §7). */
export const RSVP_SESSION_TTL_SECONDS = 20 * 60;

/** Cookie name for the public-portal RSVP session. Scoped to /api/rsvp/public. */
export const RSVP_SESSION_COOKIE = "rsvp_session";

type Tx = Prisma.TransactionClient | typeof import("@/lib/db").db;

/**
 * Issue a fresh single-submit session for an invite that has just verified
 * its RSVP code. Stores only the hash; returns the raw token to be set in
 * an httpOnly cookie by the caller.
 */
export async function createRsvpSession(
  tx: Tx,
  params: { eventId: string; inviteId: string }
): Promise<{ rawToken: string; session: RsvpSession }> {
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RSVP_SESSION_TTL_SECONDS * 1000);

  const session = await tx.rsvpSession.create({
    data: {
      eventId: params.eventId,
      inviteId: params.inviteId,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, session };
}

/**
 * Look up a session by its raw token. Returns null if missing, expired, or
 * already consumed. The caller does not need to filter — this function is
 * the single source of truth for "valid session."
 */
export async function lookupRsvpSession(
  tx: Tx,
  rawToken: string
): Promise<RsvpSession | null> {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const session = await tx.rsvpSession.findUnique({
    where: { tokenHash },
  });
  if (!session) return null;
  if (session.usedAt) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

/**
 * Mark a session as consumed. Returns `true` when this call won the race
 * (the row was unused and is now stamped), `false` when another transaction
 * already consumed it. The conditional `where: { usedAt: null }` makes the
 * check + update atomic at the row-lock level — Postgres serializes two
 * concurrent `updateMany`s on the same row, so exactly one returns count: 1.
 *
 * Callers MUST run this inside the same transaction as the RSVP write AND
 * MUST treat a `false` return as session-invalid (throw → rollback). Without
 * the rowcount check, a double-submit race could enqueue two confirmation
 * emails for the same session.
 */
export async function consumeRsvpSession(
  tx: Tx,
  sessionId: string
): Promise<boolean> {
  const result = await tx.rsvpSession.updateMany({
    where: { id: sessionId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count === 1;
}

/**
 * Delete every RSVP session whose `expiresAt` is in the past. Called by the
 * daily reminder cron — sessions are short-lived (20 min), so anything past
 * `expiresAt` is dead weight. Returns the count of rows removed.
 */
export async function purgeExpiredRsvpSessions(tx: Tx): Promise<number> {
  const result = await tx.rsvpSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
