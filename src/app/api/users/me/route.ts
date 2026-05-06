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

    // Best-effort sync to Firebase. If this fails, the DB row still has the
    // new name and the next ID-token refresh will see verifyAuth update it
    // back from `decoded.name` — which would clobber the new value. So we
    // log loudly but don't fail the request; the operator can investigate.
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
