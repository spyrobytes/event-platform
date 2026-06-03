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
 * Preserves the bride/groom/special-roles grouping shared by the V3 party
 * renderers.
 */

import { useState, useCallback } from "react";
import type { SectionRendererProps } from "../../types";
import type { WeddingPartySection, PartySide } from "@/schemas/event-page";
import type { MediaAsset } from "@prisma/client";
import { isSpecialRole, getEffectiveSide } from "@/lib/wedding-party-roles";
import { EventImage } from "@/components/media/EventImage";
import styles from "./GildedFramesWeddingParty.module.css";

// Composed near-aligned tilt — a hair off-true, like frames hung on a wall.
const TILTS = [
  "-0.6deg", "0.5deg", "-0.4deg", "0.7deg", "-0.5deg", "0.4deg", "-0.7deg", "0.5deg",
];

type PartyMember = {
  name: string;
  role: string;
  bio?: string;
  imageAssetId?: string;
  side?: PartySide;
};

function getAsset(assetId: string | undefined, assets: MediaAsset[]): MediaAsset | null {
  if (!assetId) return null;
  return assets.find((a) => a.id === assetId) ?? null;
}

function FlipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function ReturnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

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
  const [flipped, setFlipped] = useState(false);
  const asset = getAsset(member.imageAssetId, assets);
  const initial = member.name.charAt(0).toUpperCase();
  const canFlip = Boolean(member.bio && member.bio.trim());

  const toggle = useCallback(() => {
    if (canFlip) setFlipped((f) => !f);
  }, [canFlip]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!canFlip) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    },
    [canFlip, toggle],
  );

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
                sizes="(max-width: 800px) 50vw, 320px"
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

  // Partition: special roles first, then bride/groom by explicit `side` with
  // role-keyword inference as the fallback.
  const specialMembers = members.filter((m) => isSpecialRole(m.role));
  const regularMembers = members.filter((m) => !isSpecialRole(m.role));
  const bridesSide = regularMembers.filter((m) => getEffectiveSide(m) === "bride");
  const groomsSide = regularMembers.filter((m) => getEffectiveSide(m) === "groom");
  const others = regularMembers.filter((m) => getEffectiveSide(m) === "other");
  const hasSides = bridesSide.length > 0 || groomsSide.length > 0;

  const renderDivider = (label: string) => (
    <div className={styles.divider}>
      <span className={styles.dividerLine} />
      <span className={styles.dividerLabel}>{label}</span>
      <span className={styles.dividerLine} />
    </div>
  );

  const renderCards = (list: PartyMember[], offset: number, isSpecial = false) =>
    list.map((member, i) => (
      <FlipCard
        key={`${member.name}-${offset + i}`}
        member={member}
        assets={assets}
        tilt={TILTS[(offset + i) % TILTS.length]}
        index={offset + i}
        isSpecial={isSpecial}
      />
    ));

  let runningOffset = 0;

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

        {/* Bride's side */}
        {bridesSide.length > 0 && (
          <>
            {renderDivider("Bride’s side")}
            <div className={`${styles.grid} ${styles.gridSpaced}`}>
              {renderCards(bridesSide, runningOffset)}
              {void (runningOffset += bridesSide.length)}
            </div>
          </>
        )}

        {/* Groom's side */}
        {groomsSide.length > 0 && (
          <>
            {renderDivider("Groom’s side")}
            <div className={styles.grid}>
              {renderCards(groomsSide, runningOffset)}
              {void (runningOffset += groomsSide.length)}
            </div>
          </>
        )}

        {/* Ungrouped members (no explicit sides) */}
        {!hasSides && others.length > 0 && (
          <div className={styles.grid}>
            {renderCards(others, runningOffset)}
            {void (runningOffset += others.length)}
          </div>
        )}

        {/* Others (when sides exist) */}
        {hasSides && others.length > 0 && (
          <div className={styles.groupSpaced}>
            {renderDivider("Others")}
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
          <div className={styles.empty}>Wedding party portraits coming soon</div>
        )}
      </div>
    </section>
  );
}
