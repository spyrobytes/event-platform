// Display constants for the wedding-only RSVP side field. Canonical enum
// and Zod validation live in @/schemas/rsvp.

import { type RsvpSide } from "@/schemas/rsvp";

export type { RsvpSide };

export const SIDE_OPTIONS: { value: RsvpSide; label: string }[] = [
  { value: "GROOMS_SIDE", label: "Groom's Side" },
  { value: "BRIDES_SIDE", label: "Bride's Side" },
  { value: "BOTH", label: "Both" },
];

export const SIDE_LABEL: Record<RsvpSide, string> = {
  GROOMS_SIDE: "Groom's",
  BRIDES_SIDE: "Bride's",
  BOTH: "Both",
};

// Empty string for null/undefined so the CSV column stays positionally
// aligned for non-wedding events.
export function formatSideForCsv(side: RsvpSide | null | undefined): string {
  return side ? SIDE_LABEL[side] : "";
}
