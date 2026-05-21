import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import { env } from "@/env";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-response";
import { verifyRsvpCodeSchema } from "@/schemas/rsvp";
import { hashRsvpCode, normalizeRsvpCode } from "@/lib/rsvp-code";
import { loadAndMigrateConfig } from "@/lib/event-page-loader";
import { getTemplateFamily } from "@/lib/section-nav-defaults";
import {
  createRsvpSession,
  RSVP_SESSION_COOKIE,
  RSVP_SESSION_TTL_SECONDS,
} from "@/lib/rsvp-session";
import {
  checkUpstashLimit,
  getClientIp,
  hashedIpKey,
  ipKey,
  upstashLimiter,
} from "@/lib/rate-limit";

// Two limiters per v3 §9. Both no-op until Upstash is provisioned (see
// rate-limit.ts JSDoc); call sites are correct from day 1 and activate
// instantly when the env vars land in Vercel.
const perIpLimiter = upstashLimiter("rsvp:verify:ip", 5, "1 m");
const perIpHourlyLimiter = upstashLimiter("rsvp:verify:ip:hourly", 20, "1 h");
const perEventLimiter = upstashLimiter("rsvp:verify:event", 200, "1 h");

const GENERIC_INVALID_MESSAGE =
  "We couldn't verify that invitation code. Please check it and try again.";

function genericInvalid(): NextResponse {
  // Single shared response for invalid code, expired invite, draft event,
  // missing event, eventId/invite mismatch — anything that could leak the
  // existence of a different invite or event if differentiated. v3 §5.2.
  return errorResponse(GENERIC_INVALID_MESSAGE, 400, "INVALID");
}

/**
 * POST /api/rsvp/public/verify-code
 * Public endpoint. Verifies an invitation code and issues a short-lived
 * RsvpSession (httpOnly cookie + body fallback) for the subsequent submit.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = verifyRsvpCodeSchema.parse(body);

    // Honeypot: any non-empty value means this is a bot submission. Treat
    // it identically to an invalid code so the bot can't distinguish.
    if (data.hp && data.hp.length > 0) {
      return genericInvalid();
    }

    // Rate limit BEFORE any DB work to keep enumeration cheap to absorb.
    const ip = getClientIp(request);
    const perIpKey = `${ipKey(ip)}:${data.eventId}`;
    const [perIpOk, perIpHourlyOk, perEventOk] = await Promise.all([
      checkUpstashLimit(perIpLimiter, perIpKey),
      checkUpstashLimit(perIpHourlyLimiter, perIpKey),
      checkUpstashLimit(perEventLimiter, data.eventId),
    ]);
    if (!perIpOk || !perIpHourlyOk || !perEventOk) {
      console.warn("[verify-code] rate limited", {
        hashedIp: hashedIpKey(ip),
        eventId: data.eventId,
      });
      return errorResponse(
        "Too many attempts. Please wait a few minutes and try again.",
        429,
        "RATE_LIMITED"
      );
    }

    // Normalize early so we can reject obviously-malformed input without
    // hitting the DB. After normalization the code must have at least one
    // alphanumeric character — `hashRsvpCode` would otherwise produce a
    // determinate hash of the empty string.
    const normalized = normalizeRsvpCode(data.code);
    if (normalized.length === 0) {
      return genericInvalid();
    }

    const event = await db.event.findUnique({
      where: { id: data.eventId },
      select: {
        id: true,
        title: true,
        status: true,
        rsvpDeadline: true,
        startAt: true,
        pageConfig: true,
        templateId: true,
      },
    });

    // Draft / cancelled / completed / missing → all collapse to one generic
    // error. Don't leak whether the event exists.
    if (!event || event.status !== "PUBLISHED") {
      return genericInvalid();
    }

    const now = new Date();
    if (event.rsvpDeadline && event.rsvpDeadline < now) {
      return errorResponse(
        "RSVPs for this event are closed.",
        400,
        "DEADLINE_PASSED"
      );
    }
    if (event.startAt < now) {
      return errorResponse(
        "This event has already taken place.",
        400,
        "EVENT_ENDED"
      );
    }

    const codeHash = hashRsvpCode(data.code);
    const invite = await db.invite.findUnique({
      where: { rsvpCodeHash: codeHash },
      select: {
        id: true,
        eventId: true,
        name: true,
        email: true,
        plusOnesAllowed: true,
        status: true,
        expiresAt: true,
      },
    });

    // Invite not found, wrong event, revoked, or expired → all generic. The
    // wrong-event check matters: a code from event A submitted with event B's
    // ID should not reveal that the code exists somewhere.
    if (!invite) return genericInvalid();
    if (invite.eventId !== data.eventId) return genericInvalid();
    if (invite.status === "REVOKED") return genericInvalid();
    if (invite.expiresAt && invite.expiresAt < now) return genericInvalid();

    const { rawToken } = await createRsvpSession(db, {
      eventId: invite.eventId,
      inviteId: invite.id,
    });

    // Mirror the invite-token flow: surface "Message for the couple" only
    // when the wishes section is on AND accepting submissions. Either off
    // → field hidden. Falls back to false on missing/invalid pageConfig.
    const pageConfig = loadAndMigrateConfig(event.pageConfig, {
      eventId: event.id,
      eventTitle: event.title,
    });
    const wishesSection = pageConfig.sections.find(
      (s) => s.type === "wishes" && s.enabled
    );
    const enableWishes =
      wishesSection?.type === "wishes"
        ? wishesSection.data.enableSubmissions !== false
        : false;

    const response = successResponse({
      // Body-fallback for clients without cookie support (per v3 §5.3 the
      // submit endpoint accepts the session token from cookie OR body).
      rsvpSessionToken: rawToken,
      invitePreview: {
        name: invite.name,
        hasEmail: !!invite.email,
        plusOnesAllowed: invite.plusOnesAllowed,
        enableWishes,
        showSideField: getTemplateFamily(event.templateId) === "wedding",
      },
    });

    response.cookies.set(RSVP_SESSION_COOKIE, rawToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/rsvp/public",
      maxAge: RSVP_SESSION_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    // A malformed body (Zod failure) must look identical to an invalid code
    // so probing tools can't differentiate between schema rejection and
    // lookup failure.
    if (error instanceof ZodError) {
      return genericInvalid();
    }
    return handleApiError(error);
  }
}
