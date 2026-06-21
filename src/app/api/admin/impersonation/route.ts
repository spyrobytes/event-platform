import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { verifyEventOwnership } from "@/lib/authorization";
import { recordAdminAudit, ADMIN_AUDIT_ACTION } from "@/lib/audit";
import { IMPERSONATION_TTL_MS, requestMeta } from "@/lib/impersonation";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-response";

const startSchema = z.object({
  targetUserId: z.string().min(1),
  eventId: z.string().min(1),
  reason: z.string().trim().min(3, "A reason is required").max(500),
});

/**
 * POST /api/admin/impersonation — start an act-as grant.
 *
 * Admin-only. Validates the target is a real, non-banned, non-admin organizer
 * who actually owns the event, then creates a 30-min event-scoped grant and
 * records the start atomically with it. Returns the grant id the client sends
 * back as `X-Act-As` on editing requests.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    const { targetUserId, eventId, reason } = startSchema.parse(
      await request.json(),
    );

    if (targetUserId === admin.id) {
      return errorResponse("You cannot act as yourself", 400);
    }

    const target = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isAdmin: true, status: true, email: true, name: true },
    });
    if (!target) return errorResponse("Target organizer not found", 404);
    if (target.isAdmin) {
      return errorResponse("Cannot act as another admin", 403);
    }
    if (target.status === "BANNED") {
      return errorResponse("Target organizer is banned", 403);
    }

    // The grant must be scoped to an event the target actually owns — otherwise
    // acting-as would resolve to a user who can't edit it anyway, and it would
    // let an admin scope a grant to an unrelated event.
    const targetOwnsEvent = await verifyEventOwnership(eventId, targetUserId);
    if (!targetOwnsEvent) {
      return errorResponse(
        "That event does not belong to the target organizer",
        403,
      );
    }

    const { ip, userAgent } = requestMeta(request);
    const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS);

    const grant = await db.$transaction(async (tx) => {
      const created = await tx.impersonationGrant.create({
        data: { adminUserId: admin.id, targetUserId, eventId, reason, expiresAt },
      });
      await recordAdminAudit(
        {
          actorUserId: admin.id,
          actorEmail: admin.email,
          action: ADMIN_AUDIT_ACTION.IMPERSONATION_START,
          targetUserId,
          eventId,
          grantId: created.id,
          detail: { reason },
          ip,
          userAgent,
        },
        tx,
      );
      return created;
    });

    return successResponse(
      {
        grantId: grant.id,
        expiresAt: grant.expiresAt,
        eventId,
        target: { id: target.id, name: target.name, email: target.email },
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/impersonation?grantId=... — end (exit) an act-as grant.
 * Idempotent: ending an already-ended grant succeeds.
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    const grantId = new URL(request.url).searchParams.get("grantId");
    if (!grantId) return errorResponse("grantId is required", 400);

    const grant = await db.impersonationGrant.findUnique({
      where: { id: grantId },
    });
    // Don't reveal another admin's grant — same 404 for missing or not-yours.
    if (!grant || grant.adminUserId !== admin.id) {
      return errorResponse("Grant not found", 404);
    }
    const { ip, userAgent } = requestMeta(request);
    const ended = await db.$transaction(async (tx) => {
      // Atomic transition: the conditional `endedAt: null` means only the
      // request that actually flips null→now writes the IMPERSONATION_END row.
      // Postgres row-locks the update, so a double-clicked Exit (two concurrent
      // DELETEs, or a retry) can't produce duplicate end-audit entries.
      const result = await tx.impersonationGrant.updateMany({
        where: { id: grantId, endedAt: null },
        data: { endedAt: new Date() },
      });
      if (result.count === 0) return false; // already ended by a prior/concurrent call
      await recordAdminAudit(
        {
          actorUserId: admin.id,
          actorEmail: admin.email,
          action: ADMIN_AUDIT_ACTION.IMPERSONATION_END,
          targetUserId: grant.targetUserId,
          eventId: grant.eventId,
          grantId,
          ip,
          userAgent,
        },
        tx,
      );
      return true;
    });

    return successResponse({ ended: true, alreadyEnded: !ended });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * GET /api/admin/impersonation — the admin's currently-active grants.
 * Used to rehydrate the "acting as" banner after a reload.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) return admin;

    const grants = await db.impersonationGrant.findMany({
      where: {
        adminUserId: admin.id,
        endedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        targetUserId: true,
        eventId: true,
        reason: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return successResponse({ grants });
  } catch (error) {
    return handleApiError(error);
  }
}
