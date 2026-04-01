/**
 * The Editorial — Template Definition
 *
 * Modern, fashion-forward, refined. Built for couples who want
 * their wedding page to feel like a curated magazine spread.
 */

import type { TemplateDefinition } from "../types";

export const EDITORIAL: TemplateDefinition = {
  id: "editorial",
  displayName: "The Editorial",
  description: "Magazine-like, modern, polished. A curated editorial spread for your wedding.",
  bestFor: [
    "City weddings",
    "Luxury contemporary weddings",
    "Style-conscious couples",
    "Photo-rich events",
  ],

  // Renderer selections
  heroRenderer: "asymmetric",
  navRenderer: "transparent-sticky",
  galleryRenderer: "magazine-grid",
  scheduleRenderer: "vertical-itinerary",
  storyRenderer: "editorial-blocks",
  rsvpRenderer: "side-by-side",
  footerRenderer: "minimal-rule",
  dividerRenderer: "thin-rule",

  // Motion: restrained, slow fade-ups
  motionPreset: {
    revealType: "fade-up",
    duration: 600,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    staggerDelay: 100,
    parallax: false,
  },

  // Chrome: minimal — no botanicals, no footer decoration
  chromeKit: {
    scrollProgress: true,
    botanicals: false,
    footerDecoration: false,
  },

  // Theme packs
  themePacks: [
    // Ivory Noir — ivory, black, graphite, muted taupe
    {
      id: "ivory-noir",
      label: "Ivory Noir",
      palette: {
        ivory: "#faf8f5",
        cream: "#f2efe9",
        linen: "#e6e2db",
        sand: "#cfc9be",
        stone: "#9c958c",
        earth: "#6b645c",
        charcoal: "#2a2622",
        night: "#141210",
        sage: "#6b645c",
        sageLight: "#9c958c",
        sageDark: "#4a443e",
        accent: "#2a2622",
        accent2: "#9c958c",
        bg: "#faf8f5",
        surface: "#ffffff",
        text: "#2a2622",
        text2: "#6b645c",
        text3: "#9c958c",
        border: "#e6e2db",
      },
      glass: {
        frostedBg: "rgba(250, 248, 245, 0.55)",
        frostedBgScrolled: "rgba(250, 248, 245, 0.95)",
        mobileNavBg: "rgba(250, 248, 245, 0.97)",
        heroOverlayColor: "#faf8f5",
        accentTint: "rgba(42, 38, 34, 0.06)",
        accentHoverBg: "rgba(42, 38, 34, 0.04)",
      },
      fontPair: "playfair_dmsans",
      spacingScale: "generous",
      maxWidth: "1140px",
      radiusScale: "sharp",
      shadowIntensity: "none",
      buttonStyle: "outline",
      motif: "editorial-lines",
    },
    // Champagne Slate — champagne, slate grey, soft stone
    {
      id: "champagne-slate",
      label: "Champagne Slate",
      palette: {
        ivory: "#f9f6f1",
        cream: "#f0ece4",
        linen: "#e3ded5",
        sand: "#c9c3b8",
        stone: "#8f8981",
        earth: "#6a655e",
        charcoal: "#3a3632",
        night: "#1c1a17",
        sage: "#8f8981",
        sageLight: "#aba6a0",
        sageDark: "#6a655e",
        accent: "#9e8e6e",
        accent2: "#8f8981",
        bg: "#f9f6f1",
        surface: "#ffffff",
        text: "#3a3632",
        text2: "#6a655e",
        text3: "#8f8981",
        border: "#e3ded5",
      },
      glass: {
        frostedBg: "rgba(249, 246, 241, 0.55)",
        frostedBgScrolled: "rgba(249, 246, 241, 0.95)",
        mobileNavBg: "rgba(249, 246, 241, 0.97)",
        heroOverlayColor: "#f9f6f1",
        accentTint: "rgba(158, 142, 110, 0.08)",
        accentHoverBg: "rgba(158, 142, 110, 0.05)",
      },
      fontPair: "playfair_dmsans",
      spacingScale: "generous",
      maxWidth: "1140px",
      radiusScale: "sharp",
      shadowIntensity: "none",
      buttonStyle: "outline",
      motif: "editorial-lines",
    },
    // Pearl Olive — pearl, olive accent, warm cream
    {
      id: "pearl-olive",
      label: "Pearl Olive",
      palette: {
        ivory: "#f8f7f2",
        cream: "#f0eee6",
        linen: "#e4e1d7",
        sand: "#ccc8bc",
        stone: "#96928a",
        earth: "#6e6a62",
        charcoal: "#32302b",
        night: "#1a1916",
        sage: "#7a8264",
        sageLight: "#a2a88e",
        sageDark: "#5c634a",
        accent: "#7a8264",
        accent2: "#96928a",
        bg: "#f8f7f2",
        surface: "#ffffff",
        text: "#32302b",
        text2: "#6e6a62",
        text3: "#96928a",
        border: "#e4e1d7",
      },
      glass: {
        frostedBg: "rgba(248, 247, 242, 0.55)",
        frostedBgScrolled: "rgba(248, 247, 242, 0.95)",
        mobileNavBg: "rgba(248, 247, 242, 0.97)",
        heroOverlayColor: "#f8f7f2",
        accentTint: "rgba(122, 130, 100, 0.08)",
        accentHoverBg: "rgba(122, 130, 100, 0.05)",
      },
      fontPair: "playfair_dmsans",
      spacingScale: "generous",
      maxWidth: "1140px",
      radiusScale: "sharp",
      shadowIntensity: "subtle",
      buttonStyle: "outline",
      motif: "editorial-lines",
    },
  ],

  accentSwatches: [
    { hex: "#2a2622", label: "Noir" },
    { hex: "#6b645c", label: "Graphite" },
    { hex: "#9e8e6e", label: "Champagne" },
    { hex: "#7a8264", label: "Olive" },
    { hex: "#8c7a6a", label: "Taupe" },
  ],

  defaultSectionOrder: [
    "story",
    "gallery",
    "details",
    "schedule",
    "travelStay",
    "registry",
    "rsvp",
  ],

  scrollProgressGradient: "linear-gradient(90deg, #2a2622, #6b645c, #9c958c)",
};
