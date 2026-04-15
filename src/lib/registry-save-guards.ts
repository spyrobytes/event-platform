import type { EventPageConfigV1 } from "@/schemas/event-page";

export type RegistrySaveGuardViolation =
  | {
      kind: "removed_with_claims";
      itemId: string;
      itemName: string;
      claimedQuantity: number;
    }
  | {
      kind: "quantity_below_claims";
      itemId: string;
      itemName: string;
      newQuantity: number;
      claimedQuantity: number;
    };

type ClaimRow = {
  itemId: string;
  quantity: number;
  source: "GUEST" | "ORGANIZER";
};

type OldItemMeta = {
  name: string;
  /** Count of live guest+organizer claims aggregated from `existingClaims`. */
  claimedQuantity: number;
};

/**
 * Guard the page-editor save path: reject the save if any registry item with
 * live claims is being removed, converted away from the claimable "link" type,
 * or having its quantity reduced below the already-claimed total. Organizer
 * claims count toward the total (they represent the `purchased` toggle).
 *
 * Returns all violations in a single pass so the organizer can fix them in
 * one round trip rather than discovering them one save at a time.
 */
export function validateRegistrySaveAgainstClaims(params: {
  oldConfig: EventPageConfigV1 | null;
  newConfig: EventPageConfigV1;
  existingClaims: ClaimRow[];
}): RegistrySaveGuardViolation[] {
  const { oldConfig, newConfig, existingClaims } = params;

  const claimedByItem = new Map<string, number>();
  for (const claim of existingClaims) {
    claimedByItem.set(
      claim.itemId,
      (claimedByItem.get(claim.itemId) ?? 0) + claim.quantity
    );
  }

  // Only link-type items are claimable, so the set of item IDs that can
  // legally carry claims in the new config is exactly the link-type IDs.
  const newLinkItemByIdMap = new Map<
    string,
    { name: string; quantity: number }
  >();
  for (const section of newConfig.sections) {
    if (section.type !== "registry") continue;
    for (const item of section.data.items) {
      if ((item.type ?? "link") !== "link") continue;
      newLinkItemByIdMap.set(item.id, {
        name: item.name,
        quantity: item.quantity ?? 1,
      });
    }
  }

  // Recover a display name for any claimed item that's going missing. Falls
  // back to a placeholder when the old config couldn't be parsed or the item
  // was already orphaned before this save.
  const oldItemById = new Map<string, OldItemMeta>();
  if (oldConfig) {
    for (const section of oldConfig.sections) {
      if (section.type !== "registry") continue;
      for (const item of section.data.items) {
        oldItemById.set(item.id, {
          name: item.name,
          claimedQuantity: claimedByItem.get(item.id) ?? 0,
        });
      }
    }
  }

  const violations: RegistrySaveGuardViolation[] = [];
  for (const [itemId, claimedQuantity] of claimedByItem) {
    if (claimedQuantity <= 0) continue;
    const newItem = newLinkItemByIdMap.get(itemId);

    if (!newItem) {
      violations.push({
        kind: "removed_with_claims",
        itemId,
        itemName: oldItemById.get(itemId)?.name ?? "this gift",
        claimedQuantity,
      });
      continue;
    }

    if (newItem.quantity < claimedQuantity) {
      violations.push({
        kind: "quantity_below_claims",
        itemId,
        itemName: newItem.name,
        newQuantity: newItem.quantity,
        claimedQuantity,
      });
    }
  }

  return violations;
}

/** Human-readable message for a single violation. */
export function formatViolation(v: RegistrySaveGuardViolation): string {
  if (v.kind === "removed_with_claims") {
    return `Can't remove "${v.itemName}" — ${v.claimedQuantity} guest${v.claimedQuantity === 1 ? " has" : "s have"} claimed it. Ask guests to unclaim, or mark it purchased instead.`;
  }
  return `Can't lower "${v.itemName}" quantity to ${v.newQuantity} — ${v.claimedQuantity} already claimed. Raise the quantity or ask guests to unclaim first.`;
}

/** Joined message for the 400 response body. */
export function formatViolations(violations: RegistrySaveGuardViolation[]): string {
  return violations.map(formatViolation).join(" ");
}
