import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyEventOwnership, canModifyPageConfig, assertCanPublish } from "@/lib/authorization";
import {
  resolveEffectiveUser,
  requireEffectiveMutator,
  auditImpersonatedEdit,
} from "@/lib/impersonation";
import { MEDIA_ASSET_SELECT } from "@/lib/event-page-loader";
import {
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/api-response";
import {
  lenientValidateAndMigrate,
  shouldPersistMigratedConfig,
  mergePreservedSections,
  getPreservedRegistryItemIds,
  createMinimalConfig,
  type DroppedSection,
} from "@/lib/config-migrations";
import { revalidateEventPage } from "@/lib/revalidation";
import { eventPageConfigV1Schema } from "@/schemas/event-page";
import type { EventPageConfigV1 } from "@/schemas/event-page";
import {
  validateRegistrySaveAgainstClaims,
  formatViolations,
} from "@/lib/registry-save-guards";
import { validateMapSectionsInConfig } from "@/lib/maps/map-utils";

/** Keep only the most recent N versions per event, delete the rest. */
const MAX_VERSIONS_PER_EVENT = 10;

async function pruneOldVersions(eventId: string) {
  const versions = await db.eventPageVersion.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    skip: MAX_VERSIONS_PER_EVENT,
  });

  if (versions.length > 0) {
    await db.eventPageVersion.deleteMany({
      where: { id: { in: versions.map((v) => v.id) } },
    });
  }
}

const pageConfigActionSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
});

/**
 * Original stored indices of preserved (unparseable) sections the organizer
 * chose to drop permanently via the editor banner. Absent/empty = keep all
 * preserved sections (the default — option (a), never lose data).
 */
