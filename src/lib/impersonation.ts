import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { ForbiddenError } from "@/lib/errors";
import { errorResponse } from "@/lib/api-response";
import { assertCanMutate } from "@/lib/authorization";
import { recordAdminAudit, ADMIN_AUDIT_ACTION } from "@/lib/audit";
import type { ImpersonationGrant, User } from "@prisma/client";

/**
 * Header an admin's act-as session sends alongside their own Firebase Bearer
 * token. Its value is an ImpersonationGrant id. The admin ALWAYS stays
 * authenticated as themselves (the "actor"); this header only selects which
 * organizer they're acting as (the "effective" user) for one event.
 */
export const ACT_AS_HEADER = "x-act-as";

/** How long an act-as grant stays valid after it's created. */
export const IMPERSONATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Thrown when an `X-Act-As` header is present but the grant it names is
 * invalid for this request (forged, expired, ended, foreign admin, or scoped
 * to a different event). A hard 403 — a bad act-as header must NEVER silently
 * fall back to the admin's own identity. Distinct code so the client can clear
 * a stale grant + banner. Maps to 403 via handleApiError (extends ForbiddenError).
 */
export class ImpersonationError extends ForbiddenError {
  constructor(message: string = "Act-as grant is invalid or expired") {
    super(message, "IMPERSONATION_INVALID");
    this.name = "ImpersonationError";
  }
}

export type EffectiveUserContext = {
  /** The authenticated caller — the admin when acting-as, else the user. */
  actor: User;
  /** Who to AUTHORIZE as — the organizer when acting-as, else the actor. */
  effective: User;
  /** The grant backing an act-as session; null on a normal (non-act-as) request. */
  grant: ImpersonationGrant | null;
  impersonating: boolean;
};

/**
 * Resolve the effective user for an EDITING route that opts into act-as.
 *
 * - No `X-Act-As` header → behaves exactly like `verifyAuth`: actor === effective.
 * - Header present → STRICTLY validated against `eventId`; any failure throws
 *   ImpersonationError (403). Only `User.isAdmin` actors may act-as.
 *
 * Returns `null` only when the request is unauthenticated (the route returns
 * 401), mirroring the existing `verifyAuth` call sites it replaces.
 *
 * NOTE: this is opt-in. Routes that don't call it (billing, the invite flow,
 * guest communication, account/security) ignore the header entirely, so act-as
 * can never reach them — the deny-list is enforced by omission (fail-safe).
 */
export async function resolveEffectiveUser(
  request: NextRequest,
  eventId: string,
): Promise<EffectiveUserContext | null> {
  const actor = await verifyAuth(request);
  if (!actor) return null;

  const grantId = request.headers.get(ACT_AS_HEADER);
  if (!grantId) {
    return { actor, effective: actor, grant: null, impersonating: false };
  }

  // A grant is being claimed from here on — every failure is a hard 403.
  if (!actor.isAdmin) {
    throw new ImpersonationError("Act-as is not permitted for this account");
  }

  const grant = await db.impersonationGrant.findUnique({ where: { id: grantId } });
  if (
    !grant ||
    grant.adminUserId !== actor.id ||
    grant.eventId !== eventId ||
    grant.endedAt !== null ||
    grant.expiresAt.getTime() <= Date.now()
  ) {
    throw new ImpersonationError(
      "Act-as grant is invalid, expired, ended, or scoped to a different event",
    );
  }

  // Resolve the organizer by id (bypasses verifyAuth's token path), so re-check
  // the BANNED gate that verifyAuth would otherwise enforce.
  const effective = await db.user.findUnique({ where: { id: grant.targetUserId } });
  if (!effective || effective.status === "BANNED") {
    throw new ImpersonationError("Act-as target organizer is unavailable");
  }

  return { actor, effective, grant, impersonating: true };
}

/**
 * Gate for an act-as MUTATION route. Consolidates the resolve → 401 →
 * suspend-check ceremony so every editing handler shares one chokepoint
 * (mirrors `requireAdmin`'s `User | Response` shape).
 *
 * Returns the EffectiveUserContext on success, or a Response the caller must
 * return as-is (401, unauthenticated). THROWS for the 403 cases — an invalid
 * act-as header (ImpersonationError) or a SUSPENDED effective user
 * (AccountSuspendedError) — both caught by the route's handleApiError / AppError
 * catch. The caller still runs its own ownership check (which helper varies).
 *
 * Reads (GET) call `resolveEffectiveUser` directly — they don't mutate, so they
 * skip the suspend gate.
 */
export async function requireEffectiveMutator(
  request: NextRequest,
  eventId: string,
): Promise<EffectiveUserContext | Response> {
  const ctx = await resolveEffectiveUser(request, eventId);
  if (!ctx) return errorResponse("Unauthorized", 401);
  assertCanMutate(ctx.effective);
  return ctx;
}

/** Best-effort client metadata for the audit trail. */
export function requestMeta(request: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  return { ip, userAgent: request.headers.get("user-agent") };
}

/**
 * Record an act-as EDIT to the audit log from an opt-in editing route. No-op
 * when not impersonating (`ctx.grant` is null), so callers can call it
 * unconditionally. Best-effort: the mutation is already committed, so this
 * never throws into the response — but it logs loudly on failure, since a
 * silent gap defeats the whole point of the trail.
 */
export async function auditImpersonatedEdit(
  ctx: EffectiveUserContext,
  request: NextRequest,
  eventId: string,
  detail: Record<string, string | number | boolean | null>,
): Promise<void> {
  if (!ctx.grant) return;
  try {
    await recordAdminAudit({
      actorUserId: ctx.actor.id,
      actorEmail: ctx.actor.email,
      action: ADMIN_AUDIT_ACTION.IMPERSONATION_EDIT,
      targetUserId: ctx.effective.id,
      eventId,
      grantId: ctx.grant.id,
      detail,
      ...requestMeta(request),
    });
  } catch (auditError) {
    console.error(
      "[impersonation] audit write failed for act-as edit",
      { eventId, detail },
      auditError,
    );
  }
}
