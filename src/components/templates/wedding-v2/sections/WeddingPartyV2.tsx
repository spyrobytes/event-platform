"use client";

import type { MediaAsset } from "@prisma/client";
import type { PartySide } from "@/schemas/event-page";
import { isSpecialRole, getEffectiveSide } from "@/lib/wedding-party-roles";
import { EventImage } from "@/components/media/EventImage";
import { useProgressiveReveal, PARTY_REVEAL } from "@/hooks/use-progressive-reveal";
import { RevealMoreButton } from "@/components/media/RevealMoreButton";
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

  const getAsset = (assetId?: string) => {
    if (!assetId) return null;
    return assets.find((a) => a.id === assetId) ?? null;
  };

  // Partition members: special roles first, then bride/groom based on
  // explicit `side` with role-keyword inference as the fallback.
  const specialMembers = members.filter((m) => isSpecialRole(m.role));
  const regularMembers = members.filter((m) => !isSpecialRole(m.role));
  const bridesSide = regularMembers.filter((m) => getEffectiveSide(m) === "bride");
  const groomsSide = regularMembers.filter((m) => getEffectiveSide(m) === "groom");
  const others = regularMembers.filter((m) => getEffectiveSide(m) === "other");
  const hasSides = bridesSide.length > 0 || groomsSide.length > 0;

  // Mobile member budget — render a small batch, reveal the rest on demand.
  // Applied across all groups via a continuous global index, so the cap is
  // section-wide rather than per sub-grid.
  const { visibleCount, hasMore, remaining, revealMore } = useProgressiveReveal(
    members.length,
    PARTY_REVEAL,
  );
  const groomsOffset = bridesSide.length;
  const othersOffset = groomsOffset + groomsSide.length;
  const specialOffset = othersOffset + others.length;
  const groupVisible = (startOffset: number, list: PartyMember[]) =>
    list.length > 0 && startOffset < visibleCount;

  const renderDivider = (label: string) => (
    <div className={styles.divider}>
      <div className={styles.dividerLine} />
      <span className={styles.dividerLabel}>{label}</span>
      <div className={styles.dividerLine} />
    </div>
  );

  const renderCard = (member: PartyMember, index: number, isSpecial = false) => {
    const imageAsset = getAsset(member.imageAssetId);
    const imageUrl = imageAsset?.publicUrl ?? null;
    const imageBlur = imageAsset?.blurDataUrl ?? null;
    const cardClass = isSpecial
      ? `${styles.card} ${styles.specialCard}`
      : styles.card;

    return (
      <article key={index} className={cardClass}>
        {/* Photo — arch-shaped frame with ornamental border */}
        <div className={styles.photoArea}>
          <div className={styles.photoFrame}>
            {imageUrl ? (
              <EventImage
                src={imageUrl}
                alt={member.name}
                fill
                sizes="(max-width: 500px) 100vw, (max-width: 800px) 50vw, 33vw"
                loading="lazy"
                blurDataURL={imageBlur}
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

  // Render a group's cards using a continuous global index, dropping any that
  // fall beyond the current mobile budget.
  const renderGroup = (
    list: PartyMember[],
    startOffset: number,
    isSpecial = false,
  ) =>
    list.map((member, i) => {
      const globalIndex = startOffset + i;
      if (globalIndex >= visibleCount) return null;
      return renderCard(member, globalIndex, isSpecial);
    });

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
        {groupVisible(0, bridesSide) && (
          <>
            {renderDivider("Bride\u2019s side")}
            <div className={`${styles.grid} ${styles.gridSpaced}`}>
              {renderGroup(bridesSide, 0)}
            </div>
          </>
        )}

        {/* Groom's side */}
        {groupVisible(groomsOffset, groomsSide) && (
          <>
            {renderDivider("Groom\u2019s side")}
            <div className={styles.grid}>
              {renderGroup(groomsSide, groomsOffset)}
            </div>
          </>
        )}

        {/* Ungrouped members (no sides assigned at all) */}
        {!hasSides && groupVisible(othersOffset, others) && (
          <div className={styles.grid}>
            {renderGroup(others, othersOffset)}
          </div>
        )}

        {/* Others with divider (when sides exist) */}
        {hasSides && groupVisible(othersOffset, others) && (
          <div className={styles.groupSpaced}>
            {renderDivider("Others")}
            <div className={styles.grid}>
              {renderGroup(others, othersOffset)}
            </div>
          </div>
        )}

        {/* Special roles — auto-detected, centered smaller cards */}
        {groupVisible(specialOffset, specialMembers) && (
          <div className={styles.groupSpaced}>
            {renderDivider("Special Roles")}
            <div className={styles.specialGrid}>
              {renderGroup(specialMembers, specialOffset, true)}
            </div>
          </div>
        )}

        {hasMore && (
          <RevealMoreButton
            label="Meet the rest of the party"
            remaining={remaining}
            onClick={revealMore}
          />
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
