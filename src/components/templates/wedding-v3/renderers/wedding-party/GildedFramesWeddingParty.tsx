"use client";

/**
 * Gilded Frames Wedding Party — The Grand Luxe
 *
 * A private-gallery wall: matted, gold-framed portrait cards in a composed grid
 * with a whisper of off-true tilt. Click/tap flips a card (3D) to a placard back
 * with a gold serif name, a gold rule, and the bio; cards straighten when
 * flipped so text reads upright. Members with no bio render as static framed
 * portraits (no flip affordance).
 *
 * Reads the `--lux-*` section-theme tokens (with base-token fallbacks), so the
 * whole band flips with the active section theme — ivory/gold on the Light
 * default, dramatic dark on Amethyst/Emerald Noir/Midnight Gold, and
 * dark-on-light on the Cerulean light panel (via the polarity engine).
 *
 * Grouping, the flip interaction, the icons, and the asset lookup come from the
 * shared wedding-party modules; this file is the gilded card skin + header.
 */

import type { SectionRendererProps } from "../../types";
import type { WeddingPartySection } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { EventImage } from "@/components/media/EventImage";
import {
  getPartyAsset,
  type PartyMember,
  useFlipCard,
  FlipIcon,
  ReturnIcon,
  WeddingPartyGroups,
} from "@/components/templates/shared/wedding-party";
import styles from "./GildedFramesWeddingParty.module.css";

// Composed near-aligned tilt — a hair off-true, like frames hung on a wall.
const TILTS = [
  "-0.6deg", "0.5deg", "-0.4deg", "0.7deg", "-0.5deg", "0.4deg", "-0.7deg", "0.5deg",
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

  // Only bio-bearing cards are interactive; static portraits are not buttons.
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
        {/* Front — framed portrait + placard */}
        <div className={`${styles.face} ${styles.front}`}>
          <div className={styles.photoFrame}>
            {asset?.publicUrl ? (
              <EventImage
                src={asset.publicUrl}
                alt={member.name}
                fill
                sizes="(max-width: 1024px) 50vw, 320px"
                blurDataURL={asset.blurDataUrl}
                renditionWidths={asset.renditionWidths}
                className={styles.photo}
              />
            ) : (
              <div className={styles.monogram}>
                <span className={styles.monogramLetter}>{initial}</span>
              </div>
            )}
          </div>
          <p className={styles.frontName}>{member.name}</p>
          {member.role && <p className={styles.frontRole}>{member.role}</p>}
          {canFlip && <FlipIcon className={styles.flipHint} />}
        </div>

        {/* Back — placard with the bio */}
        {canFlip && (
          <div className={`${styles.face} ${styles.back}`}>
            {/* A <p>, not an <h3>: the global `.wedding-template-v2 h3 { color:
                var(--charcoal) }` rule outranks the module class and is
                invisible on a dark themed panel. As a <p>, .backName's
                polarity-aware --gf-ink applies. */}
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

export function GildedFramesWeddingParty({
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
              stays polarity-aware via --gf-ink (→ --lux-ink). */}
          <h2 className={styles.heading} style={{ color: "var(--gf-ink)" }}>
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
          emptyLabel="Wedding party portraits coming soon"
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
