import { z } from "zod";

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
  coverImageUrl: z.string().url().optional(),
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
  coverImageUrl: z.string().url().nullable().optional(),
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
