import type { V2VariantConfig, V2VariantId } from "./types";

// Active skins
import { midnightGold } from "./midnight-gold";
import { emeraldIvory } from "./emerald-ivory";
import { plumBlush } from "./plum-blush";
import { scrapbookEdition } from "./scrapbook-edition";
import { scrapbookMidnight } from "./scrapbook-midnight";
import { scrapbookEmerald } from "./scrapbook-emerald";
import { scrapbookPlum } from "./scrapbook-plum";

// Legacy variants — kept for backward compatibility with existing events
import { gardenRomance } from "./garden-romance";
import { blackTie } from "./black-tie";
import { oldWorld } from "./old-world";
import { modernEditorial } from "./modern-editorial";
import { mono } from "./mono";
import { softModern } from "./soft-modern";
import { blushAndBloom } from "./blush-and-bloom";
import { lavenderMist } from "./lavender-mist";
import { desertSun } from "./desert-sun";
import { forestFloor } from "./forest-floor";
import { citrusGrove } from "./citrus-grove";

/**
 * Full variant registry — includes legacy variants so existing events
 * continue to render correctly. The picker only shows CURATED_SKINS.
 */
export const V2_VARIANTS: Record<V2VariantId, V2VariantConfig> = {
  // Active skins
  midnight_gold: midnightGold,
  emerald_ivory: emeraldIvory,
  plum_blush: plumBlush,
  scrapbook_edition: scrapbookEdition,
  scrapbook_midnight: scrapbookMidnight,
  scrapbook_emerald: scrapbookEmerald,
  scrapbook_plum: scrapbookPlum,
  // Legacy (still renderable, hidden from picker)
  garden_romance: gardenRomance,
  black_tie: blackTie,
  old_world: oldWorld,
  modern_editorial: modernEditorial,
  mono,
  soft_modern: softModern,
  blush_and_bloom: blushAndBloom,
  lavender_mist: lavenderMist,
  desert_sun: desertSun,
  forest_floor: forestFloor,
  citrus_grove: citrusGrove,
};

/**
 * Curated skins shown in the variant picker, in display order within each
 * family. Picker partitions on the `family` field to render Original and
 * Scrapbook sections; the "no variant" Original card is rendered separately.
 */
export const CURATED_SKINS: V2VariantConfig[] = [
  // Original family — dark skins layered over the default light template
  midnightGold,
  emeraldIvory,
  plumBlush,
  // Scrapbook family — Cream is the family default, then dark skins
  scrapbookEdition,
  scrapbookMidnight,
  scrapbookEmerald,
  scrapbookPlum,
];

export const V2_VARIANT_IDS = Object.keys(V2_VARIANTS) as V2VariantId[];

export const DEFAULT_V2_VARIANT_ID: V2VariantId = "midnight_gold";

export function getV2Variant(id: string): V2VariantConfig {
  return V2_VARIANTS[id as V2VariantId] || V2_VARIANTS[DEFAULT_V2_VARIANT_ID];
}

export function getAllV2Variants(): V2VariantConfig[] {
  return Object.values(V2_VARIANTS);
}

export function getCuratedSkins(): V2VariantConfig[] {
  return CURATED_SKINS;
}

export type { V2VariantConfig, V2VariantId, V2VariantCategory, V2VariantFamily, V2BotanicalVariant, V2CuratedSwatch } from "./types";
