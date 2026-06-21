import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Action identifiers written to `admin_audit_logs.action`. Stored as plain
 * strings (not a DB enum) so adding a new admin action never needs a migration.
 */
export const ADMIN_AUDIT_ACTION = {
  /** A platform admin started an act-as (impersonation) grant. */
  IMPERSONATION_START: "impersonation.start",
  /** An act-as grant ended — admin exited, it expired, or it was revoked. */
  IMPERSONATION_END: "impersonation.end",
  /** A mutation performed by an admin while acting as an organizer. */
  IMPERSONATION_EDIT: "impersonation.edit",
} as const;

export type AdminAuditAction =
  (typeof ADMIN_AUDIT_ACTION)[keyof typeof ADMIN_AUDIT_ACTION];

export type RecordAdminAuditInput = {
  /**
   * The admin who performed the action — ALWAYS the real actor, never the
   * impersonated organizer. This is the accountability anchor.
   */
  actorUserId: string;
  /** Denormalized actor email snapshot, for human-readable logs. */
  actorEmail?: string | null;
  /** What happened — use an ADMIN_AUDIT_ACTION value (free-form string allowed). */
  action: AdminAuditAction | string;
  /** The organizer acted upon, when applicable. */
  targetUserId?: string | null;
  /** The event acted upon, when applicable. */
  eventId?: string | null;
  /** The impersonation grant this action belongs to, when applicable. */
  grantId?: string | null;
  /** Structured context (e.g. which fields changed, the route hit). */
  detail?: Prisma.InputJsonValue;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Append a row to the immutable admin audit log (`admin_audit_logs`).
 *
 * The table has no foreign keys by design, so the trail survives deletion of
 * any user/event it references. This writer THROWS on failure — callers decide
 * whether an audit-write failure should abort the underlying action. For
 * security-relevant events (e.g. starting an impersonation grant) it should:
 * no audit, no action.
 */
export async function recordAdminAudit(
  input: RecordAdminAuditInput,
): Promise<void> {
  await db.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      targetUserId: input.targetUserId ?? null,
      eventId: input.eventId ?? null,
      grantId: input.grantId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      // Only set `detail` when provided so the column stays NULL otherwise
      // (avoids the JsonNull-vs-undefined typing dance on a nullable Json field).
      ...(input.detail !== undefined ? { detail: input.detail } : {}),
    },
  });
}
