import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { requireEventOwner } from "@/lib/authorization";
import { successResponse, handleApiError, errorResponse } from "@/lib/api-response";
import { generateTokenPair } from "@/lib/tokens";
import { NotFoundError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Preview token expires after 7 days by default
const PREVIEW_TOKEN_EXPIRY_DAYS = 7;

/**
 * GET /api/events/[id]/preview-token
 * Get current preview token status (not the token itself)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);

    const event = await db.event.findUnique({
      where: { id },
      select: {
        previewToken: true,
        previewTokenExpiresAt: true,
      },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    const hasToken = !!event.previewToken;
    const isExpired = event.previewTokenExpiresAt
      ? event.previewTokenExpiresAt < new Date()
      : false;

    return successResponse({
      hasToken,
      isExpired,
      expiresAt: event.previewTokenExpiresAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events/[id]/preview-token
 * Generate a new preview token (replaces existing one)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Generate new token
    const { token, hash } = generateTokenPair();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PREVIEW_TOKEN_EXPIRY_DAYS);

    // Save hashed token to database
    await db.event.update({
      where: { id },
      data: {
        previewToken: hash,
        previewTokenExpiresAt: expiresAt,
      },
    });

    return successResponse({
      token,
      expiresAt,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/events/[id]/preview-token
 * Revoke the preview token
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await verifyAuth(request);

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(id, user.id);

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    // Clear token
    await db.event.update({
      where: { id },
      data: {
        previewToken: null,
        previewTokenExpiresAt: null,
      },
    });

    return successResponse({ revoked: true });
  } catch (error) {
    return handleApiError(error);
  }
}
