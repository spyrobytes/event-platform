import type { EventPageConfigV1 } from "@/schemas/event-page";

/** A single registry item as it appears on the page config. */
export type RegistryItem = Extract<
  EventPageConfigV1["sections"][number],
  { type: "registry" }
>["data"]["items"][number];

/**
 * Walk the event's page config and return the registry item with the given id,
 * or null if it doesn't exist / isn't claimable (funds aren't claimable per
 * phase 2 decisions — they're ongoing contributions, not one-off purchases).
 */
export function findClaimableItem(
  config: EventPageConfigV1,
  itemId: string
): RegistryItem | null {
  for (const section of config.sections) {
    if (section.type !== "registry") continue;
    const item = section.data.items.find((i) => i.id === itemId);
    if (!item) continue;
    if ((item.type ?? "link") !== "link") return null;
    return item;
  }
  return null;
}

/**
 * Aggregate existing guest claims into `{ [itemId]: totalQuantityClaimed }`.
 * Organizer claims are excluded — the organizer `purchased` flag short-circuits
 * the claim button UI before this helper is consulted.
 */
export function aggregateGuestClaims(
  claims: Array<{ itemId: string; quantity: number; source: "GUEST" | "ORGANIZER" }>
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const claim of claims) {
    if (claim.source !== "GUEST") continue;
    totals.set(claim.itemId, (totals.get(claim.itemId) ?? 0) + claim.quantity);
  }
  return totals;
}

/**
 * Build the per-item map the template renderer consumes: for each item we
 * need `claimedByOthers` (count from guests other than me) and `myClaim`
 * (my own active claim row, if any). Names are intentionally omitted from
 * the public-render payload per decision #2 (claimant names stay organizer-only).
 */
export type ClaimSummary = {
  itemId: string;
  claimedByOthers: number;
  myClaimId: string | null;
  myClaimQuantity: number;
};

export function summarizeClaims(params: {
  allClaims: Array<{
    id: string;
    itemId: string;
    quantity: number;
    inviteId: string | null;
    source: "GUEST" | "ORGANIZER";
  }>;
  myInviteId: string | null;
}): Map<string, ClaimSummary> {
  const { allClaims, myInviteId } = params;
  const out = new Map<string, ClaimSummary>();
  for (const claim of allClaims) {
    const existing = out.get(claim.itemId) ?? {
      itemId: claim.itemId,
      claimedByOthers: 0,
      myClaimId: null,
      myClaimQuantity: 0,
    };
    if (claim.source === "GUEST") {
      if (myInviteId && claim.inviteId === myInviteId) {
        existing.myClaimId = claim.id;
        existing.myClaimQuantity = claim.quantity;
      } else {
        existing.claimedByOthers += claim.quantity;
      }
    }
    out.set(claim.itemId, existing);
  }
  return out;
}

/**
 * Deterministically pick the first `cap` items for the preview grid on the
 * main event page. Featured items come first (in authored order), remaining
 * items fill the rest (also in authored order). No randomness — stable across
 * SSR/CSR and across renders so the preview doesn't flicker.
 */
export function pickPreviewItems<T extends { featured?: boolean }>(
  items: readonly T[],
  cap: number
): T[] {
  if (cap <= 0) return [];
  const featured: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (item.featured === true) featured.push(item);
    else rest.push(item);
  }
  return [...featured, ...rest].slice(0, cap);
}

/**
 * Retry a serializable transaction once on a Postgres serialization failure
 * (SQLSTATE 40001). Protects the claim-create path from losing a race when
 * two guests claim the last unit of an item simultaneously.
 */
export async function runWithSerializableRetry<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const isSerializationFailure =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "40001";
    if (!isSerializationFailure) throw err;
    return await fn();
  }
}
