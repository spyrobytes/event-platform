import { z } from "zod";
import { isReservedSlug } from "@/lib/reserved-slugs";

/**
 * Valid template IDs
 */
export const VALID_TEMPLATE_IDS = ["wedding_v1", "wedding_v2", "wedding_editorial", "wedding_intimate_note", "wedding_fine_art", "wedding_garden_house", "wedding_grand_luxe", "wedding_celebration", "conference_v1", "party_v1"] as const;
export type TemplateId = (typeof VALID_TEMPLATE_IDS)[number];

/**
 * Custom event slug.
 *  - 3–60 chars, letters/digits/hyphen, no leading/trailing hyphen
 *  - Input is normalized to lowercase before validation so the schema and
 *    `check-slug` agree on canonical form
 *  - Not in the reserved list (top-level routes, future surfaces)
 *
 * Generated slugs from `generateSlug()` already conform; this schema is for
 * organizer-supplied slugs at the API boundary.
 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;

export const slugSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(60, "Slug must be 60 characters or fewer")
      .regex(
        SLUG_PATTERN,
        "Use letters, numbers, and hyphens. Cannot start or end with a hyphen."
      )
      .refine((s) => !isReservedSlug(s), {
        message: "This slug is reserved. Please choose another.",
      })
  );

/**
 * Shape of the /api/events/check-slug response. Shared between the route
 * handler and the SlugEditor so reason strings stay in sync.
 */
export type SlugAvailabilityReason = "invalid" | "reserved" | "taken" | "self";

export type SlugAvailability =
  | { available: true; reason?: "self" }
  | { available: false; reason: "invalid" | "reserved" | "taken" };

/**
 * Schema for creating a new event
 */
export const createEventSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .optional(),
  startAt: z.coerce.date().refine((d) => d > new Date(), {
    message: "Start date must be in the future",
  }),
  endAt: z.coerce.date().optional(),
  timezone: z.string().default("UTC"),
  venueName: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PUBLIC"),
  maxAttendees: z.number().int().positive().max(10000).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  templateId: z.enum(VALID_TEMPLATE_IDS).optional(),
  // RSVP settings
  rsvpDeadline: z.coerce.date().optional(),
  reminderDays: z.number().int().min(1).max(30).optional(),
  reminderEnabled: z.boolean().default(false),
  attachQrToConfirmation: z.boolean().default(true),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Schema for updating an existing event
 */
export const updateEventSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .nullable()
    .optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().nullable().optional(),
  timezone: z.string().optional(),
  venueName: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  maxAttendees: z.number().int().positive().max(10000).nullable().optional(),
  coverImageUrl: z.string().url().nullable().optional().or(z.literal("")),
  templateId: z.enum(VALID_TEMPLATE_IDS).nullable().optional(),
  // Custom URL slug. Optional — when present, the PATCH handler runs the
  // rename flow (history insert + uniqueness check). Format/normalization
  // is enforced by slugSchema (lowercased via transform).
  slug: slugSchema.optional(),
  // RSVP settings
  rsvpDeadline: z.coerce.date().nullable().optional(),
  reminderDays: z.number().int().min(1).max(30).nullable().optional(),
  reminderEnabled: z.boolean().optional(),
  attachQrToConfirmation: z.boolean().optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Schema for publishing an event
 */
export const publishEventSchema = z.object({
  publishedAt: z.coerce.date().optional(),
});

export type PublishEventInput = z.infer<typeof publishEventSchema>;

/**
 * Schema for event query parameters
 */
export const eventQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
  city: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type EventQueryInput = z.infer<typeof eventQuerySchema>;
