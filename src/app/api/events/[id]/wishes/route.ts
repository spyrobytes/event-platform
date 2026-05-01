import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const querySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "HIDDEN", "ALL"]).default("PENDING"),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/events/[id]/wishes
 * Organizer-only list of guest wedding-wish messages for moderation.
 *
 * Query params:
 *  - `status`: PENDING (default) | APPROVED | HIDDEN | ALL
 *  - `limit`: page size, 1-100 (default 50)
 *  - `cursor`: rsvpId to seek past (omit for the first page)
 *
 * Returns counts for all three buckets in one round trip so the dashboard
 * can render tab badges without extra fetches. Only RSVPs with a non-empty
 * `messageToHost` are included — rows where the guest skipped the message
 * are not part of the moderation queue.
 *
 * Cursor pagination uses a stable `(respondedAt desc, id desc)` ordering so
 * concurrent moderation actions don't shift rows across page boundaries.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const { id: eventId } = await context.params;
    await requireEventOwner(eventId, user.id);

    const url = new URL(request.url);
    const { status, cursor, limit } = querySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const whereBase = {
      eventId,
      messageToHost: { not: null },
    } as const;

    // Two queries instead of four: a single groupBy aggregates counts across
    // all three buckets, in parallel with the page-of-rows fetch.
    const [grouped, rawRows] = await Promise.all([
      db.rSVP.groupBy({
        by: ["messageStatus"],
        where: whereBase,
        _count: { _all: true },
      }),
      db.rSVP.findMany({
        where:
          status === "ALL"
            ? whereBase
            : { ...whereBase, messageStatus: status },
        orderBy: [{ respondedAt: "desc" }, { id: "desc" }],
        take: limit + 1, // peek-ahead to detect more pages
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          guestName: true,
          messageToHost: true,
          messageStatus: true,
          messageApprovedAt: true,
          respondedAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const counts = { pending: 0, approved: 0, hidden: 0 };
    for (const g of grouped) {
      if (g.messageStatus === "PENDING") counts.pending = g._count._all;
      else if (g.messageStatus === "APPROVED") counts.approved = g._count._all;
      else if (g.messageStatus === "HIDDEN") counts.hidden = g._count._all;
    }

    const hasMore = rawRows.length > limit;
    const messages = hasMore ? rawRows.slice(0, limit) : rawRows;
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    return successResponse({ counts, messages, nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}
