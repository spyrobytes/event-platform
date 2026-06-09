import type { CouplePhotoFrameId } from "@/schemas/event-page";

export type { CouplePhotoFrameId };

/**
 * A curated, organizer-selectable couple-photo frame shape. A template that
 * declares `couplePhotoFrameOptions` lets the organizer pick among these (the
 * first is the default); the persisted choice lives on
 * `config.hero.couplePhotoFrame`. This is a deliberately CURATED list per
 * template (not a free shape picker) — same philosophy as
 * `weddingPartyStyleOptions`.
 */
export type CouplePhotoFrameOption = {
  /** Persisted value on `hero.couplePhotoFrame`. */
  value: CouplePhotoFrameId;
  /** Label shown in the editor toggle. */
  label: string;
  /** Organizer tip shown in the editor for this frame — surfaces cropping
   *  constraints (e.g. "upload a full-length portrait"). */
  tip: string;
};

/**
 * Canonical frame options. Templates compose their curated list (and pick a
 * default by ordering) from these so labels/tips stay consistent across the
 * editor; the visual treatment (rings, shadows, gold hairlines) stays
 * template-owned in each hero's CSS.
 */
export const HEART_FRAME_OPTION: CouplePhotoFrameOption = {
  value: "heart",
  label: "Heart",
  tip: "Upload a head-and-shoulders portrait — the heart silhouette crops wide or full-body shots awkwardly.",
};

export const CIRCLE_FRAME_OPTION: CouplePhotoFrameOption = {
  value: "circle",
  label: "Circle",
  tip: "Upload a head-and-shoulders portrait with the couple centered — edges are cropped to a circle.",
};

export const FULL_LENGTH_FRAME_OPTION: CouplePhotoFrameOption = {
  value: "full",
  label: "Full Length",
  tip: "Upload a tall, full-length portrait (roughly 2:3). Landscape photos will be cropped to the frame.",
};

/**
 * Resolve which frame shape the couple photo should use.
 *
 * If the template declares curated `couplePhotoFrameOptions`, the organizer's
 * persisted `couplePhotoFrame` selects among them (an unset/unknown value
 * falls back to the first option, the default); otherwise `undefined` is
 * returned so the hero renderer falls through to its own built-in shape.
 *
 * Pure with type-only imports, so it stays unit-testable without pulling the
 * renderer component tree (mirrors `resolveWeddingPartyStyleId`).
 */
export function resolveCouplePhotoFrame(
  options: CouplePhotoFrameOption[] | undefined,
  couplePhotoFrame: string | undefined,
): CouplePhotoFrameId | undefined {
  if (options && options.length > 0) {
    return (options.find((o) => o.value === couplePhotoFrame) ?? options[0]).value;
  }
  return undefined;
}
