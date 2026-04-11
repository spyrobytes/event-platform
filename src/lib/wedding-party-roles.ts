/**
 * Wedding party role classification shared by every renderer and the Page
 * Editor. One source of truth for which role keywords count as "special",
 * and which keywords place a member on the bride's or groom's side.
 *
 * Grouping rules the renderers should apply:
 *   1. If `isSpecialRole(role)`   → group as "Special Roles"
 *   2. Else if explicit `side` set → respect it
 *   3. Else if `inferSideFromRole(role)` returns a side → use that
 *   4. Else → "Others" / ungrouped
 */

/**
 * Role keyword substrings that land a member in the "Special Roles" group.
 * Check these FIRST — some of them (e.g. "junior bridesmaid") also
 * substring-match the bride keywords below, and we want "special" to win.
 */
export const SPECIAL_ROLE_KEYWORDS = [
  "flower girl",
  "ring bearer",
  "page boy",
  "junior bridesmaid",
  "junior groomsman",
  "usher",
] as const;

/**
 * Ordered from most-specific to least-specific. Order matters because
 * `includes()` is substring-based: e.g. "bridesmaid" contains "bride", so
 * we match the specific keyword first to keep reasoning simple.
 */
const BRIDE_KEYWORDS = [
  "bridesmaid",
  "maid of honor",
  "matron of honor",
  "bridesman",
  "maid", // catches "Maid of Honor" on its own
  "bride", // catches "Bride" and related (also matches "bridesmaid" but that's handled above)
] as const;

const GROOM_KEYWORDS = [
  "groomsman",
  "best man",
  "best woman",
  "groomsmaid",
  "groom", // catches "Groom" and related (also matches "groomsman" but that's handled above)
] as const;

export function isSpecialRole(role: string): boolean {
  const lower = role.toLowerCase();
  return SPECIAL_ROLE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Infer which side of the wedding a member belongs on from the role text
 * alone. Returns null when the role doesn't match either side's keywords.
 *
 * Callers should check `isSpecialRole` first — special keywords like
 * "junior bridesmaid" contain "bridesmaid" and would otherwise be
 * mis-inferred as bride's side.
 */
export function inferSideFromRole(role: string): "bride" | "groom" | null {
  const lower = role.toLowerCase().trim();
  if (!lower) return null;
  if (BRIDE_KEYWORDS.some((kw) => lower.includes(kw))) return "bride";
  if (GROOM_KEYWORDS.some((kw) => lower.includes(kw))) return "groom";
  return null;
}

/**
 * Combine explicit `side` and role inference into a final bucket.
 * Explicit `side` always wins; only when unset do we fall back to the role.
 * Returns "other" for members that can't be placed on either side.
 */
export function getEffectiveSide(
  member: { role: string; side?: "bride" | "groom" | "other" }
): "bride" | "groom" | "other" {
  if (member.side === "bride" || member.side === "groom") return member.side;
  if (member.side === "other") return "other";
  return inferSideFromRole(member.role) ?? "other";
}
