import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireEventOwner } from "@/lib/authorization";
import {
  resolveEffectiveUser,
  requireEffectiveMutator,
  auditImpersonatedEdit,
} from "@/lib/impersonation";
import {
  successResponse,
  handleApiError,
  errorResponse,
} from "@/lib/api-response";
import { invitationConfigSchema } from "@/schemas/invitation";
import { NotFoundError } from "@/lib/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/events/[id]/invitation-config
 * Get invitation configuration for an event
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const ctx = await resolveEffectiveUser(request, eventId);

    if (!ctx) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    await requireEventOwner(eventId, ctx.effective.id);

    // Fetch invitation config
    const config = await db.invitationConfig.findUnique({
      where: { eventId },
    });

    // Return null if no config exists (event doesn't have elegant invitations yet)
    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/events/[id]/invitation-config
 * Create or update invitation configuration
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const ctx = await requireEffectiveMutator(request, eventId);
    if (ctx instanceof Response) return ctx;
    const { effective } = ctx;

    await requireEventOwner(eventId, effective.id);

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError("Event not found");
    }

    const body = await request.json();
    const data = invitationConfigSchema.parse(body);

    // Build the shared field set
    const configFields = {
      template: data.template,
      themeId: data.themeId,
      typographyPair: data.typographyPair,
      coupleDisplayName: data.coupleDisplayName || null,
      person1Name: data.person1Name || null,
      person2Name: data.person2Name || null,
      headerText: data.headerText || null,
      headerMode: data.headerMode,
      dateWordingStyle: data.dateWordingStyle,
      person1FamilyName: data.person1FamilyName || null,
      person2FamilyName: data.person2FamilyName || null,
      familyInviteText: data.familyInviteText || null,
      eventTypeText: data.eventTypeText || null,
      monogram: data.monogram || null,
      customMessage: data.customMessage || null,
      dressCode: data.dressCode || null,
      heroImageUrl: data.heroImageUrl || null,
      // Wedding Storybook fields
      couplePhotoUrl: data.couplePhotoUrl || null,
      venuePhotoUrl: data.venuePhotoUrl || null,
      ceremonyStartAt: data.ceremonyStartAt || null,
      receptionStartAt: data.receptionStartAt || null,
      // Legacy free-text display fields are preserve-if-absent: the editor
      // stopped offering them (canonical-schedule PR 3c), so an ordinary
      // save must not wipe wording saved before that — existing invitations
      // keep displaying unchanged until PR 6 removes the columns (plan
      // §4.3). An explicit "" still clears (the editor's remove-hand-typed-
      // text action sends empty strings).
      ...(data.ceremonyDate !== undefined
        ? { ceremonyDate: data.ceremonyDate || null }
        : {}),
      ...(data.ceremonyTime !== undefined
        ? { ceremonyTime: data.ceremonyTime || null }
        : {}),
      ...(data.ceremonyVenue !== undefined
        ? { ceremonyVenue: data.ceremonyVenue || null }
        : {}),
      ...(data.ceremonyAddress !== undefined
        ? { ceremonyAddress: data.ceremonyAddress || null }
        : {}),
      ...(data.receptionDate !== undefined
        ? { receptionDate: data.receptionDate || null }
        : {}),
      ...(data.receptionTime !== undefined
        ? { receptionTime: data.receptionTime || null }
        : {}),
      ...(data.receptionVenue !== undefined
        ? { receptionVenue: data.receptionVenue || null }
        : {}),
      ...(data.receptionAddress !== undefined
        ? { receptionAddress: data.receptionAddress || null }
        : {}),
      ...(data.rsvpDeadline !== undefined
        ? { rsvpDeadline: data.rsvpDeadline || null }
        : {}),
      storyHeading: data.storyHeading || null,
      storyParagraphs: data.storyParagraphs || [],
      timelineJson: data.timelineJson ?? Prisma.JsonNull,
      person1Quote: data.person1Quote || null,
      person1QuoteAttr: data.person1QuoteAttr || null,
      person2Quote: data.person2Quote || null,
      person2QuoteAttr: data.person2QuoteAttr || null,
      locale: data.locale,
      textDirection: data.textDirection,
    };

    // Upsert the configuration
    const config = await db.invitationConfig.upsert({
      where: { eventId },
      create: { eventId, ...configFields },
      update: configFields,
    });

    await auditImpersonatedEdit(ctx, request, eventId, {
      route: "invitation-config.PUT",
      template: data.template,
    });

    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/events/[id]/invitation-config
 * Delete invitation configuration (revert to legacy RSVP)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: eventId } = await context.params;
    const ctx = await requireEffectiveMutator(request, eventId);
    if (ctx instanceof Response) return ctx;
    const { effective } = ctx;

    await requireEventOwner(eventId, effective.id);

    // Check if config exists
    const existing = await db.invitationConfig.findUnique({
      where: { eventId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Invitation config not found");
    }

    await db.invitationConfig.delete({
      where: { eventId },
    });

    await auditImpersonatedEdit(ctx, request, eventId, {
      route: "invitation-config.DELETE",
    });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
