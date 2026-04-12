import { NextRequest } from "next/server";
import { verifyAuth } from "./auth";
import { errorResponse } from "./api-response";
import type { User } from "@prisma/client";

/**
 * Verify that the request is from an authenticated admin user.
 * Returns the user if admin, or a 403 response.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<User | Response> {
  const user = await verifyAuth(request);

  if (!user) {
    return errorResponse("Unauthorized", 401);
  }

  if (!user.isAdmin) {
    return errorResponse("Forbidden — admin access required", 403);
  }

  return user;
}

export function isAdminUser(user: User): boolean {
  return user.isAdmin;
}
