/**
 * Content-density classifier for invitation templates with fixed-size cards.
 *
 * Templates that render into a fixed-height container (e.g., SplitRevealCard
 * at 380x540 / 320x500 / 400x560) need to tighten typography when content is
 * crowded. This classifier returns coarse signals that templates and dashboard
 * surfaces can use to adapt or warn.
 *
 * Two tiers:
 *   - `isDense` — content is fuller than baseline; templates should engage
 *     their compact cascade (tighter type, smaller margins, smaller photo).
 *   - `isExtremeDense` — content is at or beyond the template's safe capacity;
 *     templates should engage extreme-mode tightening, and surfaces may want
 *     to suggest an alternative (e.g., a photo-forward variant).
 */

const LONG_COUPLE_NAMES_THRESHOLD = 30;
const LONG_FAMILY_NAME_THRESHOLD = 25;

export type InvitationDensityInput = {
  person1Name?: string | null;
  person2Name?: string | null;
  person1FamilyName?: string | null;
  person2FamilyName?: string | null;
  headerMode?: "modern" | "traditional" | null;
  hasCeremonyDate?: boolean;
  hasReceptionDate?: boolean;
};

export type InvitationDensity = {
  isDense: boolean;
  isExtremeDense: boolean;
  hasTraditionalHeader: boolean;
  hasLongCoupleNames: boolean;
  hasLongFamilyNames: boolean;
  hasCeremonyAndReception: boolean;
};

export function classifyInvitationDensity(
  input: InvitationDensityInput
): InvitationDensity {
  const p1 = input.person1Name ?? "";
  const p2 = input.person2Name ?? "";
  const f1 = input.person1FamilyName ?? "";
  const f2 = input.person2FamilyName ?? "";

  const hasCeremonyAndReception = !!(input.hasCeremonyDate && input.hasReceptionDate);
  const hasTraditionalHeader =
    input.headerMode === "traditional" && !!f1 && !!f2;
  const hasLongCoupleNames = p1.length + p2.length > LONG_COUPLE_NAMES_THRESHOLD;
  const hasLongFamilyNames =
    hasTraditionalHeader &&
    (f1.length > LONG_FAMILY_NAME_THRESHOLD ||
      f2.length > LONG_FAMILY_NAME_THRESHOLD);

  const isDense =
    hasCeremonyAndReception ||
    hasTraditionalHeader ||
    hasLongCoupleNames ||
    hasLongFamilyNames;

  const isExtremeDense =
    (hasTraditionalHeader && hasCeremonyAndReception) ||
    (hasLongFamilyNames && hasCeremonyAndReception);

  return {
    isDense,
    isExtremeDense,
    hasTraditionalHeader,
    hasLongCoupleNames,
    hasLongFamilyNames,
    hasCeremonyAndReception,
  };
}
