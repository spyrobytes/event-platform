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

export const CUTOUT_FRAME_OPTION: CouplePhotoFrameOption = {
  value: "cutout",
  label: "Cutout",
  tip: "Requires a photo with a transparent background (PNG or WebP). Full-length cutouts look best — the couple stands directly in the scene, no frame.",
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

/**
 * Whether the floating (layered) couple photo is active for this hero
 * config. The portrait background treatment means the background already IS
 * the couple, so every enrolled hero skips the floating photo and the editor
 * collapses the couple-photo controls to a hint. Single predicate so the
 * renderers and the editor can't drift when a new template enrolls.
 *
 * Note: callers gated per-template (the editor) must ALSO check
 * `templateSupportsHeroBackgroundTreatment` — a persisted "portrait" on a
 * non-enrolled template is ignored by its hero, so its couple photo stays
 * active. Enrolled hero renderers can call this directly.
 */
export function isFloatingCouplePhotoActive(
  backgroundTreatment: string | undefined,
): boolean {
  return backgroundTreatment !== "portrait";
}

/**
 * MIME types that can carry an alpha channel. The Cutout frame is only
 * meaningful for these — a JPEG "cutout" renders as a hard-edged rectangle
 * floating on the hero. The editor uses this to gate the Cutout option and
 * the couple-photo swatches while Cutout is selected.
 */
const ALPHA_CAPABLE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/webp",
  "image/avif",
]);

export function canRenderCutout(mimeType: string | null | undefined): boolean {
  return !!mimeType && ALPHA_CAPABLE_MIME_TYPES.has(mimeType);
}

/**
 * Whether the cutout couple photo is the ACTIVE hero composition: the
 * resolved frame is "cutout", a couple photo is actually selected, and the
 * portrait background treatment isn't suppressing the floating photo.
 *
 * Single source of truth for everything the cutout mode drives — rendering
 * the frameless layout AND suppressing the hero countdown/schedule cards —
 * so the renderers and the editor can't drift (the #190 review lesson).
 * Note the non-obvious falses: a persisted "cutout" with no photo selected,
 * or with Portrait active, must leave the hero cards untouched.
 */
export function isCutoutCouplePhotoActive(args: {
  /** Frame resolved via resolveCouplePhotoFrame (per-template options). */
  resolvedFrame: CouplePhotoFrameId | undefined;
  hasCouplePhoto: boolean;
  backgroundTreatment: string | undefined;
}): boolean {
  return (
    args.resolvedFrame === "cutout" &&
    args.hasCouplePhoto &&
    isFloatingCouplePhotoActive(args.backgroundTreatment)
  );
}
