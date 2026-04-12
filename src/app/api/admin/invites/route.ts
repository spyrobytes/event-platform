import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { successResponse, errorResponse, handleApiError, parsePagination } from "@/lib/api-response";
import { generateInviteCode } from "@/lib/invite-codes";

/**
 * GET /api/admin/invites
 * List all launch invites with status, claimed info, etc.
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrRes = await requireAdmin(request);
    if (adminOrRes instanceof Response) return adminOrRes;

    const { skip, take, page, limit } = parsePagination(request);

    const [invites, total] = await Promise.all([
      db.launchInvite.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          claimedBy: {
            select: { id: true, email: true, name: true, createdAt: true },
          },
        },
      }),
      db.launchInvite.count(),
    ]);

    return successResponse({ invites, pagination: { page, limit, total } });
  } catch (error) {
    return handleApiError(error);
  }
}

const generateSchema = z.object({
  count: z.number().int().min(1).max(50).default(1),
  email: z.string().email().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

/**
 * POST /api/admin/invites
 * Generate one or more invite codes.
 * Body: { count?: number, email?: string, expiresInDays?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrRes = await requireAdmin(request);
    if (adminOrRes instanceof Response) return adminOrRes;

    const body = await request.json();
    const result = generateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.issues[0].message, 400);
    }

    const { count, email, expiresInDays } = result.data;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const invites = await db.$transaction(
      Array.from({ length: count }, () =>
        db.launchInvite.create({
          data: {
            code: generateInviteCode(),
            email: email || null,
            expiresAt,
          },
        })
      )
    );

    return successResponse({ invites }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
