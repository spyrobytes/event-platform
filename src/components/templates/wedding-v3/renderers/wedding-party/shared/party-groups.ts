/**
 * Shared wedding-party grouping + member helpers.
 *
 * Used by every V3 flip-card party renderer (Scrapbook, Gilded Frames, and the
 * upcoming Couture Polaroid) so the bride/groom/special partition, the divider
 * labels, the local member shape, and the asset lookup live in one place
 * instead of being copy-pasted per renderer.
 */

import type { PartySide } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { isSpecialRole, getEffectiveSide } from "@/lib/wedding-party-roles";

export type PartyMember = {
  name: string;
  role: string;
  bio?: string;
  imageAssetId?: string;
  side?: PartySide;
};

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
