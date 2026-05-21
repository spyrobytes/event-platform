/**
 * Shared constants for the wedding-only "Which side are you with?" RSVP
 * field. The canonical enum values and Zod validation live in
 * `@/schemas/rsvp`; this module owns the user-facing labels and selector
 * option pairs so the three RSVP form variants, the roster page, and the
 * CSV export agree on display copy.
 */

import { type RsvpSide } from "@/schemas/rsvp";

export type { RsvpSide };

/**
 * Selector options for the RSVP form (button label per value). Order
 * matches the visual order in the form: Groom's, Bride's, Both.
 */
export const SIDE_OPTIONS: { value: RsvpSide; label: string }[] = [
  { value: "GROOMS_SIDE", label: "Groom's Side" },
  { value: "BRIDES_SIDE", label: "Bride's Side" },
  { value: "BOTH", label: "Both" },
];

/**
 * Short labels used on the roster table and CSV export, where column
 * width is at a premium. Distinct from `SIDE_OPTIONS` labels by design.
 */
export const SIDE_LABEL: Record<RsvpSide, string> = {
  GROOMS_SIDE: "Groom's",
  BRIDES_SIDE: "Bride's",
  BOTH: "Both",
};

/**
 * CSV-safe label resolver — empty string for null/undefined so the
 * column stays positionally aligned for non-wedding events.
 */
export function formatSideForCsv(side: RsvpSide | null | undefined): string {
  return side ? SIDE_LABEL[side] : "";
}
