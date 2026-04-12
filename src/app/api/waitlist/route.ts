import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  source: z.string().max(50).optional(),
});

/**
 * POST /api/waitlist
 * Public — adds an email to the waitlist for GA launch notifications.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = waitlistSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.issues[0].message, 400);
    }

    const { email, source } = result.data;

    // Upsert to avoid duplicate key errors
    await db.waitlist.upsert({
      where: { email },
      create: { email, source },
      update: {},
    });

    return successResponse({ joined: true });
  } catch (error) {
    return handleApiError(error);
  }
}
