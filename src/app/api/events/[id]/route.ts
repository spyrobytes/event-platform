import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner, assertCanMutate } from "@/lib/authorization";
import {
  resolveEffectiveUser,
  requireEffectiveMutator,
  auditImpersonatedEdit,
} from "@/lib/impersonation";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { updateEventSchema } from "@/schemas/event";
import { NotFoundError } from "@/lib/errors";
import { revalidateEventPage } from "@/lib/revalidation";
import {
  coverMediaAssetUpdate,
  clearEventCoversForAssets,
  COVER_ASSET_SELECT,
} from "@/lib/cover-media-asset";
import { nullableJsonInput } from "@/lib/nullable-json";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Cap how often an organizer can rename a single event's slug. Counted via
 * `event_slug_history` rows so the limit survives deploys (the in-memory
 * `rate-limit.ts` would forget across cold starts, which is wrong for a
 * window measured in days). Picked to allow typo recovery + a couple of
 * second-thought changes without enabling churn.
 */
const SLUG_RENAME_LIMIT = 3;
const SLUG_RENAME_WINDOW_DAYS = 7;

/**
 * GET /api/events/[id]
 * Get event details (owner only for drafts)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    // Act-as honored (scope expanded 2026-07-15: schedule + event editors —
    // previously template-only): ownership below checks the EFFECTIVE user.
    // Without an X-Act-As header this behaves exactly like verifyAuth.
    const ctx = await resolveEffectiveUser(request, id);
    const user = ctx?.effective ?? null;

    const event = await db.event.findUnique({
      where: { id },
      include: {
        ...COVER_ASSET_SELECT,
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        _count: {
          select: {
            invites: true,
            rsvps: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Check access for non-published events
    if (event.status !== "PUBLISHED" || event.visibility === "PRIVATE") {
      if (!user) {
        return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
      }
      await requireEventOwner(id, user.id);
    }

    return successResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/events/[id]
 * Update an event (owner only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    // Act-as honored (scope expanded 2026-07-15): event-details editing —
    // timezone/schedule fixes and requested edits — now allowed on behalf of
    // the organizer, with the admin recorded in the audit log. Event publish
    // (discovery) and DELETE remain non-honored (deny-by-omission).
    const ctx = await requireEffectiveMutator(request, id);
    if (ctx instanceof Response) return ctx;
    const { effective } = ctx;

    await requireEventOwner(id, effective.id);

    const body = await request.json();
    const data = updateEventSchema.parse(body);

    // Slug rename has special handling: history insert + uniqueness check.
    // Strip slug from `data` so the generic update doesn't touch it; the
    // transaction below applies the new slug only after the history row exists.
    // Schedule is stripped too: Json? columns need the null→DbNull triage
    // (see nullableJsonInput).
    const { slug: requestedSlug, schedule, ...restData } = data;

    // When the cover changes, re-resolve its MediaAsset link so render sites can
    // read the cover's responsive renditionWidths (issue #211). Resolved before
    // the transaction since it's a read; spread into the update below.
    const coverPatch = await coverMediaAssetUpdate(id, restData.coverImageUrl);

    let renameInfo: { from: string; to: string } | null = null;
    if (requestedSlug !== undefined) {
      const current = await db.event.findUnique({
        where: { id },
        select: { slug: true, slugLockedAt: true },
      });
      if (!current) throw new NotFoundError("Event not found");

      if (requestedSlug !== current.slug) {
        if (current.slugLockedAt) {
          return errorResponse(
            "This event's URL is locked because invites have been sent. It can no longer be changed.",
            409,
            "SLUG_LOCKED"
          );
        }

        // Rate limit renames per event using the durable history table.
        const windowStart = new Date(
          Date.now() - SLUG_RENAME_WINDOW_DAYS * 24 * 60 * 60 * 1000
        );
        const recentRenameCount = await db.eventSlugHistory.count({
          where: { eventId: id, createdAt: { gte: windowStart } },
        });
        if (recentRenameCount >= SLUG_RENAME_LIMIT) {
          return errorResponse(
            `URL changes are limited to ${SLUG_RENAME_LIMIT} per ${SLUG_RENAME_WINDOW_DAYS} days. Try again later.`,
            429,
            "SLUG_RATE_LIMITED"
          );
        }

        // Friendly pre-check so the common case returns 409 instead of
        // tripping the unique-constraint error from Prisma. The transaction
        // below still catches P2002 to handle races.
        const [activeMatch, historyMatch] = await Promise.all([
          db.event.findUnique({
            where: { slug: requestedSlug },
            select: { id: true },
          }),
          db.eventSlugHistory.findUnique({
            where: { slug: requestedSlug },
            select: { eventId: true },
          }),
        ]);
        if (
          (activeMatch && activeMatch.id !== id) ||
          (historyMatch && historyMatch.eventId !== id)
        ) {
          return errorResponse(
            "That URL is already taken by another event.",
            409,
            "SLUG_TAKEN"
          );
        }
        renameInfo = { from: current.slug, to: requestedSlug };
      }
    }

    let event;
    try {
      event = await db.$transaction(async (tx) => {
        if (renameInfo) {
          // Upsert handles A→B→A cycles: if "from" is already in history for
          // this event, we just no-op rather than colliding on the unique slug.
          await tx.eventSlugHistory.upsert({
            where: { slug: renameInfo.from },
            create: { eventId: id, slug: renameInfo.from },
            update: { eventId: id },
          });
        }
        return tx.event.update({
          where: { id },
          data: {
            ...restData,
            schedule: nullableJsonInput(schedule),
            // Saving a schedule is an implicit acknowledgment of the
            // backfill banner — the organizer has seen and owned the data.
            ...(schedule !== undefined ? { scheduleAutoPopulatedAt: null } : {}),
            ...coverPatch,
            ...(renameInfo ? { slug: renameInfo.to } : {}),
          },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            startAt: true,
            endAt: true,
            timezone: true,
            schedule: true,
            venueName: true,
            address: true,
            city: true,
            country: true,
            visibility: true,
            status: true,
            coverImageUrl: true,
            maxAttendees: true,
            updatedAt: true,
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return errorResponse(
          "That URL was just claimed by another event. Please try a different one.",
          409,
          "SLUG_TAKEN"
        );
      }
      throw err;
    }

    // Audit before revalidation (durability — the audit row must survive a
    // revalidation failure). No-op unless acting-as.
    await auditImpersonatedEdit(ctx, request, id, {
      route: "events.PATCH",
      fields: Object.keys(data).join(","),
    });

    if (renameInfo) {
      // Bust any cached responses for the old + new path. The /e routes are
      // currently force-dynamic, but other surfaces (sitemaps, dashboards)
      // may cache slugs and benefit from the bump.
      await Promise.all([
        revalidateEventPage(renameInfo.from),
        revalidateEventPage(renameInfo.to),
      ]);
    }

    return successResponse(event);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event (owner only)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);
    assertCanMutate(user);

    await db.$transaction(async (tx) => {
      // Before the event (and its cascade-deleted assets) goes away, clear the
      // cover on any OTHER event that reuses one of this event's HERO assets as
      // its cover (e.g. a duplicate), so its coverImageUrl doesn't drift to
      // deleted storage. Only HERO assets are ever a cover (#211).
      const heroAssets = await tx.mediaAsset.findMany({
        where: { eventId: id, kind: "HERO" },
        select: { id: true },
      });
      await clearEventCoversForAssets(
        tx,
        heroAssets.map((a) => a.id)
      );

      await tx.event.delete({ where: { id } });
    });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
