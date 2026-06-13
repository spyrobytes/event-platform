/**
 * The Fine Art Romance — Template Definition
 *
 * Soft, romantic, graceful. Inspired by luxury invitation suites,
 * fine art photography, and floral editorial styling. Centered
 * compositions, decorative frames, gentle dissolves.
 */

import type { TemplateDefinition } from "../types";

export const FINE_ART: TemplateDefinition = {
  id: "fine_art",
  displayName: "The Fine Art Romance",
  description: "Soft, romantic, graceful. Invitation-inspired elegance for classic weddings.",
  bestFor: [
    "Garden weddings",
    "Classic romantic weddings",
    "Chapel ceremonies",
    "Soft-luxury celebrations",
  ],

  heroRenderer: "centered-invitation",
  navRenderer: "centered-decorator",
  // Invitation sheet — a centered stationery card over the blurred page.
  // The template is invitation-inspired; its menu IS an invitation card.
  mobileNavExpression: "sheet",
  galleryRenderer: "framed-fine-art",
  scheduleRenderer: "invitation-card",
  storyRenderer: "chapter-cards",
  rsvpRenderer: "centered-formal",
  footerRenderer: "centered-ornate",
  dividerRenderer: "floral-frame",

  motionPreset: {
    revealType: "dissolve",
    duration: 700,
    easing: "ease",
    staggerDelay: 80,
    parallax: false,
  },

  chromeKit: {
    scrollProgress: false,
    botanicals: false,
    footerDecoration: false,
  },

  themePacks: [
    // Blush Garden — blush, ivory, dusty rose, sage
    {
      id: "blush-garden",
      label: "Blush Garden",
      palette: {
        ivory: "#fdf8f6",
        cream: "#f6ede8",
        linen: "#ece2da",
        sand: "#d8cbc2",
        stone: "#a89890",
        earth: "#7a6e68",
        charcoal: "#3a3230",
        night: "#1c1918",
        sage: "#8a9a7e",
        sageLight: "#aebca4",
        sageDark: "#6a7a60",
        accent: "#c49a8a",
        accent2: "#8a9a7e",
        bg: "#fdf8f6",
        surface: "#ffffff",
        text: "#3a3230",
        text2: "#7a6e68",
        text3: "#a89890",
        border: "#ece2da",
      },
      glass: {
        frostedBg: "rgba(253, 248, 246, 0.6)",
        frostedBgScrolled: "rgba(253, 248, 246, 0.95)",
        mobileNavBg: "rgba(253, 248, 246, 0.97)",
        heroOverlayColor: "#fdf8f6",
        accentTint: "rgba(196, 154, 138, 0.08)",
        accentHoverBg: "rgba(196, 154, 138, 0.05)",
      },
      fontPair: "cormorant_sourceserif",
      spacingScale: "balanced",
      maxWidth: "1080px",
      radiusScale: "soft",
      shadowIntensity: "subtle",
      buttonStyle: "outline",
      motif: "floral",
    },
    // Lavender Pearl — lavender grey, cream, soft mauve
    {
      id: "lavender-pearl",
      label: "Lavender Pearl",
      palette: {
        ivory: "#f8f6fa",
        cream: "#f0eaf2",
        linen: "#e4dce8",
        sand: "#cec4d2",
        stone: "#9e94a2",
        earth: "#726a78",
        charcoal: "#36323a",
        night: "#1c1a1e",
        sage: "#9890a0",
        sageLight: "#b4aebe",
        sageDark: "#7a7482",
        accent: "#9e88a8",
        accent2: "#b0a0b8",
        bg: "#f8f6fa",
        surface: "#ffffff",
        text: "#36323a",
        text2: "#726a78",
        text3: "#9e94a2",
        border: "#e4dce8",
      },
      glass: {
        frostedBg: "rgba(248, 246, 250, 0.6)",
        frostedBgScrolled: "rgba(248, 246, 250, 0.95)",
        mobileNavBg: "rgba(248, 246, 250, 0.97)",
        heroOverlayColor: "#f8f6fa",
        accentTint: "rgba(158, 136, 168, 0.08)",
        accentHoverBg: "rgba(158, 136, 168, 0.05)",
      },
      fontPair: "cormorant_sourceserif",
      spacingScale: "balanced",
      maxWidth: "1080px",
      radiusScale: "soft",
      shadowIntensity: "subtle",
      buttonStyle: "outline",
      motif: "floral",
    },
    // Sage Linen — sage, warm ivory, muted gold
    {
      id: "sage-linen",
      label: "Sage Linen",
      palette: {
        ivory: "#f8f7f2",
        cream: "#f0ede4",
        linen: "#e4e0d6",
        sand: "#ccc8bc",
        stone: "#9c968c",
        earth: "#706a62",
        charcoal: "#34322c",
        night: "#1a1916",
        sage: "#7c8a70",
        sageLight: "#a2ae96",
        sageDark: "#5c6a52",
        accent: "#7c8a70",
        accent2: "#b0a078",
        bg: "#f8f7f2",
        surface: "#ffffff",
        text: "#34322c",
        text2: "#706a62",
        text3: "#9c968c",
        border: "#e4e0d6",
      },
      glass: {
        frostedBg: "rgba(248, 247, 242, 0.6)",
        frostedBgScrolled: "rgba(248, 247, 242, 0.95)",
        mobileNavBg: "rgba(248, 247, 242, 0.97)",
        heroOverlayColor: "#f8f7f2",
        accentTint: "rgba(124, 138, 112, 0.08)",
        accentHoverBg: "rgba(124, 138, 112, 0.05)",
      },
      fontPair: "cormorant_sourceserif",
      spacingScale: "balanced",
      maxWidth: "1080px",
      radiusScale: "soft",
      shadowIntensity: "subtle",
      buttonStyle: "outline",
      motif: "floral",
    },
  ],

  accentSwatches: [
    { hex: "#c49a8a", label: "Blush" },
    { hex: "#9e88a8", label: "Lavender" },
    { hex: "#7c8a70", label: "Sage" },
    { hex: "#b0a078", label: "Muted Gold" },
    { hex: "#a89088", label: "Dusty Rose" },
  ],

  defaultSectionOrder: [
    "story",
    "weddingParty",
    "details",
    "travelStay",
    "registry",
    "gallery",
    "rsvp",
  ],

  supportsPrelude: true,
};
