import { Fragment } from "react";
import type { InvitationData } from "@/schemas/invitation";
import {
  CONTENT_LIMITS,
  NAME_CONNECTORS,
  truncateWithEllipsis,
} from "@/schemas/invitation";

type InvitationHeaderProps = {
  data: InvitationData;
  /** Use span-based elements instead of div/p (for 3D transform contexts) */
  inline?: boolean;
  /** Default text when headerText is not set in modern mode. Pass null to render nothing. */
  modernDefault?: string | null;
  /** CSS class for the modern header text (e.g., "Together with their families") */
  headerTextClassName?: string;
  /** CSS class for the traditional header wrapper */
  traditionalClassName?: string;
  /** CSS class for "The families of" label */
  familiesLabelClassName?: string;
  /** CSS class for the family names line */
  familyNamesClassName?: string;
  /**
   * CSS class for each unbreakable parent-name unit within one family group
   * (e.g. "Mr. Smith Oliver"). Opt-in: when set together with
   * familySeparatorClassName, the families render as wrap-protected units; when
   * omitted, the legacy inline markup is used (unchanged for other templates).
   */
  familyGroupClassName?: string;
  /** CSS class for the central separator between the two families (own line). */
  familySeparatorClassName?: string;
  /** CSS class for the invite text line (e.g., "invite you to the wedding...") */
  familyInviteClassName?: string;
};

const DEFAULT_FAMILY_INVITE_TEXT = "invite you to the wedding of their children";

/**
 * Splits a family field on *every* within-family connector at once, keeping the
 * connectors as their own array entries (capturing group) so they can render as
 * breakable text between unbreakable name units. Built from the shared
 * NAME_CONNECTORS so couple-name and family-name parsing can't drift; metachars
 * (the "+" in " + ") are escaped. The structural connector *between* the two
 * families is a separate element and never reaches here.
 */
const NAME_CONNECTOR_SPLIT_RE = new RegExp(
  `(${NAME_CONNECTORS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`
);

/**
 * Render one family field as unbreakable parent-name units joined by breakable
 * connectors. Each parent name stays whole (the unit className applies
 * `white-space: nowrap`); a line break may only fall at the connector between
 * two parents, so a long family wraps cleanly between its members instead of
 * mid-name.
 *
 * A field with a single name (no connector) is returned as plain text so it can
 * still wrap via the line's `overflow-wrap` instead of overflowing as one
 * unbreakable unit. Empty segments from doubled/leading/trailing connectors are
 * dropped, so a stray connector never renders without a name beside it. Mixed
 * connectors in one field (" & " and " and ") are all honored.
 */
function renderFamilyGroup(group: string, unitClassName?: string) {
  // String.split with one capturing group yields [name, connector, name, ...]:
  // even indices are names, odd indices are the connectors between them.
  const segments = group.split(NAME_CONNECTOR_SPLIT_RE);
  const names: string[] = [];
  const separators: string[] = []; // separators[k] precedes names[k + 1]
  segments.forEach((seg, i) => {
    if (i % 2 === 0) {
      const name = seg.trim();
      if (name) names.push(name);
    } else if (names.length > 0) {
      // Bind this connector to the gap after the last real name; an empty name
      // segment never pushed, so a trailing/doubled connector is simply ignored.
      separators[names.length - 1] = seg;
    }
  });

  if (names.length <= 1) return names[0] ?? group;

  return names.map((name, i) => (
    <Fragment key={i}>
      {i > 0 ? (separators[i - 1] ?? " & ") : null}
      <span className={unitClassName}>{name}</span>
    </Fragment>
  ));
}

/**
 * Shared header renderer for invitation templates.
 *
 * - Modern mode: renders a single `headerText` line (existing behavior).
 * - Traditional mode: renders a structured block with family names above the
 *   couple names, in the format:
 *
 *     The families of
 *     [Person 1 Family] & [Person 2 Family]
 *     invite you to the wedding of their children
 *
 * Pass `inline` for templates that use span-based layouts (e.g., GoldenCardReveal).
 * Pass `modernDefault` to control what shows when headerText is not set (null = nothing).
 */
export function InvitationHeader({
  data,
  inline = false,
  modernDefault = "Together with their families",
  headerTextClassName,
  traditionalClassName,
  familiesLabelClassName,
  familyNamesClassName,
  familyGroupClassName,
  familySeparatorClassName,
  familyInviteClassName,
}: InvitationHeaderProps) {
  const isTraditional =
    data.headerMode === "traditional" &&
    data.person1FamilyName &&
    data.person2FamilyName;

  const Wrapper = inline ? "span" : "div";
  const Line = inline ? "span" : "p";

  if (isTraditional) {
    const family1 = truncateWithEllipsis(
      data.person1FamilyName!,
      CONTENT_LIMITS.familyName.max
    );
    const family2 = truncateWithEllipsis(
      data.person2FamilyName!,
      CONTENT_LIMITS.familyName.max
    );
    const inviteText = truncateWithEllipsis(
      data.familyInviteText || DEFAULT_FAMILY_INVITE_TEXT,
      CONTENT_LIMITS.familyInviteText.max
    );

    return (
      <Wrapper className={traditionalClassName}>
        <Line className={familiesLabelClassName}>The families of</Line>
        <Line className={familyNamesClassName}>
          {familySeparatorClassName ? (
            <>
              {renderFamilyGroup(family1, familyGroupClassName)}
              <span className={familySeparatorClassName}>&amp;</span>
              {renderFamilyGroup(family2, familyGroupClassName)}
            </>
          ) : (
            <>
              {family1} <span>&amp;</span> {family2}
            </>
          )}
        </Line>
        <Line className={familyInviteClassName}>{inviteText}</Line>
      </Wrapper>
    );
  }

  // Modern mode (default)
  const headerText = data.headerText || modernDefault;
  if (!headerText) return null;

  return (
    <Line className={headerTextClassName}>
      {truncateWithEllipsis(headerText, CONTENT_LIMITS.headerText.max)}
    </Line>
  );
}
