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
  /** CSS class for the invite text line (e.g., "invite you to the wedding...") */
  familyInviteClassName?: string;
};

const DEFAULT_FAMILY_INVITE_TEXT = "invite you to the wedding of their children";

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
          {family1} <span>&amp;</span> {family2}
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
