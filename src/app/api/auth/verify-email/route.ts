import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleApiError } from "@/lib/api-response";
import { verifyEmail } from "@/lib/verification";

const verifySchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = verifySchema.parse(body);

    const result = await verifyEmail(token);

    return successResponse({
      message: "Email verified successfully",
      email: result.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
