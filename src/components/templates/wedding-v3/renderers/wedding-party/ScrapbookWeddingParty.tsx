"use client";

/**
 * Scrapbook Wedding Party — The Celebration House
 *
 * Matches the ScrapbookCollage gallery aesthetic: polaroid-style photo
 * cards at slight rotations. Click/tap flips a card to reveal the
 * member's role and bio on the back. Cards straighten when flipped
 * so text is always readable.
 *
 * Preserves bride/groom/special-roles grouping from WeddingPartyV2.
 */

import { useState, useCallback } from "react";
import type { SectionRendererProps } from "../../types";
import type { WeddingPartySection } from "@/schemas/event-page";
import type { PartySide } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import styles from "./ScrapbookWeddingParty.module.css";

// Same rotation set as ScrapbookCollage gallery for visual cohesion
const ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-1.5deg", "1deg", "-2.5deg", "0.5deg"];

type PartyMember = {
  name: string;
  role: string;
  bio?: string;
  imageAssetId?: string;
  side?: PartySide;
};

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

function getAssetUrl(assetId: string | undefined, assets: MediaAsset[]): string | null {
  if (!assetId) return null;
  const asset = assets.find((a) => a.id === assetId);
  return asset?.publicUrl || null;
}

// ---------------------------------------------------------------------------
// Flip icon SVGs
// ---------------------------------------------------------------------------

function FlipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function ReturnIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

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
  const imageUrl = getAssetUrl(member.imageAssetId, assets);
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
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={member.name}
                loading="lazy"
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
}: SectionRendererProps<WeddingPartySection["data"]>) {
  const { heading = "Wedding Party", description, members } = data;
  const kickerText = "Wedding Party";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  // Partition members: special roles auto-detected, rest by side
  const specialMembers = members.filter((m) => isSpecialRole(m.role));
  const regularMembers = members.filter((m) => !isSpecialRole(m.role));
  const bridesSide = regularMembers.filter((m) => m.side === "bride");
  const groomsSide = regularMembers.filter((m) => m.side === "groom");
  const others = regularMembers.filter((m) => !m.side || m.side === "other");
  const hasSides = bridesSide.length > 0 || groomsSide.length > 0;
  const othersLabel = specialMembers.length > 0 ? "Others" : "Special Roles";

  const renderDivider = (label: string) => (
    <div className={styles.divider}>
      <div className={styles.dividerLine} />
      <span className={styles.dividerLabel}>{label}</span>
      <div className={styles.dividerLine} />
    </div>
  );

  const renderCards = (
    list: PartyMember[],
    offset: number,
    isSpecial = false
  ) =>
    list.map((member, i) => (
      <FlipCard
        key={`${member.name}-${offset + i}`}
        member={member}
        assets={assets}
        rotation={ROTATIONS[(offset + i) % ROTATIONS.length]}
        isSpecial={isSpecial}
      />
    ));

  let runningOffset = 0;

  return (
    <section className={styles.section} aria-label="Wedding party" id="party">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          {showKicker && <p className={styles.kicker}>{kickerText}</p>}
          <h2 className={styles.heading}>{heading}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>

        {/* Bride's side */}
        {bridesSide.length > 0 && (
          <>
            {renderDivider("Bride\u2019s side")}
            <div className={`${styles.grid} ${styles.gridSpaced}`}>
              {renderCards(bridesSide, runningOffset)}
              {void (runningOffset += bridesSide.length)}
            </div>
          </>
        )}

        {/* Groom's side */}
        {groomsSide.length > 0 && (
          <>
            {renderDivider("Groom\u2019s side")}
            <div className={`${styles.grid} ${groomsSide.length > 0 && others.length === 0 && specialMembers.length === 0 ? "" : styles.gridSpaced}`}>
              {renderCards(groomsSide, runningOffset)}
              {void (runningOffset += groomsSide.length)}
            </div>
          </>
        )}

        {/* Ungrouped members */}
        {!hasSides && others.length > 0 && (
          <div className={styles.grid}>
            {renderCards(others, runningOffset)}
            {void (runningOffset += others.length)}
          </div>
        )}

        {/* Others (when sides exist) */}
        {hasSides && others.length > 0 && (
          <div className={styles.groupSpaced}>
            {renderDivider(othersLabel)}
            <div className={styles.grid}>
              {renderCards(others, runningOffset)}
              {void (runningOffset += others.length)}
            </div>
          </div>
        )}

        {/* Special roles */}
        {specialMembers.length > 0 && (
          <div className={styles.groupSpaced}>
            {renderDivider("Special Roles")}
            <div className={styles.specialGrid}>
              {renderCards(specialMembers, runningOffset, true)}
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
