import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { validateAndMigrate, createMinimalConfig } from "@/lib/config-migrations";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { AccessLevel } from "@/lib/guest-access";

/**
 * Shared loader for the public `/e/[slug]` surface and its sub-routes
 * (e.g. `/e/[slug]/registry`). Extracting this keeps behavior identical
 * across surfaces — every new sub-route must enforce the same
 * published/visibility/token rules as the event page itself.
 */

export async function getEventBySlug(slug: string, hasGuestToken: boolean) {
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      timezone: true,
      venueName: true,
      city: true,
      status: true,
      visibility: true,
      pageConfig: true,
      templateId: true,
      publishedAt: true,
      rsvpDeadline: true,
      mediaAssets: {
        select: {
          id: true,
          kind: true,
          publicUrl: true,
          width: true,
          height: true,
          alt: true,
          blurDataUrl: true,
        },
      },
    },
  });

  if (!event) return null;
  if (!event.publishedAt) return null;
  if (event.status === "CANCELLED") return null;
  if (event.visibility === "PRIVATE" && !hasGuestToken) return null;

  return event;
}

export type GuestAccessResolution = {
  accessLevel: AccessLevel;
  guestName: string | null;
  rsvpToken: string | null;
  tokenInvalid: boolean;
  inviteId: string | null;
};

export async function resolveGuestAccess(
  tk: string | undefined,
  eventId: string
): Promise<GuestAccessResolution> {
  if (!tk) {
    return { accessLevel: "public", guestName: null, rsvpToken: null, tokenInvalid: false, inviteId: null };
  }

  const tokenHash = hashToken(tk);
  const invite = await db.invite.findFirst({
    where: {
      tokenHash,
      eventId,
      // Allow any status except EXPIRED and BOUNCED — guests can view
      // details before deciding to attend (PENDING/SENT/OPENED/RESPONDED).
      status: { notIn: ["EXPIRED", "BOUNCED"] },
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    select: { id: true, name: true },
  });

  if (invite) {
    return {
      accessLevel: "guest",
      guestName: invite.name || "Guest",
      rsvpToken: tk,
      tokenInvalid: false,
      inviteId: invite.id,
    };
  }

  console.warn("[guest-access] invalid token", {
    eventId,
    tokenPrefix: tk.slice(0, 8),
  });
  return { accessLevel: "public", guestName: null, rsvpToken: null, tokenInvalid: true, inviteId: null };
}

/**
 * Parse, validate, and migrate the stored page config. Fire-and-forget
 * persists the migrated config when registry items had uuids lazily
 * backfilled, so later reads (including the claim POST endpoint) observe
 * the same ids. Falls back to a minimal config if stored JSON is invalid.
 */
export function loadAndMigrateConfig(
  rawPageConfig: unknown,
  params: { eventId: string; eventTitle: string }
): EventPageConfigV1 {
  if (!rawPageConfig) return createMinimalConfig(params.eventTitle);

  try {
    const config = validateAndMigrate(rawPageConfig);
    if (JSON.stringify(rawPageConfig) !== JSON.stringify(config)) {
      db.event
        .update({
          where: { id: params.eventId },
          data: { pageConfig: config as unknown as object },
        })
        .catch((err) =>
          console.error("[page-config-migrate] failed to persist", err)
        );
    }
    return config;
  } catch {
    return createMinimalConfig(params.eventTitle);
  }
}
