import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api-response";
import { verifyAuth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      throw new UnauthorizedError();
    }

    return successResponse({
      emailVerified: user.emailVerified,
      email: user.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
