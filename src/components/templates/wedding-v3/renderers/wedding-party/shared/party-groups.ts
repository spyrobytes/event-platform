/**
 * Shared wedding-party grouping + member helpers.
 *
 * Currently consumed by the Gilded Frames renderer via `WeddingPartyGroups`;
 * the Scrapbook renderer still has its own copies pending migration, and the
 * upcoming Couture Polaroid will build on these. Centralizes the
 * bride/groom/special partition, the divider labels, the member shape, and the
 * asset lookup so they aren't copy-pasted per renderer.
 */

import type { PartyMember } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { isSpecialRole, getEffectiveSide } from "@/lib/wedding-party-roles";

// The member shape is owned by the Zod schema; re-export it so the shared
// layout/card code has one canonical type that can't drift from the data.
export type { PartyMember };

/** Divider labels for the grouped layout. */
export const PARTY_GROUP_LABELS = {
  brides: "Bride’s side",
  grooms: "Groom’s side",
  others: "Others",
  special: "Special Roles",
} as const;

export type PartyGroups = {
  specialMembers: PartyMember[];
  bridesSide: PartyMember[];
  groomsSide: PartyMember[];
  others: PartyMember[];
  /** True when at least one member is assigned to a bride/groom side. */
  hasSides: boolean;
};

/**
 * Partition members into special roles first, then bride/groom by explicit
 * `side` with role-keyword inference as the fallback.
 */
export function partitionPartyMembers(members: PartyMember[]): PartyGroups {
  const specialMembers = members.filter((m) => isSpecialRole(m.role));
  const regularMembers = members.filter((m) => !isSpecialRole(m.role));
  const bridesSide = regularMembers.filter((m) => getEffectiveSide(m) === "bride");
  const groomsSide = regularMembers.filter((m) => getEffectiveSide(m) === "groom");
  const others = regularMembers.filter((m) => getEffectiveSide(m) === "other");
  const hasSides = bridesSide.length > 0 || groomsSide.length > 0;
  return { specialMembers, bridesSide, groomsSide, others, hasSides };
}

export function getPartyAsset(
  assetId: string | undefined,
  assets: MediaAsset[],
): MediaAsset | null {
  if (!assetId) return null;
  return assets.find((a) => a.id === assetId) ?? null;
}
