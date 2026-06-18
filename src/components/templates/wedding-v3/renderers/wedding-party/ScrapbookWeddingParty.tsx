"use client";

/**
 * Scrapbook Wedding Party — The Celebration House
 *
 * Matches the ScrapbookCollage gallery aesthetic: polaroid-style photo
 * cards at slight rotations. Click/tap flips a card to reveal the
 * member's role and bio on the back. Cards straighten when flipped
 * so text is always readable.
 *
 * Grouping, the global index, and the mobile reveal budget come from the shared
 * WeddingPartyGroups (same as Gilded Frames / Couture Polaroid); this file is
 * the scrapbook card skin + header.
 */

import { useState, useCallback } from "react";
import type { SectionRendererProps } from "../../types";
import type { WeddingPartySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { EventImage } from "@/components/media/EventImage";
import {
  getPartyAsset,
  type PartyMember,
  WeddingPartyGroups,
  FlipIcon,
  ReturnIcon,
} from "@/components/templates/shared/wedding-party";
import { cn } from "@/lib/utils";
import styles from "./ScrapbookWeddingParty.module.css";

// Same rotation set as ScrapbookCollage gallery for visual cohesion
const ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-1.5deg", "1deg", "-2.5deg", "0.5deg"];

// ---------------------------------------------------------------------------
// FlipCard
// ---------------------------------------------------------------------------

function FlipCard({
  member,
  assets,
  rotation,
  isSpecial,
}: {
  member: PartyMember;
  assets: MediaAsset[];
  rotation: string;
  isSpecial?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const asset = getPartyAsset(member.imageAssetId, assets);
  const initial = member.name.charAt(0).toUpperCase();

  const toggle = useCallback(() => setFlipped((f) => !f), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
    [toggle]
  );

  const outerClass = [
    styles.cardOuter,
    flipped ? styles.flipped : "",
    isSpecial ? styles.specialCardOuter : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={outerClass}
      style={{ transform: `rotate(${rotation})` }}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${member.name}, ${member.role}. ${flipped ? "Showing details, click to see photo" : "Click to see details"}`}
    >
      <div className={styles.cardInner}>
        {/* Front — scrapbook photo */}
        <div className={`${styles.face} ${styles.front}`}>
          <div className={styles.photoFrame}>
            {asset?.publicUrl ? (
              <EventImage
                src={asset.publicUrl}
                alt={member.name}
                fill
                sizes="(max-width: 1024px) 50vw, 320px"
                blurDataURL={asset.blurDataUrl}
                className={styles.photo}
              />
            ) : (
              <div className={styles.monogram}>
                <span className={styles.monogramLetter}>{initial}</span>
              </div>
            )}
          </div>
          <p className={styles.frontName}>{member.name}</p>
          <FlipIcon className={styles.flipHint} />
        </div>

        {/* Back — editorial text */}
        <div className={`${styles.face} ${styles.back}`}>
          <div className={styles.backAccent} />
          <h3 className={styles.backName}>{member.name}</h3>
          <div className={styles.backRole}>{member.role}</div>
          {member.bio && <p className={styles.backBio}>{member.bio}</p>}
          <ReturnIcon className={styles.returnHint} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScrapbookWeddingParty
// ---------------------------------------------------------------------------

export function ScrapbookWeddingParty({
  data,
  assets,
  themed = false,
}: SectionRendererProps<WeddingPartySection["data"]> & { themed?: boolean }) {
  const { heading = "Wedding Party", description, members } = data;
  const kickerText = "Wedding Party";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  // Grouping, the continuous global index, the section-wide mobile reveal
  // budget, dividers, and the empty state all live in the shared
  // WeddingPartyGroups (the same component Gilded Frames / Couture Polaroid
  // use). This file only supplies the scrapbook card skin + header.
  return (
    <section className={cn(styles.section, themed && styles.themed)} aria-label="Wedding party" id="party">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          {showKicker && <p className={styles.kicker}>{kickerText}</p>}
          <h2 className={styles.heading}>{heading}</h2>
          {description && <p className={styles.description}>{description}</p>}
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
          renderCard={(member, index, isSpecial) => (
            <FlipCard
              member={member}
              assets={assets}
              rotation={ROTATIONS[index % ROTATIONS.length]}
              isSpecial={isSpecial}
            />
          )}
        />
      </div>
    </section>
  );
}
