import { z } from "zod";

/**
 * Organizer-entered wedding wishes collected outside the invite/RSVP
 * pipeline (paper cards, Google Docs, other tools). Shared between the
 * dashboard form and the /api/events/[id]/wishes/manual routes.
 *
 * Limits mirror the guest-side RSVP fields (`src/schemas/rsvp.ts`):
 * authorName matches guestName (200), message matches messageToHost (1000)
 * so manual wishes render identically to guest wishes on the public wall.
 */
export const manualWishSchema = z.object({
  authorName: z
    .string()
    .max(200, "Name must be less than 200 characters")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Name is required"),
  message: z
    .string()
    .max(1000, "Message must be less than 1000 characters")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Message is required"),
});

export type ManualWishInput = z.infer<typeof manualWishSchema>;
