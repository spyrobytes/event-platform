import type { V2VariantConfig, V2VariantId } from "./types";

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
import { midnightGold } from "./midnight-gold";
import { citrusGrove } from "./citrus-grove";

export const V2_VARIANTS: Record<V2VariantId, V2VariantConfig> = {
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
  midnight_gold: midnightGold,
  citrus_grove: citrusGrove,
};

export const V2_VARIANT_IDS = Object.keys(V2_VARIANTS) as V2VariantId[];

export const DEFAULT_V2_VARIANT_ID: V2VariantId = "garden_romance";

export function getV2Variant(id: string): V2VariantConfig {
  return V2_VARIANTS[id as V2VariantId] || V2_VARIANTS[DEFAULT_V2_VARIANT_ID];
}

export function getAllV2Variants(): V2VariantConfig[] {
  return Object.values(V2_VARIANTS);
}

export type { V2VariantConfig, V2VariantId, V2VariantCategory, V2BotanicalVariant, V2CuratedSwatch } from "./types";
