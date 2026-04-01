/**
 * The Intimate Note — Template Definition
 *
 * Small wedding, quiet luxury, deeply personal. Built for couples
 * who want simplicity with emotional clarity. The anti-overdesigned
 * template — its distinctness comes from restraint.
 */

import type { TemplateDefinition } from "../types";

export const INTIMATE_NOTE: TemplateDefinition = {
  id: "intimate_note",
  displayName: "The Intimate Note",
  description: "Minimal, personal, quiet. Simplicity with emotional clarity for intimate celebrations.",
  bestFor: [
    "Private weddings",
    "Micro-weddings",
    "Civil ceremonies",
    "Simple elegant celebrations",
  ],

  // Renderer selections
  heroRenderer: "typographic",
  navRenderer: "light-minimal",
  galleryRenderer: "compact-strip",
  scheduleRenderer: "concise-essentials",
  storyRenderer: "letter-narrative",
  rsvpRenderer: "streamlined",
  footerRenderer: "minimal-rule",
  dividerRenderer: "none",

  // Motion: barely there — soft fade only, no transforms
  motionPreset: {
    revealType: "soft-fade",
    duration: 800,
    easing: "ease",
    staggerDelay: 60,
    parallax: false,
  },

  // Chrome: everything off
  chromeKit: {
    scrollProgress: false,
    botanicals: false,
    footerDecoration: false,
  },

  // Theme packs
  themePacks: [
    // Warm Linen — linen, soft taupe, charcoal
    {
      id: "warm-linen",
      label: "Warm Linen",
      palette: {
        ivory: "#faf8f4",
        cream: "#f2efe8",
        linen: "#e8e4db",
        sand: "#d0cbc0",
        stone: "#a09a90",
        earth: "#74706a",
        charcoal: "#3c3834",
        night: "#1e1c1a",
        sage: "#a09a90",
        sageLight: "#b8b4ac",
        sageDark: "#74706a",
        accent: "#74706a",
        accent2: "#a09a90",
        bg: "#faf8f4",
        surface: "#ffffff",
        text: "#3c3834",
        text2: "#74706a",
        text3: "#a09a90",
        border: "#e8e4db",
      },
      glass: {
        frostedBg: "rgba(250, 248, 244, 0.55)",
        frostedBgScrolled: "rgba(250, 248, 244, 0.95)",
        mobileNavBg: "rgba(250, 248, 244, 0.97)",
        heroOverlayColor: "#faf8f4",
        accentTint: "rgba(116, 112, 106, 0.06)",
        accentHoverBg: "rgba(116, 112, 106, 0.04)",
      },
      fontPair: "cormorant_sourceserif",
      spacingScale: "generous",
      maxWidth: "800px",
      radiusScale: "sharp",
      shadowIntensity: "none",
      buttonStyle: "ghost",
      motif: "none",
    },
    // Stone Rose — pale rose, cream, muted brown
    {
      id: "stone-rose",
      label: "Stone Rose",
      palette: {
        ivory: "#faf6f4",
        cream: "#f2ece8",
        linen: "#e8e0da",
        sand: "#d2c8c0",
        stone: "#a09490",
        earth: "#786c68",
        charcoal: "#3a3230",
        night: "#1e1a18",
        sage: "#b09090",
        sageLight: "#c8b4b0",
        sageDark: "#8a7270",
        accent: "#a08080",
        accent2: "#b09090",
        bg: "#faf6f4",
        surface: "#ffffff",
        text: "#3a3230",
        text2: "#786c68",
        text3: "#a09490",
        border: "#e8e0da",
      },
      glass: {
        frostedBg: "rgba(250, 246, 244, 0.55)",
        frostedBgScrolled: "rgba(250, 246, 244, 0.95)",
        mobileNavBg: "rgba(250, 246, 244, 0.97)",
        heroOverlayColor: "#faf6f4",
        accentTint: "rgba(160, 128, 128, 0.07)",
        accentHoverBg: "rgba(160, 128, 128, 0.04)",
      },
      fontPair: "cormorant_sourceserif",
      spacingScale: "generous",
      maxWidth: "800px",
      radiusScale: "sharp",
      shadowIntensity: "none",
      buttonStyle: "ghost",
      motif: "none",
    },
    // Mist Blue — mist blue, white, soft slate
    {
      id: "mist-blue",
      label: "Mist Blue",
      palette: {
        ivory: "#f6f8fa",
        cream: "#edf0f4",
        linen: "#e0e4ea",
        sand: "#c4c8d0",
        stone: "#90949c",
        earth: "#686c74",
        charcoal: "#30343a",
        night: "#1a1c20",
        sage: "#8090a0",
        sageLight: "#a0b0c0",
        sageDark: "#607080",
        accent: "#7888a0",
        accent2: "#90949c",
        bg: "#f6f8fa",
        surface: "#ffffff",
        text: "#30343a",
        text2: "#686c74",
        text3: "#90949c",
        border: "#e0e4ea",
      },
      glass: {
        frostedBg: "rgba(246, 248, 250, 0.55)",
        frostedBgScrolled: "rgba(246, 248, 250, 0.95)",
        mobileNavBg: "rgba(246, 248, 250, 0.97)",
        heroOverlayColor: "#f6f8fa",
        accentTint: "rgba(120, 136, 160, 0.07)",
        accentHoverBg: "rgba(120, 136, 160, 0.04)",
      },
      fontPair: "cormorant_sourceserif",
      spacingScale: "generous",
      maxWidth: "800px",
      radiusScale: "sharp",
      shadowIntensity: "none",
      buttonStyle: "ghost",
      motif: "none",
    },
  ],

  accentSwatches: [
    { hex: "#74706a", label: "Warm Taupe" },
    { hex: "#a08080", label: "Stone Rose" },
    { hex: "#7888a0", label: "Mist Blue" },
    { hex: "#8a8a80", label: "Sage Grey" },
    { hex: "#6a6a6a", label: "Slate" },
  ],

  defaultSectionOrder: [
    "story",
    "details",
    "gallery",
    "registry",
    "faq",
    "rsvp",
  ],
};
