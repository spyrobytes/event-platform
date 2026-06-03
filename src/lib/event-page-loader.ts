import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import {
  lenientValidateAndMigrate,
  shouldPersistMigratedConfig,
  createMinimalConfig,
} from "@/lib/config-migrations";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import type { AccessLevel } from "@/lib/guest-access";

/**
 * Shared loader for the public `/e/[slug]` surface and its sub-routes
 * (e.g. `/e/[slug]/registry`). Extracting this keeps behavior identical
 * across surfaces — every new sub-route must enforce the same
 * published/visibility/token rules as the event page itself.
 */

export async function getEventBySlug(slug: string, tk: string | undefined) {
  const event = await db.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      startAt: true,
      endAt: true,
      timezone: true,
      venueName: true,
      address: true,
      city: true,
      country: true,
      coverImageUrl: true,
      status: true,
      visibility: true,
      pageConfig: true,
      templateId: true,
      publishedAt: true,
      rsvpDeadline: true,
      // Surfaced for EventJsonLd structured data on the page route.
      creator: { select: { name: true } },
      organization: { select: { name: true } },
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
  // PRIVATE events require a VALID guest token — token PRESENCE is not access.
  // A present-but-invalid/expired token grants nothing, so resolve it and 404
  // unless it maps to a live guest invite. Centralized here so no current or
  // future sub-route can leak a private event by checking only `?tk` presence.
  // (PUBLIC and UNLISTED stay open — UNLISTED means anyone with the direct link.)
  if (event.visibility === "PRIVATE") {
    const { accessLevel } = await resolveGuestAccess(tk, event.id);
    if (accessLevel !== "guest") return null;
  }

  return event;
}

/**
 * Returns the current slug of an event whose previous slug matches `slug`,
 * or null if no such retired slug exists. Used by the public `/e/*` pages
 * to 308-redirect old URLs (sent invites, indexed pages, QR codes) to the
 * organizer's renamed URL.
 *
 * Intentionally narrow: callers are responsible for the `permanentRedirect`
 * call so each sub-route can build the right destination path
 * (`/e/<new>`, `/e/<new>/wishes`, `/e/<new>/registry`) and preserve `?tk=`.
 */
export async function getRedirectForRetiredSlug(
  slug: string
): Promise<string | null> {
  const history = await db.eventSlugHistory.findUnique({
    where: { slug },
    select: { event: { select: { slug: true } } },
  });
  if (!history?.event) return null;
  // Defensive: if a stale history row points back at the current slug, don't
  // emit a self-redirect loop.
  if (history.event.slug === slug) return null;
  return history.event.slug;
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
      status: { notIn: ["EXPIRED", "BOUNCED", "REVOKED"] },
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
 * Parse, validate, and migrate the stored page config for the guest-facing
 * surfaces. Section-level lenient: a single unparseable section (e.g. an enum
 * value the running branch's schema doesn't know) is skipped, not fatal, so the
 * published page degrades to its valid sections instead of blanking entirely.
 *
 * Fire-and-forget persists the migrated config when registry items had uuids
 * lazily backfilled, so later reads (including the claim POST endpoint) observe
 * the same ids — but ONLY when no section was dropped, so a transient schema
 * skew can never strip the organizer's sections on a mere read. Falls back to a
 * minimal config only when the stored JSON is structurally invalid (bad
 * theme/hero or not an object).
 */
export function loadAndMigrateConfig(
  rawPageConfig: unknown,
  params: { eventId: string; eventTitle: string }
): EventPageConfigV1 {
  if (!rawPageConfig) return createMinimalConfig(params.eventTitle);

  try {
    const { config, dropped } = lenientValidateAndMigrate(rawPageConfig);
    if (shouldPersistMigratedConfig(rawPageConfig, config, dropped.length)) {
      db.event
        .update({
          where: { id: params.eventId },
          data: { pageConfig: config as unknown as object },
        })
        .catch((err) =>
          console.error("[page-config-migrate] failed to persist", {
            eventId: params.eventId,
            error: err instanceof Error ? err.message : String(err),
          })
        );
    }
    return config;
  } catch (err) {
    // Reaching here means the stored config isn't a record at all — section,
    // theme, hero, and optional-field failures are all tolerated upstream. This
    // blanks the public page to a minimal fallback, so it warrants a trail.
    console.error("[page-config] invalid stored config; using fallback", {
      eventId: params.eventId,
      error: err instanceof Error ? err.message : String(err),
    });
    return createMinimalConfig(params.eventTitle);
  }
}
