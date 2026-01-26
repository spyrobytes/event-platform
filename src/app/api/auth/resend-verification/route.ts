import { NextRequest } from "next/server";
import { successResponse, handleApiError } from "@/lib/api-response";
import { verifyAuth } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/verification";
import { UnauthorizedError, RateLimitError } from "@/lib/errors";
import { db } from "@/lib/db";

// Rate limit: 60 seconds between resend requests
const RESEND_COOLDOWN_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      throw new UnauthorizedError();
    }

    // Check if user's email is already verified
    if (user.emailVerified) {
      return successResponse({
        message: "Email is already verified",
        alreadyVerified: true,
      });
    }

    // Rate limit: check last verification email sent
    const lastEmail = await db.emailOutbox.findFirst({
      where: {
        toEmail: user.email,
        template: "VERIFICATION",
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

    await sendVerificationEmail(user.id);

    return successResponse({
      message: "Verification email sent",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
