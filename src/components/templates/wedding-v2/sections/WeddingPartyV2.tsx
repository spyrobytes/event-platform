"use client";

import type { MediaAsset } from "@prisma/client";
import { EventImage } from "@/components/media/EventImage";
import {
  getPartyAsset,
  type PartyMember,
  WeddingPartyGroups,
} from "@/components/templates/shared/wedding-party";
import { cn } from "@/lib/utils";
import styles from "./WeddingPartyV2.module.css";

type WeddingPartyV2Props = {
  data: {
    heading?: string;
    description?: string;
    members: PartyMember[];
  };
  assets: MediaAsset[];
  /**
   * Opt into the `--lux-*` section theme (the section flips into a themed panel).
   * V2 Cinematic passes `true`; Grand Luxe uses this renderer as its deliberately
   * PLAIN "Cinematic" party option, so it leaves this `false` (the default).
   */
  themed?: boolean;
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
 *
 * Grouping, the continuous global index, and the section-wide mobile reveal
 * budget come from the shared WeddingPartyGroups (the same layout the V3 party
 * renderers use); this file supplies the arch-frame card skin + header.
 */
export function WeddingPartyV2({ data, assets, themed = false }: WeddingPartyV2Props) {
  const { heading = "Wedding Party", description, members } = data;
  const kickerText = "Wedding Party";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  const renderCard = (member: PartyMember, index: number, isSpecial: boolean) => {
    const imageAsset = getPartyAsset(member.imageAssetId, assets);
    const imageUrl = imageAsset?.publicUrl ?? null;
    const imageBlur = imageAsset?.blurDataUrl ?? null;
    const cardClass = isSpecial
      ? `${styles.card} ${styles.specialCard}`
      : styles.card;

    return (
      <article className={cardClass}>
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
                  stroke="currentColor"
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
    <section className={cn(styles.section, themed && styles.themed)} aria-label="Wedding party" id="party">
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

        <WeddingPartyGroups
          members={members}
          classes={{
            grid: styles.grid,
            gridSpaced: styles.gridSpaced,
            groupSpaced: styles.groupSpaced,
            specialGrid: styles.specialGrid,
            divider: styles.divider,
            dividerLine: styles.dividerLine,
            dividerLabel: styles.dividerLabel,
            empty: styles.empty,
          }}
          emptyLabel="Wedding party details coming soon"
          renderCard={renderCard}
        />
      </div>
    </section>
  );
}
