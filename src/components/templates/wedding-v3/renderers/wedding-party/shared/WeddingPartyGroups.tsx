import { Fragment, type ReactNode } from "react";
import {
  partitionPartyMembers,
  PARTY_GROUP_LABELS,
  type PartyMember,
} from "./party-groups";

/**
 * The grid/divider/empty classes the layout needs from a renderer's CSS module.
 * Typed (rather than `Record<string, string>`) so a renderer that forgets or
 * misnames a class is a compile error instead of a silent `className="undefined"`.
 */
export type WeddingPartyLayoutClasses = {
  grid: string;
  gridSpaced: string;
  groupSpaced: string;
  specialGrid: string;
  divider: string;
  dividerLine: string;
  dividerLabel: string;
  empty: string;
};

type WeddingPartyGroupsProps = {
  members: PartyMember[];
  /** The renderer's CSS-module classes for the grouped layout. */
  classes: WeddingPartyLayoutClasses;
  emptyLabel: string;
  /**
   * Renders one card. `globalIndex` is the member's position across all groups
   * (drives staggered reveal / tilt); `isSpecial` flags the special-roles grid.
   * The returned element need NOT carry a React `key` — this layout wraps each
   * card in a keyed Fragment, so consumers can't desync the list keys.
   */
  renderCard: (member: PartyMember, globalIndex: number, isSpecial: boolean) => ReactNode;
};

/**
 * Grouped wedding-party layout — bride's side / groom's side / others / special
 * roles, with dividers and a running global index. Each renderer supplies its
 * own card via `renderCard` and its grid/divider classes via `classes`, so the
 * grouping/offset/dividers/empty-state live here once instead of per renderer.
 */
export function WeddingPartyGroups({
  members,
  classes,
  emptyLabel,
  renderCard,
}: WeddingPartyGroupsProps) {
  if (members.length === 0) {
    return <div className={classes.empty}>{emptyLabel}</div>;
  }

  const { specialMembers, bridesSide, groomsSide, others, hasSides } =
    partitionPartyMembers(members);

  // Continuous global index across groups (drives the reveal stagger / tilt).
  // Precomputed in render order (bride → groom → others → special) so there's no
  // render-time mutation and the offsets don't depend on JSX evaluation order.
  const groomsOffset = bridesSide.length;
  const othersOffset = groomsOffset + groomsSide.length;
  const specialOffset = othersOffset + others.length;
  // Keys are owned here (name + global index) so every consumer's list is keyed
  // identically regardless of what renderCard returns.
  const renderGroup = (list: PartyMember[], startOffset: number, isSpecial = false) =>
    list.map((member, i) => {
      const globalIndex = startOffset + i;
      return (
        <Fragment key={`${member.name}-${globalIndex}`}>
          {renderCard(member, globalIndex, isSpecial)}
        </Fragment>
      );
    });

  const divider = (label: string) => (
    <div className={classes.divider}>
      <span className={classes.dividerLine} />
      <span className={classes.dividerLabel}>{label}</span>
      <span className={classes.dividerLine} />
    </div>
  );

  return (
    <>
      {bridesSide.length > 0 && (
        <>
          {divider(PARTY_GROUP_LABELS.brides)}
          <div className={`${classes.grid} ${classes.gridSpaced}`}>
            {renderGroup(bridesSide, 0)}
          </div>
        </>
      )}

      {groomsSide.length > 0 && (
        <>
          {divider(PARTY_GROUP_LABELS.grooms)}
          <div className={classes.grid}>{renderGroup(groomsSide, groomsOffset)}</div>
        </>
      )}

      {/* Ungrouped members (no explicit sides) */}
      {!hasSides && others.length > 0 && (
        <div className={classes.grid}>{renderGroup(others, othersOffset)}</div>
      )}

      {/* Others (when sides exist) */}
      {hasSides && others.length > 0 && (
        <div className={classes.groupSpaced}>
          {divider(PARTY_GROUP_LABELS.others)}
          <div className={classes.grid}>{renderGroup(others, othersOffset)}</div>
        </div>
      )}

      {specialMembers.length > 0 && (
        <div className={classes.groupSpaced}>
          {divider(PARTY_GROUP_LABELS.special)}
          <div className={classes.specialGrid}>
            {renderGroup(specialMembers, specialOffset, true)}
          </div>
        </div>
      )}
    </>
  );
}
