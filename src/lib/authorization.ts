import { db } from "./db";
import { NotFoundError, ForbiddenError } from "./errors";

/**
 * Checks if the user is the owner of the event or has admin access via organization
 * Throws NotFoundError if event doesn't exist
 * Throws ForbiddenError if user doesn't have access
 */
export async function requireEventOwner(
  eventId: string,
  userId: string
): Promise<void> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      creatorId: true,
      organizationId: true,
    },
  });

  if (!event) {
    throw new NotFoundError("Event not found");
  }

  // Check if user is the creator
  if (event.creatorId === userId) {
    return;
  }

  // Check if user has admin/owner role in the event's organization
  if (event.organizationId) {
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: event.organizationId,
          userId,
        },
      },
      select: { role: true },
    });

    if (membership?.role === "OWNER" || membership?.role === "ADMIN") {
      return;
    }
  }

  throw new ForbiddenError("You don't have permission to access this event");
}

/**
 * Checks if the user has admin access to the organization
 * Throws NotFoundError if organization doesn't exist
 * Throws ForbiddenError if user doesn't have access
 */
export async function requireOrgAdmin(
  organizationId: string,
  userId: string
): Promise<void> {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new ForbiddenError("You are not a member of this organization");
  }

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new ForbiddenError("You don't have admin access to this organization");
  }
}

/**
 * Checks if the user is a member of the organization
 */
export async function requireOrgMember(
  organizationId: string,
  userId: string
): Promise<void> {
  const membership = await db.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("You are not a member of this organization");
  }
}

// =============================================================================
// CUSTOM EVENT PAGES AUTHORIZATION
// =============================================================================

/**
 * Checks if the user owns the event (returns boolean, doesn't throw)
 * Used when you need to check ownership without throwing an error
 */
export async function verifyEventOwnership(
  eventId: string,
  userId: string
): Promise<boolean> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      creatorId: true,
      organizationId: true,
    },
  });

  if (!event) {
    return false;
  }

  // Check if user is the creator
  if (event.creatorId === userId) {
    return true;
  }

  // Check if user has admin/owner role in the event's organization
  if (event.organizationId) {
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: event.organizationId,
          userId,
        },
      },
      select: { role: true },
    });

    if (membership?.role === "OWNER" || membership?.role === "ADMIN") {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the user can publish an event
 * Currently same as ownership check, but can be extended with additional
 * requirements (e.g., payment status, content moderation approval)
 */
export async function canPublishEvent(
  eventId: string,
  userId: string
): Promise<boolean> {
  // For now, publishing requires ownership
  // Future: Add checks for payment status, content moderation, etc.
  return verifyEventOwnership(eventId, userId);
}

/**
 * Checks if the user can modify the event's page configuration
 * Same as ownership for now, but separated for future extensibility
 */
export async function canModifyPageConfig(
  eventId: string,
  userId: string
): Promise<boolean> {
  return verifyEventOwnership(eventId, userId);
}

/**
 * Checks if the user can upload media to an event
 * Includes checking asset limits
 */
export async function canUploadMedia(
  eventId: string,
  userId: string,
  maxAssets: number = 50
): Promise<{ allowed: boolean; reason?: string }> {
  // First check ownership
  const hasAccess = await verifyEventOwnership(eventId, userId);
  if (!hasAccess) {
    return { allowed: false, reason: "You don't have permission to upload to this event" };
  }

  // Check asset count limit
  const assetCount = await db.mediaAsset.count({
    where: { eventId },
  });

  if (assetCount >= maxAssets) {
    return { allowed: false, reason: `Maximum asset limit reached (${maxAssets})` };
  }

  return { allowed: true };
}
