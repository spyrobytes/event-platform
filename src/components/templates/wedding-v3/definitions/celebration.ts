/**
 * The Celebration House — Template Definition
 *
 * Joyful, social, warm, tradition-aware. Designed for larger
 * family-centered weddings and multi-moment celebrations.
 * More layered, more event-centric, more communal.
 */

import type { TemplateDefinition } from "../types";
import {
  HEART_FRAME_OPTION,
  CIRCLE_FRAME_OPTION,
  FULL_LENGTH_FRAME_OPTION,
  CUTOUT_FRAME_OPTION,
} from "../../shared/CouplePhotoFrame/frame-options";

export const CELEBRATION: TemplateDefinition = {
  id: "celebration",
  displayName: "The Celebration House",
  description: "Festive, communal, vibrant. For large family weddings and multi-event celebrations.",
  bestFor: [
    "Large weddings",
    "Multicultural weddings",
    "High-energy family celebrations",
    "Multi-event schedules",
  ],

  // The collage-mosaic hero renders a SINGLE full-bleed cover image (the
  // "mosaic" is the content-styling language, not a multi-image background),
  // so it honors the horizontal focal anchor — a one-sided motif survives the
  // mobile crop. (No portrait treatment: its centered composition skips that.)
  supportsHeroFocalX: true,

  heroRenderer: "collage-mosaic",
  navRenderer: "utility-forward",
  galleryRenderer: "scrapbook-collage",
  scheduleRenderer: "multi-event-tabbed",
  storyRenderer: "milestone-mosaic",
  rsvpRenderer: "stepper",
  footerRenderer: "festive-layered",
  dividerRenderer: "rhythmic-pattern",
  weddingPartyRenderer: "scrapbook-flip",

  // Organizer-selectable couple-photo frame (first is the default — circle is
  // the shape Celebration has always rendered, so unset configs keep their
  // current look; pinned by a test).
  couplePhotoFrameOptions: [
    CIRCLE_FRAME_OPTION,
    HEART_FRAME_OPTION,
    FULL_LENGTH_FRAME_OPTION,
    // Transparent-background photo standing bottom-CENTER in the scene —
    // Celebration's symmetric composition makes the couple the focal point
    // (V2 + Grand Luxe anchor bottom-right). Activates the frameless layout
    // and hides the float cards — see isCutoutCouplePhotoActive.
    CUTOUT_FRAME_OPTION,
  ],

  supportsSocialLinks: true,

  motionPreset: {
    revealType: "bounce",
    duration: 500,
    easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    staggerDelay: 70,
    parallax: false,
  },

  chromeKit: {
    scrollProgress: true,
    botanicals: false,
    footerDecoration: false,
  },

  themePacks: [
    // Marigold Jewel — marigold, ruby, cream, deep green
    {
      id: "marigold-jewel",
      label: "Marigold Jewel",
      palette: {
        ivory: "#fdf8f0",
        cream: "#f5ede0",
        linen: "#e8ddd0",
        sand: "#d0c2b0",
        stone: "#9c9084",
        earth: "#706458",
        charcoal: "#362e28",
        night: "#1a1614",
        sage: "#c48820",
        sageLight: "#daa840",
        sageDark: "#a06810",
        accent: "#c48820",
        accent2: "#b03030",
        bg: "#fdf8f0",
        surface: "#ffffff",
        text: "#362e28",
        text2: "#706458",
        text3: "#9c9084",
        border: "#e8ddd0",
      },
      glass: {
        frostedBg: "rgba(253, 248, 240, 0.55)",
        frostedBgScrolled: "rgba(253, 248, 240, 0.95)",
        mobileNavBg: "rgba(253, 248, 240, 0.97)",
        heroOverlayColor: "#fdf8f0",
        accentTint: "rgba(196, 136, 32, 0.08)",
        accentHoverBg: "rgba(196, 136, 32, 0.05)",
      },
      fontPair: "dmsans_sourceserif",
      spacingScale: "balanced",
      maxWidth: "1140px",
      radiusScale: "soft",
      shadowIntensity: "subtle",
      buttonStyle: "solid",
      motif: "mosaic",
    },
    // Royal Bloom — deep rose, navy, gold-toned neutrals
    {
      id: "royal-bloom",
      label: "Royal Bloom",
      palette: {
        ivory: "#f8f4f6",
        cream: "#f0e8ec",
        linen: "#e4dae0",
        sand: "#cec0c6",
        stone: "#9a8e94",
        earth: "#6e626a",
        charcoal: "#342e32",
        night: "#1a161a",
        sage: "#a04060",
        sageLight: "#c06080",
        sageDark: "#802040",
        accent: "#a04060",
        accent2: "#c0a040",
        bg: "#f8f4f6",
        surface: "#ffffff",
        text: "#342e32",
        text2: "#6e626a",
        text3: "#9a8e94",
        border: "#e4dae0",
      },
      glass: {
        frostedBg: "rgba(248, 244, 246, 0.55)",
        frostedBgScrolled: "rgba(248, 244, 246, 0.95)",
        mobileNavBg: "rgba(248, 244, 246, 0.97)",
        heroOverlayColor: "#f8f4f6",
        accentTint: "rgba(160, 64, 96, 0.08)",
        accentHoverBg: "rgba(160, 64, 96, 0.05)",
      },
      fontPair: "dmsans_sourceserif",
      spacingScale: "balanced",
      maxWidth: "1140px",
      radiusScale: "soft",
      shadowIntensity: "subtle",
      buttonStyle: "solid",
      motif: "mosaic",
    },
    // Sunset Festival — coral, peach, plum, sand
    {
      id: "sunset-festival",
      label: "Sunset Festival",
      palette: {
        ivory: "#fdf6f2",
        cream: "#f6ece4",
        linen: "#eadfd4",
        sand: "#d4c6b8",
        stone: "#a09488",
        earth: "#746860",
        charcoal: "#38302c",
        night: "#1c1816",
        sage: "#d07050",
        sageLight: "#e09070",
        sageDark: "#b05030",
        accent: "#d07050",
        accent2: "#a06080",
        bg: "#fdf6f2",
        surface: "#ffffff",
        text: "#38302c",
        text2: "#746860",
        text3: "#a09488",
        border: "#eadfd4",
      },
      glass: {
        frostedBg: "rgba(253, 246, 242, 0.55)",
        frostedBgScrolled: "rgba(253, 246, 242, 0.95)",
        mobileNavBg: "rgba(253, 246, 242, 0.97)",
        heroOverlayColor: "#fdf6f2",
        accentTint: "rgba(208, 112, 80, 0.08)",
        accentHoverBg: "rgba(208, 112, 80, 0.05)",
      },
      fontPair: "dmsans_sourceserif",
      spacingScale: "balanced",
      maxWidth: "1140px",
      radiusScale: "soft",
      shadowIntensity: "subtle",
      buttonStyle: "solid",
      motif: "mosaic",
    },
  ],

  accentSwatches: [
    { hex: "#c48820", label: "Marigold" },
    { hex: "#a04060", label: "Ruby Rose" },
    { hex: "#d07050", label: "Coral" },
    { hex: "#406840", label: "Deep Green" },
    { hex: "#a06080", label: "Plum" },
  ],

  defaultSectionOrder: [
    "story",
    "weddingParty",
    "details",
    "schedule",
    "travelStay",
    "gallery",
    "registry",
    "rsvp",
  ],

  scrollProgressGradient: "linear-gradient(90deg, #c48820, #d07050, #a04060)",

  supportsPrelude: true,
};
