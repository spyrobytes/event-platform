import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, handleApiError } from "@/lib/api-response";
import { sendPasswordResetEmail } from "@/lib/password-reset";
import { RateLimitError } from "@/lib/errors";
import { db } from "@/lib/db";

const requestSchema = z.object({
  email: z.string().email(),
});

// Rate limit: 60 seconds between reset requests per email
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = requestSchema.parse(body);

    // Rate limit: check last password reset email to this address
    const lastEmail = await db.emailOutbox.findFirst({
      where: {
        toEmail: email,
        template: "PASSWORD_RESET",
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastEmail && Date.now() - lastEmail.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - (Date.now() - lastEmail.createdAt.getTime())) / 1000
      );
      throw new RateLimitError(
        `Please wait ${remainingSeconds} seconds before requesting another email`
      );
    }

    await sendPasswordResetEmail(email);

    // Always return success (prevent email enumeration)
    return successResponse({
      message: "If an account exists with that email, a reset link has been sent.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
