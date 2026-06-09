/**
 * Curated couple-photo frame shapes for the V2 Cinematic hero.
 *
 * V2 has no TemplateDefinition layer (that's a V3 concept), so its curated
 * list lives here as the single source of truth — consumed by the Cinematic
 * hero at render time and by the page editor's frame picker (via
 * `getCouplePhotoFrameOptions`). First option is the default: circle is the
 * shape V2 has always rendered, so unset configs keep their current look
 * (pinned by a test).
 */

import {
  CIRCLE_FRAME_OPTION,
  HEART_FRAME_OPTION,
  FULL_LENGTH_FRAME_OPTION,
  type CouplePhotoFrameOption,
} from "../shared/CouplePhotoFrame/frame-options";

export const WEDDING_V2_COUPLE_PHOTO_FRAME_OPTIONS: CouplePhotoFrameOption[] = [
  CIRCLE_FRAME_OPTION,
  HEART_FRAME_OPTION,
  FULL_LENGTH_FRAME_OPTION,
];
