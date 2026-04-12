import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { successResponse, handleApiError, parsePagination } from "@/lib/api-response";

/**
 * GET /api/admin/organizers
 * List all registered users with event count and invite info.
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrRes = await requireAdmin(request);
    if (adminOrRes instanceof Response) return adminOrRes;

    const { skip, take, page, limit } = parsePagination(request);

    const [users, total] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { events: true } },
          claimedInvites: {
            where: { status: "CLAIMED" },
            select: { code: true },
            take: 1,
          },
        },
      }),
      db.user.count(),
    ]);

    const organizers = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isAdmin: u.isAdmin,
      status: u.status,
      emailVerified: u.emailVerified,
      eventCount: u._count.events,
      inviteCode: u.claimedInvites[0]?.code || null,
      createdAt: u.createdAt,
    }));

    return successResponse({ organizers, pagination: { page, limit, total } });
  } catch (error) {
    return handleApiError(error);
  }
}
