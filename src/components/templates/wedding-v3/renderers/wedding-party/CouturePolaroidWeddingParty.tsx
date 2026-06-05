"use client";

/**
 * Couture Polaroid Wedding Party — The Grand Luxe
 *
 * An heirloom album page: heavy matte photo cards mounted with gold photo-corner
 * tape, set at a gentle collage tilt, each finished with an engraved gold
 * nameplate. Click/tap flips a card (3D) to a matte back with the name, a gold
 * hairline, the role, and the bio; cards straighten when flipped so text reads
 * upright. Members with no bio render as static mounted photos (no flip).
 *
 * The couture counterpart to Gilded Frames: where Gilded is a formal framed
 * gallery wall, Couture is a tactile, slightly-imperfect keepsake album — more
 * tilt, mounting corners instead of a frame, a nameplate instead of an
 * embossed line.
 *
 * Reads the `--lux-*` section-theme tokens (with base-token fallbacks), so the
 * whole band flips with the active section theme — ivory/gold on the Light
 * default, dramatic dark on Amethyst/Emerald Noir/Midnight Gold, and
 * dark-on-light on the Cerulean light panel (via the polarity engine).
 *
 * Grouping, the flip interaction, the icons, and the asset lookup come from the
 * shared wedding-party modules; this file is the polaroid card skin + header.
 */

import type { SectionRendererProps } from "../../types";
import type { WeddingPartySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { EventImage } from "@/components/media/EventImage";
import { getPartyAsset, type PartyMember } from "@/components/templates/shared/wedding-party/party-groups";
import { useFlipCard } from "@/components/templates/shared/wedding-party/useFlipCard";
import { FlipIcon, ReturnIcon } from "@/components/templates/shared/wedding-party/FlipIcons";
import { WeddingPartyGroups } from "@/components/templates/shared/wedding-party/WeddingPartyGroups";
import styles from "./CouturePolaroidWeddingParty.module.css";

// Collage tilt — a relaxed, album-page imperfection (wider than Gilded's ±0.5°).
const TILTS = [
  "-2deg", "1.6deg", "-1.4deg", "2deg", "-1.7deg", "1.3deg", "-2deg", "1.8deg",
];

function FlipCard({
  member,
  assets,
  tilt,
  index,
  isSpecial,
}: {
  member: PartyMember;
  assets: MediaAsset[];
  tilt: string;
  index: number;
  isSpecial?: boolean;
}) {
  const asset = getPartyAsset(member.imageAssetId, assets);
  const initial = member.name.charAt(0).toUpperCase();
  const canFlip = Boolean(member.bio && member.bio.trim());
  const { flipped, toggle, handleKeyDown } = useFlipCard(canFlip);

  const outerClass = [
    styles.cardOuter,
    flipped ? styles.flipped : "",
    isSpecial ? styles.specialCardOuter : "",
    canFlip ? "" : styles.static,
  ]
    .filter(Boolean)
    .join(" ");

  // Only bio-bearing cards are interactive; static photos are not buttons.
  const interactive = canFlip
    ? {
        onClick: toggle,
        onKeyDown: handleKeyDown,
        role: "button" as const,
        tabIndex: 0,
        "aria-pressed": flipped,
        "aria-label": `${member.name}, ${member.role}. ${
          flipped ? "Showing details — activate to return to portrait" : "Activate to read more"
        }`,
      }
    : { "aria-label": `${member.name}, ${member.role}` };

  return (
    <div
      className={outerClass}
      style={{ transform: `rotate(${tilt})`, animationDelay: `${Math.min(index, 8) * 70}ms` }}
      {...interactive}
    >
      <div className={styles.cardInner}>
        {/* Front — mounted photo + nameplate */}
        <div className={`${styles.face} ${styles.front}`}>
          <div className={styles.photoFrame}>
            {asset?.publicUrl ? (
              <EventImage
                src={asset.publicUrl}
                alt={member.name}
                fill
                sizes="(max-width: 800px) 50vw, 320px"
                blurDataURL={asset.blurDataUrl}
                className={styles.photo}
              />
            ) : (
              <div className={styles.monogram}>
                <span className={styles.monogramLetter}>{initial}</span>
              </div>
            )}
            {/* Gold photo-corner tape (4 mounting corners), purely decorative. */}
            <span className={styles.corners} aria-hidden="true" />
          </div>
          <div className={styles.nameplate}>
            <p className={styles.frontName}>{member.name}</p>
            {member.role && <p className={styles.frontRole}>{member.role}</p>}
          </div>
          {canFlip && <FlipIcon className={styles.flipHint} />}
        </div>

        {/* Back — matte placard with the bio */}
        {canFlip && (
          <div className={`${styles.face} ${styles.back}`}>
            {/* A <p>, not an <h3>: the global `.wedding-template-v2 h3 { color:
                var(--charcoal) }` rule outranks the module class and is
                invisible on a dark themed panel. As a <p>, .backName's
                polarity-aware --cp-ink applies. */}
            <p className={styles.backName}>{member.name}</p>
            <span className={styles.backRule} aria-hidden="true" />
            {member.role && <div className={styles.backRole}>{member.role}</div>}
            <p className={styles.backBio}>{member.bio}</p>
            <ReturnIcon className={styles.returnHint} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CouturePolaroidWeddingParty({
  data,
  assets,
}: SectionRendererProps<WeddingPartySection["data"]>) {
  const { heading = "Wedding Party", description, members } = data;
  const kickerText = "Wedding Party";
  const showKicker = kickerText.toLowerCase() !== heading.toLowerCase();

  return (
    <section className={styles.section} aria-label="Wedding party" id="party">
      <div className={styles.container}>
        <div className={styles.header}>
          {showKicker && <p className={styles.kicker}>{kickerText}</p>}
          {/* Color inline: the global `.wedding-template-v2 h2 { color: var(--night) }`
              rule (specificity 0,1,1) outranks a CSS-module class, and --night
              is invisible on a dark themed --lux-panel band. Inline wins and
              stays polarity-aware via --cp-ink (→ --lux-ink). */}
          <h2 className={styles.heading} style={{ color: "var(--cp-ink)" }}>
            {heading}
          </h2>
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
          emptyLabel="Wedding party photos coming soon"
          renderCard={(member, index, isSpecial) => (
            <FlipCard
              member={member}
              assets={assets}
              tilt={TILTS[index % TILTS.length]}
              index={index}
              isSpecial={isSpecial}
            />
          )}
        />
      </div>
    </section>
  );
}
