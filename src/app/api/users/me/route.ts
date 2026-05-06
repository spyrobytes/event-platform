import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/db";
import { verifyAuth, getFirebaseAdmin } from "@/lib/auth";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { updateUserProfileSchema } from "@/schemas/user";

/**
 * GET /api/users/me
 * Returns the current user's id, email, and name. Used by the profile page
 * to seed its form and by the dashboard to decide whether to show the
 * "complete your profile" banner.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/users/me
 * Updates the current user's display name. Mirrors the change to Firebase
 * Auth's displayName so future ID tokens carry the correct `name` claim
 * (keeps verifyAuth's lazy-provisioning path consistent).
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return errorResponse("Unauthorized", 401, "UNAUTHORIZED");

    const body = await request.json();
    const data = updateUserProfileSchema.parse(body);

    const updated = await db.user.update({
      where: { id: user.id },
      data: { name: data.name },
      select: { id: true, email: true, name: true },
    });

    // Best-effort sync to Firebase. The DB write above is canonical —
    // verifyAuth no longer re-syncs `name` from the token, so a sync
    // failure here doesn't risk a clobber. The cost is data drift: future
    // ID-token issuers (Firebase console, other apps sharing this project)
    // would still see the old displayName until corrected. Log loudly so
    // the operator can investigate.
    try {
      getFirebaseAdmin();
      await getAuth().updateUser(user.firebaseUid, {
        displayName: data.name,
      });
    } catch (syncError) {
      console.error("[profile] failed to sync displayName to Firebase", {
        userId: user.id,
        error: syncError instanceof Error ? syncError.message : String(syncError),
      });
    }

    return successResponse(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
