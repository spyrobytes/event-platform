import { z } from "zod";

/** Profile-edit input. Email is sourced from Firebase auth and not editable
 *  here; only `name` is updatable. Trim+min(1) blocks whitespace-only values
 *  that would leave the organizer in the same broken state as null. */
export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
