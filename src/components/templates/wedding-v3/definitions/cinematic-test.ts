/**
 * Cinematic Test Definition
 *
 * A test TemplateDefinition that uses all existing V2 cinematic renderers.
 * Used to validate the factory + registry architecture during Phase 0.
 * This should render identically to the existing wedding_v2 template.
 */

import type { TemplateDefinition } from "../types";
import { V2 } from "../../wedding-v2/tokens";

export const CINEMATIC_TEST: TemplateDefinition = {
  id: "editorial", // using editorial as placeholder for test
  displayName: "Cinematic (Test)",
  description: "Test definition — should render identically to wedding_v2",
  bestFor: ["Testing the V3 factory architecture"],

  // All cinematic renderers (existing V2 sections)
  heroRenderer: "cinematic",
  navRenderer: "cinematic-topbar",
  galleryRenderer: "masonry",
  scheduleRenderer: "cinematic",
  storyRenderer: "timeline",
  rsvpRenderer: "cinematic",
  footerRenderer: "cinematic",
  dividerRenderer: "mountain",

  // Motion: matches V2 defaults
  motionPreset: {
    revealType: "fade-up",
    duration: 300,
    easing: "cubic-bezier(.4,0,.2,1)",
    staggerDelay: 75,
    parallax: false,
  },

  // Chrome: all on (matches V2 garden_romance defaults)
  chromeKit: {
    scrollProgress: true,
    botanicals: true,
    footerDecoration: true,
  },

  // Theme: V2 garden_romance palette as a ThemePack
  themePacks: [
    {
      id: "garden-romance",
      label: "Garden Romance",
      palette: {}, // empty = V2 defaults (sage/ivory/gold)
      glass: {
        frostedBg: "rgba(248, 245, 240, 0.55)",
        frostedBgScrolled: "rgba(248, 245, 240, 0.92)",
        mobileNavBg: "rgba(248, 245, 240, 0.97)",
        heroOverlayColor: V2.ivory,
        accentTint: "rgba(122, 140, 114, 0.08)",
        accentHoverBg: "rgba(122, 140, 114, 0.06)",
      },
      fontPair: "serif_sans",
      spacingScale: "balanced",
      maxWidth: "1140px",
      radiusScale: "soft",
      shadowIntensity: "subtle",
      buttonStyle: "solid",
      motif: "none",
    },
  ],

  accentSwatches: [
    { hex: "#7a8c72", label: "Sage" },
    { hex: "#5c6b55", label: "Forest Sage" },
    { hex: "#6b7f62", label: "Moss" },
  ],

  defaultSectionOrder: [
    "details",
    "story",
    "gallery",
    "weddingParty",
    "schedule",
    "travelStay",
    "registry",
    "faq",
    "rsvp",
  ],
};
