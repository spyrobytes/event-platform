import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  status: z.enum(["REVOKED"]).optional(),
});

/**
 * PATCH /api/admin/invites/[id]
 * Update an invite (currently: revoke only).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminOrRes = await requireAdmin(request);
    if (adminOrRes instanceof Response) return adminOrRes;

    const { id } = await context.params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.issues[0].message, 400);
    }

    const invite = await db.launchInvite.findUnique({ where: { id } });
    if (!invite) {
      return errorResponse("Invite not found", 404);
    }

    if (result.data.status === "REVOKED") {
      const updated = await db.launchInvite.update({
        where: { id },
        data: { status: "REVOKED" },
      });
      return successResponse({ invite: updated });
    }

    return successResponse({ invite });
  } catch (error) {
    return handleApiError(error);
  }
}
