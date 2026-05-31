import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, errorResponse } from "@/lib/api-response";
import { hashToken } from "@/lib/tokens";
import { markInviteOpenedIfUnopened } from "@/lib/invite-status";

/**
 * POST /api/invites/opened  body: { token }
 *
 * Client beacon that marks an invite OPENED on a real (JS-executing) page view.
 * Replaces the prior server-render OPENED write, which link-preview crawlers
 * (WhatsApp / Slack / iMessage unfurlers) triggered on a plain HTML GET — before
 * the guest ever opened the link (issue #148). Bots don't run JS, so they never
 * reach this endpoint.
 *
 * Public + token-gated (same trust boundary as the share link itself) and
 * idempotent (only advances a pre-open state). Always returns 204 so it never
 * leaks whether a token is valid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body as { token?: unknown })?.token;
    if (!token || typeof token !== "string") {
      return errorResponse("Token is required", 400, "MISSING_TOKEN");
    }

    const invite = await db.invite.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, status: true },
    });

    if (invite) {
      try {
        await markInviteOpenedIfUnopened(invite.id, invite.status);
      } catch {
        // Best-effort: a write race (e.g. concurrent revoke/delete) must not
        // break the always-204, no-leak contract. The beacon ignores the body.
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
