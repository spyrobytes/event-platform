import { z } from "zod";

/**
 * Pagination schema for list endpoints
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Cursor (seek) pagination for list endpoints ordered by a stable key:
 * `cursor` is the id of the last row of the previous page. Shared by the
 * wishes moderation and manual-wishes routes.
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.string().cuid(),
});

export type IdParam = z.infer<typeof idParamSchema>;

/**
 * Slug parameter schema
 */
export const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
});

export type SlugParam = z.infer<typeof slugParamSchema>;
