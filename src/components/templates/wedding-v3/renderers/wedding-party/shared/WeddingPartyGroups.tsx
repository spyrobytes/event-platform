import type { ReactNode } from "react";
import {
  partitionPartyMembers,
  PARTY_GROUP_LABELS,
  type PartyMember,
} from "./party-groups";

type WeddingPartyGroupsProps = {
  members: PartyMember[];
  /**
   * The renderer's CSS-module class map. Expected keys: `grid`, `gridSpaced`,
   * `groupSpaced`, `specialGrid`, `divider`, `dividerLine`, `dividerLabel`,
   * `empty` — the established naming convention shared by the party renderers.
   */
  styles: Record<string, string>;
  emptyLabel: string;
  /**
   * Renders one card. `globalIndex` is the member's position across all groups
   * (drives staggered reveal / tilt); `isSpecial` flags the special-roles grid.
   */
  renderCard: (member: PartyMember, globalIndex: number, isSpecial: boolean) => ReactNode;
};

/**
 * Grouped wedding-party layout — bride's side / groom's side / others / special
 * roles, with dividers and a running global index. Each renderer supplies its
 * own card via `renderCard` and its grid/divider classes via `styles`, so the
 * grouping/offset/dividers/empty-state live here once instead of per renderer.
 */
export function WeddingPartyGroups({
  members,
  styles,
  emptyLabel,
  renderCard,
}: WeddingPartyGroupsProps) {
  if (members.length === 0) {
    return <div className={styles.empty}>{emptyLabel}</div>;
  }

  const { specialMembers, bridesSide, groomsSide, others, hasSides } =
    partitionPartyMembers(members);

  // Continuous global index across groups (drives the reveal stagger / tilt).
  // Precomputed in render order (bride → groom → others → special) so there's no
  // render-time mutation and the offsets don't depend on JSX evaluation order.
  const groomsOffset = bridesSide.length;
  const othersOffset = groomsOffset + groomsSide.length;
  const specialOffset = othersOffset + others.length;
  const renderGroup = (list: PartyMember[], startOffset: number, isSpecial = false) =>
    list.map((member, i) => renderCard(member, startOffset + i, isSpecial));

  const divider = (label: string) => (
    <div className={styles.divider}>
      <span className={styles.dividerLine} />
      <span className={styles.dividerLabel}>{label}</span>
      <span className={styles.dividerLine} />
    </div>
  );

  return (
    <>
      {bridesSide.length > 0 && (
        <>
          {divider(PARTY_GROUP_LABELS.brides)}
          <div className={`${styles.grid} ${styles.gridSpaced}`}>
            {renderGroup(bridesSide, 0)}
          </div>
        </>
      )}

      {groomsSide.length > 0 && (
        <>
          {divider(PARTY_GROUP_LABELS.grooms)}
          <div className={styles.grid}>{renderGroup(groomsSide, groomsOffset)}</div>
        </>
      )}

      {/* Ungrouped members (no explicit sides) */}
      {!hasSides && others.length > 0 && (
        <div className={styles.grid}>{renderGroup(others, othersOffset)}</div>
      )}

      {/* Others (when sides exist) */}
      {hasSides && others.length > 0 && (
        <div className={styles.groupSpaced}>
          {divider(PARTY_GROUP_LABELS.others)}
          <div className={styles.grid}>{renderGroup(others, othersOffset)}</div>
        </div>
      )}

      {specialMembers.length > 0 && (
        <div className={styles.groupSpaced}>
          {divider(PARTY_GROUP_LABELS.special)}
          <div className={styles.specialGrid}>
            {renderGroup(specialMembers, specialOffset, true)}
          </div>
        </div>
      )}
    </>
  );
}
