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