const removedPreservedIndicesSchema = z
  .array(z.number().int().nonnegative())
  .optional()
  .default([]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/page-config
 * Get the current page configuration
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;

    const ctx = await resolveEffectiveUser(request, eventId);
    if (!ctx) {
      return errorResponse("Unauthorized", 401);
    }

    const hasAccess = await verifyEventOwnership(eventId, ctx.effective.id);
    if (!hasAccess) {
      return errorResponse("Event not found or access denied", 404);
    }

    // Get full event data for config
    const fullEvent = await db.event.findUnique({
      where: { id: eventId },
      select: {
        title: true,
        slug: true,
        startAt: true,
        endAt: true,
        timezone: true,
        rsvpDeadline: true,
        venueName: true,
        address: true,
        city: true,
        country: true,
        pageConfig: true,
        templateId: true,
        publishedAt: true,
        schedule: true,
        mediaAssets: {
          select: { ...MEDIA_ASSET_SELECT, tags: true },
        },
      },
    });

    if (!fullEvent) {
      return errorResponse("Event not found", 404);
    }

    // Validate and migrate config or create minimal config. Section-level
    // lenient: a single unparseable section is skipped (reported in `dropped`)
    // rather than blanking the whole editor. theme/hero stay strict — a config
    // broken there still falls back to minimal.
    let config: EventPageConfigV1;
    let dropped: DroppedSection[] = [];
    if (fullEvent.pageConfig) {
      try {
        const result = lenientValidateAndMigrate(fullEvent.pageConfig);
        config = result.config;
        dropped = result.dropped;
        // Persist if lazy-backfill assigned new registry item uuids; see
        // companion write in src/app/e/[slug]/page.tsx for the same reason.
        // Gated: only purely-additive backfills with zero dropped sections are
        // written back, so a transient schema skew can neither strip sections
        // nor erase a newer optional field on a mere read.
        if (shouldPersistMigratedConfig(fullEvent.pageConfig, config, dropped.length)) {
          await db.event.update({
            where: { id: eventId },
            data: { pageConfig: config as unknown as object },
          });
        }
      } catch {
        // If validation fails, create a minimal config
        config = createMinimalConfig(fullEvent.title);
      }
    } else {
      config = createMinimalConfig(fullEvent.title);
    }

    return successResponse({
      config,
      // Sections the running schema couldn't parse — preserved in storage and
      // re-merged on save; the editor surfaces these in a non-blocking banner.
      dropped,
      templateId: fullEvent.templateId || "wedding_v1",
      isPublished: !!fullEvent.publishedAt,
      publishedAt: fullEvent.publishedAt,
      assets: fullEvent.mediaAssets,
      // Event-row fields consumers need alongside the config: the editor prefills
      // new map sections from venue/address (Phase 2 D2), and the page preview
      // reads slug (public link) + dates (countdown) from here — so the preview
      // stays on this one act-as-honored route instead of a separate event GET.
      event: {
        slug: fullEvent.slug,
        venueName: fullEvent.venueName,
        address: fullEvent.address,
        city: fullEvent.city,
        country: fullEvent.country,
        timezone: fullEvent.timezone,
        startAt: fullEvent.startAt,
        endAt: fullEvent.endAt,
        rsvpDeadline: fullEvent.rsvpDeadline,
        // Raw typed schedule: the preview + editor derive the schedule
        // section's display from this (canonical-schedule PR 3d).
        schedule: fullEvent.schedule,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/events/[id]/page-config
 * Update the page configuration
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;

    const ctx = await requireEffectiveMutator(request, eventId);
    if (ctx instanceof Response) return ctx;
    const { effective } = ctx;

    const canModify = await canModifyPageConfig(eventId, effective.id);
    if (!canModify) {
      return errorResponse("Event not found or access denied", 403);
    }

    const body = await request.json();
    const { config, templateId } = body;
    const removedIndices = removedPreservedIndicesSchema.parse(
      body.removedPreservedIndices
    );

    // Validate config against schema
    const parseResult = eventPageConfigV1Schema.safeParse(config);
    if (!parseResult.success) {
      return errorResponse(
        `Invalid config: ${parseResult.error.message}`,
        400
      );
    }

    const validatedConfig: EventPageConfigV1 = parseResult.data;

    // Registry save guard: reject removals / type-flips / quantity reductions
    // that would orphan or under-supply live claims. Runs alongside the fetch
    // of existing claims; cheap enough on every save (O(items + claims)).
    const [existingEvent, existingClaims] = await Promise.all([
      db.event.findUnique({
        where: { id: eventId },
        select: { pageConfig: true },
      }),
      db.registryClaim.findMany({
        where: { eventId },
        select: { itemId: true, quantity: true, source: true },
      }),
    ]);

    let oldConfig: EventPageConfigV1 | null = null;
    if (existingEvent?.pageConfig) {
      try {
        // Lenient so a sibling unparseable section doesn't blind the registry
        // guard to a valid registry section. Only throws on broken theme/hero.
        oldConfig = lenientValidateAndMigrate(existingEvent.pageConfig).config;
      } catch {
        // Prior config couldn't be parsed — guard still runs against new config;
        // we just won't have old display names for any removed items.
      }
    }

    // Claims backed by a preserved (quarantined) registry section aren't
    // orphaned — that section is being re-merged below, not removed. Exempt them
    // so a registry section that's unparseable on this branch can't wedge every
    // save with a false "removed gift with live claims" violation.
    const preservedRegistryItemIds = getPreservedRegistryItemIds(
      existingEvent?.pageConfig
    );
    const claimsForGuard =
      preservedRegistryItemIds.size > 0
        ? existingClaims.filter((c) => !preservedRegistryItemIds.has(c.itemId))
        : existingClaims;

    const violations = validateRegistrySaveAgainstClaims({
      oldConfig,
      newConfig: validatedConfig,
      existingClaims: claimsForGuard,
    });
    if (violations.length > 0) {
      return errorResponse(formatViolations(violations), 400);
    }

    // Re-attach preserved (unparseable-on-this-branch) sections from the stored
    // row so a save can't strip them. Content comes from storage, never the
    // client (tamper-proof); removedIndices are the ones the organizer chose to
    // drop permanently. Preserved sections don't count against the editable cap,
    // so this is infallible — it never blocks or strips to fit a ceiling.
    const configToStore = mergePreservedSections({
      validatedConfig,
      storedRawConfig: existingEvent?.pageConfig,
      removedIndices,
    }) as unknown as object;

    // Save version history and prune old versions
    await db.eventPageVersion.create({
      data: {
        eventId,
        pageConfig: configToStore,
        configVersion: validatedConfig.schemaVersion,
        // Attribute the version to the ORGANIZER (effective). Version history is
        // organizer-facing (versions/route.ts resolves createdBy → name/email),
        // so recording the admin here would leak staff PII to the customer. The
        // admin actor is captured in the immutable audit log instead, below.
        createdBy: effective.id,
      },
    });
    await pruneOldVersions(eventId);

    // Update event and get slug for revalidation
    const updatedEvent = await db.event.update({
      where: { id: eventId },
      data: {
        pageConfig: configToStore,
        ...(templateId && { templateId }),
      },
      select: {
        slug: true,
        publishedAt: true,
      },
    });

    // Record the act-as edit BEFORE the best-effort revalidate, so a transient
    // revalidation failure can't drop the audit row for a committed mutation.
    await auditImpersonatedEdit(ctx, request, eventId, {
      route: "page-config.PUT",
      templateChanged: !!templateId,
    });

    // Revalidate public page if published
    if (updatedEvent.publishedAt) {
      await revalidateEventPage(updatedEvent.slug);
    }

    return successResponse({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/events/[id]/page-config
 * Publish or unpublish the page
 * Body: { action: "publish" | "unpublish" }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;

    const ctx = await requireEffectiveMutator(request, eventId);
    if (ctx instanceof Response) return ctx;
    const { effective } = ctx;

    const hasAccess = await verifyEventOwnership(eventId, effective.id);
    if (!hasAccess) {
      return errorResponse("Event not found or access denied", 404);
    }

    const body = await request.json();
    const { action } = pageConfigActionSchema.parse(body);

    if (action === "publish") {
      // Publishing is gated stricter than editing: an UNDER_REVIEW organizer may
      // edit drafts but not push them live. assertCanPublish adds the
      // UNDER_REVIEW check on top of the SUSPENDED check the mutator already ran
      // — and it applies to an admin acting-as such an organizer too.
      assertCanPublish(effective);

      // Verify config is valid before publishing
      const fullEvent = await db.event.findUnique({
        where: { id: eventId },
        select: {
          slug: true,
          pageConfig: true,
          title: true,
          templateId: true,
        },
      });

      if (!fullEvent) {
        return errorResponse("Event not found", 404);
      }

      // Get or create config. Section-level lenient so one unparseable section
      // doesn't block publishing — the page goes live with its valid sections,
      // mirroring the public render. Preserved sections are re-attached so
      // publish doesn't strip them. theme/hero stay strict (a config broken
      // there can't publish). Legacy map sections still get formattedAddress
      // backfilled (via migratePageConfig) before the publish gate runs.
      let config: EventPageConfigV1;
      let configToStore: object;
      if (fullEvent.pageConfig) {
        let lenient;
        try {
          lenient = lenientValidateAndMigrate(fullEvent.pageConfig);
        } catch (err) {
          const reason = err instanceof Error ? err.message : "invalid config";
          return errorResponse(
            `Cannot publish: page config is invalid (${reason})`,
            400
          );
        }
        config = lenient.config;
        // Infallible merge — preserved sections are re-attached, never stripped
        // to fit a cap, so publishing can't silently delete quarantined data.
        configToStore = mergePreservedSections({
          validatedConfig: config,
          storedRawConfig: fullEvent.pageConfig,
        }) as unknown as object;
      } else {
        config = createMinimalConfig(fullEvent.title);
        configToStore = config as unknown as object;
      }

      // Publish-time semantic checks beyond Zod (e.g. enabled map sections
      // must carry address + coords). Drafts can save without these.
      const mapResult = validateMapSectionsInConfig(config);
      if (!mapResult.ok) {
        return errorResponse(mapResult.reason, 400);
      }

      await db.event.update({
        where: { id: eventId },
        data: {
          publishedAt: new Date(),
          pageConfig: configToStore,
        },
      });

      await auditImpersonatedEdit(ctx, request, eventId, {
        route: "page-config.POST",
        action: "publish",
      });

      // Revalidate the public page
      await revalidateEventPage(fullEvent.slug);

      return successResponse({ published: true, publishedAt: new Date() });
    } else if (action === "unpublish") {
      // Get slug before unpublishing for revalidation
      const event = await db.event.findUnique({
        where: { id: eventId },
        select: { slug: true },
      });

      await db.event.update({
        where: { id: eventId },
        data: {
          publishedAt: null,
        },
      });

      await auditImpersonatedEdit(ctx, request, eventId, {
        route: "page-config.POST",
        action: "unpublish",
      });

      // Revalidate to clear the cached page
      if (event) {
        await revalidateEventPage(event.slug);
      }

      return successResponse({ published: false });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
