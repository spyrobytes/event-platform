"use client";

import type { MediaAsset } from "@prisma/client";
import type { PartySide } from "@/schemas/event-page";
import styles from "./WeddingPartyV2.module.css";

type PartyMember = {
  name: string;
  role: string;
  bio?: string;
  imageAssetId?: string;
  side?: PartySide;
};

type WeddingPartyV2Props = {
  data: {
    heading?: string;
    description?: string;
    members: PartyMember[];
  };
  assets: MediaAsset[];
};

/** Role keywords that place a member into the "Special Roles" group */
const SPECIAL_ROLE_KEYWORDS = [
  "flower girl",
  "ring bearer",
  "page boy",
  "junior bridesmaid",
  "junior groomsman",
];

function isSpecialRole(role: string): boolean {
  const lower = role.toLowerCase();
  return SPECIAL_ROLE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Wedding Party V2
 *
 * Card-based layout with:
 * - Bride's side / Groom's side grouping with serif italic dividers
 * - Auto-detected "Special Roles" section for flower girl, ring bearer, etc.
 * - Ornamental arch photo frames with mat-style double border + inset shadow
 * - Hover: card lift + image zoom (CSS-driven)
 * - 3-col → 2-col → 1-col responsive grid
 */
export function WeddingPartyV2({ data, assets }: WeddingPartyV2Props) {
  const { heading = "Wedding Party", description, members } = data;
  const kickerText = "Wedding Party";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  const getAssetUrl = (assetId?: string): string | null => {
    if (!assetId) return null;
    const asset = assets.find((a) => a.id === assetId);
    return asset?.publicUrl || null;
  };

  // Partition members: special roles auto-detected by keyword, rest by side
  const specialMembers = members.filter((m) => isSpecialRole(m.role));
  const regularMembers = members.filter((m) => !isSpecialRole(m.role));
  const bridesSide = regularMembers.filter((m) => m.side === "bride");
  const groomsSide = regularMembers.filter((m) => m.side === "groom");
  const others = regularMembers.filter((m) => !m.side || m.side === "other");
  const hasSides = bridesSide.length > 0 || groomsSide.length > 0;

  // Label for the "other" group — "Special Roles" when no keyword-detected
  // specials exist (backward compat), "Others" when specials have their own section
  const othersLabel = specialMembers.length > 0 ? "Others" : "Special Roles";

  const renderDivider = (label: string) => (
    <div className={styles.divider}>
      <div className={styles.dividerLine} />
      <span className={styles.dividerLabel}>{label}</span>
      <div className={styles.dividerLine} />
    </div>
  );

  const renderCard = (member: PartyMember, index: number, isSpecial = false) => {
    const imageUrl = getAssetUrl(member.imageAssetId);
    const cardClass = isSpecial
      ? `${styles.card} ${styles.specialCard}`
      : styles.card;

    return (
      <article key={index} className={cardClass}>
        {/* Photo — arch-shaped frame with ornamental border */}
        <div className={styles.photoArea}>
          <div className={styles.photoFrame}>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={member.name}
                loading="lazy"
                className={styles.photo}
              />
            ) : (
              <div className={styles.placeholder}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--stone, #a69e93)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={styles.cardBody}>
          <h3 className={styles.memberName}>{member.name}</h3>
          <div className={styles.memberRole}>{member.role}</div>
          {member.bio && <p className={styles.memberBio}>{member.bio}</p>}
        </div>
      </article>
    );
  };

  return (
    <section className={styles.section} aria-label="Wedding party" id="party">
      <div className={styles.container}>
        {/* Section header */}
        <div className={styles.header}>
          {showKicker && (
            <p className={`${styles.kicker} v2-kicker`}>{kickerText}</p>
          )}
          <h2 className={styles.heading}>{heading}</h2>
          {description && (
            <p className={styles.description}>{description}</p>
          )}
        </div>

        {/* Bride's side */}
        {bridesSide.length > 0 && (
          <>
            {renderDivider("Bride\u2019s side")}
            <div className={`${styles.grid} ${styles.gridSpaced}`}>
              {bridesSide.map((m, i) => renderCard(m, i))}
            </div>
          </>
        )}

        {/* Groom's side */}
        {groomsSide.length > 0 && (
          <>
            {renderDivider("Groom\u2019s side")}
            <div className={styles.grid}>
              {groomsSide.map((m, i) => renderCard(m, i))}
            </div>
          </>
        )}

        {/* Ungrouped members (no sides assigned at all) */}
        {!hasSides && others.length > 0 && (
          <div className={styles.grid}>
            {others.map((m, i) => renderCard(m, i))}
          </div>
        )}

        {/* Others with divider (when sides exist) */}
        {hasSides && others.length > 0 && (
          <div className={styles.groupSpaced}>
            {renderDivider(othersLabel)}
            <div className={styles.grid}>
              {others.map((m, i) => renderCard(m, i))}
            </div>
          </div>
        )}

        {/* Special roles — auto-detected, centered smaller cards */}
        {specialMembers.length > 0 && (
          <div className={styles.groupSpaced}>
            {renderDivider("Special Roles")}
            <div className={styles.specialGrid}>
              {specialMembers.map((m, i) => renderCard(m, i, true))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className={styles.empty}>
            Wedding party details coming soon
          </div>
        )}
      </div>
    </section>
  );
}
