import { Fragment } from "react";
import type { InvitationData } from "@/schemas/invitation";
import { CONTENT_LIMITS, truncateWithEllipsis } from "@/schemas/invitation";

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
 * Connectors recognized *within* a single family field (e.g. the "&" in
 * "Mr. & Mrs."). Ordered so multi-char words match before symbols. The
 * connector *between* the two families is structural — rendered as its own
 * element from two separate schema fields — and is never parsed here, so a
 * within-family connector can never be mistaken for the central one.
 */
const FAMILY_CONNECTORS = [" & ", " and ", " + "];

/**
 * Render one family field as unbreakable parent-name units joined by breakable
 * connectors. Each parent name stays whole (the unit className applies
 * `white-space: nowrap`); a line break may only fall at the connector between
 * two parents, so a long family wraps cleanly between its members instead of
 * mid-name. A field with no connector renders as a single unit.
 */
function renderFamilyGroup(group: string, unitClassName?: string) {
  for (const sep of FAMILY_CONNECTORS) {
    if (group.includes(sep)) {
      return group.split(sep).map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? sep : null}
          <span className={unitClassName}>{part.trim()}</span>
        </Fragment>
      ));
    }
  }
  return <span className={unitClassName}>{group}</span>;
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
