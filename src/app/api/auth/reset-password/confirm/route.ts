import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleApiError } from "@/lib/api-response";
import { resetPassword } from "@/lib/password-reset";

const confirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = confirmSchema.parse(body);

    await resetPassword(token, password);

    return successResponse({
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
